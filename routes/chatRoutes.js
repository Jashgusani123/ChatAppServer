import express from "express";
import {
  addMember,
  deleteChat,
  getChatDetalils,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMembers,
  renameGroup,
  sendAttchments,
} from "../Controllers/chat.js";
import {
  addMemberValidator,
  chatIdValidator,
  newGroupChatValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachmentValidator,
  validate,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentMulter } from "../middlewares/multer.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/new", newGroupChatValidator(), validate, newGroupChat);
app.get("/my", getMyChats);
app.get("/my/groups", getMyGroups);
app.put("/addmembers", addMemberValidator(), validate, addMember);
app.delete("/removemember", removeMemberValidator(), validate, removeMembers);
app.delete("/leave/:id", chatIdValidator(), validate, leaveGroup);
app.post(
  "/message",
  attachmentMulter,
  sendAttachmentValidator(),
  validate,
  sendAttchments
);
app.get("/messages/:id", chatIdValidator(), validate, getMessages);
app
  .route("/:id")
  .get(chatIdValidator(), validate, getChatDetalils)
  .put(renameValidator(), validate, renameGroup)
  .delete(chatIdValidator(), validate, deleteChat);

export default app;
