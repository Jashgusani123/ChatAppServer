import express from 'express';
import { adminLogin, adminLogout, allChats, allMessages, allUsers, getAdminData, getDeshBordState } from '../Controllers/admin.js';
import { adminLoginValidator, validate } from '../lib/validators.js';
import { adminOnlyAuthentication } from '../middlewares/auth.js';

const app = express.Router();


app.post("/verify" , adminLoginValidator() , validate , adminLogin)

app.get("/logout" , adminLogout)

app.use(adminOnlyAuthentication)

app.get("/" ,getAdminData)

app.get("/users" , allUsers)
app.get("/chats",allChats)
app.get("/messages",allMessages)

app.get("/stats" , getDeshBordState)

export default app