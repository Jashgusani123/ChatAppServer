import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
} from "../Controllers/user.js";
import { single } from "../middlewares/multer.js";
import { errorMiddlewares } from "../middlewares/error.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validate,
} from "../lib/validators.js";

const app = express.Router();

app.post("/new", single, registerValidator(), validate, newUser);
app.post("/login", loginValidator(), validate, login, errorMiddlewares);

// After here must be logged in to access the routes
app.get("/me", isAuthenticated, getMyProfile);
app.get("/logout", isAuthenticated, logout);
app.get("/search", isAuthenticated, searchUser);
app.put(
  "/sendfriendrequest",
  isAuthenticated,
  sendRequestValidator(),
  validate,
  sendFriendRequest
);
app.put(
  "/acceptrequest",
  isAuthenticated,
  acceptRequestValidator(),
  validate,
  acceptFriendRequest
);
app.get("/notification", isAuthenticated, getMyNotifications);
app.get("/friends", isAuthenticated, getMyFriends);

export default app;
