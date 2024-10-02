import express from "express";
import userRoute from "./routes/userRoutes.js";
import chatRoute from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./utils/features.js";
import { errorMiddlewares } from "./middlewares/error.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { ChatJoind, ChatLeaved, newMessage, NewMessageAlert, OnlineUsers, StartTyping, StopTyping } from "./Constants/Evants.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { socketAuthenticator } from "./middlewares/auth.js";
// import { createUsers } from './seeders/user.js';
// import {createMessages} from './seeders/chat.js';

dotenv.config({
  path: "./.env",
});

// const mongoURL = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.SECRETKEY || "jfkdslnedns";
const userSocketIDs = new Map();
const onlineUser = new Set()
const clienturl = process.env.CLIENT_URL.split(",")

connectDB();
cloudinary.config({
  cloud_name: process.env.CLOUDNARY_CLOUD_NAME,
  api_key: process.env.CLOUDNARY_API_KEY,
  api_secret: process.env.CLOUDNARY_API_SECRET,
});
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: clienturl,
    credentials: true,
  },
});
app.set("io" , io)

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: clienturl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Hello World");
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err , socket , next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user
  userSocketIDs.set(user._id.toString(), socket.id);


  socket.on(newMessage, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };
    const usersSocket = getSockets(members);
    io.to(usersSocket).emit(newMessage, {
      chatId,
      message: messageForRealTime,
    });
    io.to(usersSocket).emit(NewMessageAlert, {
      chatId,
    });

    await Message.create(messageForDB);
  });
  socket.on(StartTyping , ({members , chatId})=>{
    
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(StartTyping , {chatId})
  })
  socket.on(StopTyping , ({members , chatId})=>{
     
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(StopTyping , {chatId})
  })

  socket.on(ChatJoind , ({userId , members})=>{
    onlineUser.add(userId.toString())

    const membersSockets = getSockets(members)

    io.to(membersSockets).emit(OnlineUsers , Array.from(onlineUser))
  })
  socket.on(ChatLeaved , ({userId , members})=>{
    onlineUser.delete(userId.toString())

    
    const membersSockets = getSockets(members)

    io.to(membersSockets).emit(OnlineUsers , Array.from(onlineUser))
  })
  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUser.delete(user._id.toString());
    socket.broadcast.emit(onlineUser , Array.from(onlineUser))
  });
});

app.use(errorMiddlewares);
// Start server
server.listen(PORT, () => {
  console.log(`Server is Running On Port ${PORT} in ${envMode} Mode`);
});

export { adminSecretKey, envMode, userSocketIDs };
