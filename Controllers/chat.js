import { ErrorHandler } from "../middlewares/error.js";
import { User } from "../models/userModels.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";

import { deleteFileFromCloudnary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import {
  Alert,
  newMessage,
  NewMessageAlert,
  Refetch_Chats,
} from "../Constants/Evants.js";
import { getOtherMembers } from "../lib/helper.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    const allMembers = [...members, req.id];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.id,
      members: allMembers,
    });
    emitEvent(req, Alert, allMembers, `WellCome To ${name} GroupChat `);
    emitEvent(req, Refetch_Chats, members);

    return res.status(201).json({
      success: true,
      message: "Group Created",
    });
  } catch (err) {
    next(err);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.id }).populate(
      "members",
      "name avatar"
    );

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
      const otherMember = getOtherMembers(members, req.id);
      return {
        _id,
        name: groupChat ? name : otherMember.name,
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.id.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    });

    return res.status(200).json({
      success: true,
      transformedChats,
    });
  } catch (err) {
    next(err);
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      members: req.id,
      groupChat: true,
      creator: req.id,
    }).populate("members", "name avatar");

    const groups = chats.map(({ _id, name, members, groupChat }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map((member) => member.avatar.url),
    }));

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (err) {
    next(err);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return next(new ErrorHandler("Chat Not Found", 404));
    }
    if (!chat.groupChat) {
      return next(new ErrorHandler("It is Not a GroupChat", 404));
    }
    if (chat.creator.toString() !== req.id.toString()) {
      return next(new ErrorHandler("You are not allowed to add members"));
    }

    const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMember = allNewMembers
      .filter((i) => !chat.members.includes(i._id.toString()))
      .map((i) => i._id);

    chat.members.push(...uniqueMember);

    if (chat.members.length > 100) {
      return next(new ErrorHandler("Group members limit Reached", 400));
    }

    await chat.save();

    const allUsersName = allNewMembers.map((i) => i.name).join(",");

    emitEvent(
      req,
      Alert,
      chat.members,
      `${allUsersName} has been added to ${chat.name} group`
    );
    emitEvent(req, Refetch_Chats, chat.members);

    return res.status(200).json({
      success: true,
      message: "Members Added Successfully",
    });
  } catch (err) {
    next(err);
  }
};

const removeMembers = async (req, res, next) => {
  try {
    const { userId, chatId } = req.body;

    const [chat, userThatWillBeRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);

    if (!chat) {
      return next(new ErrorHandler("Chat Not Found", 404));
    }
    if (!chat.groupChat) {
      return next(new ErrorHandler("It is Not a GroupChat", 404));
    }
    if (chat.creator.toString() !== req.id.toString()) {
      return next(new ErrorHandler("You are not allowed to add members"));
    }

    if (chat.members.length <= 3) {
      return next(new ErrorHandler("Group must have at least 3 members", 400));
    }

    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(
      req,
      Alert,
      chat.members,
      `${userThatWillBeRemoved.name} has been Removed from the Group`
    );
    emitEvent(req, Refetch_Chats, chat.members);

    return res.status(200).json({
      success: true,
      message: "Member Removed Successfully",
    });
  } catch (err) {
    next(err);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("chat not found ", 404));

    if (!chat.groupChat) {
      return next(new ErrorHandler("This is not a GroupChat", 400));
    }

    const remainingMember = chat.members.filter(
      (member) => member.toString() !== req.id.toString()
    );

    if (remainingMember.length < 3) {
      return next(new ErrorHandler("Group must have at least 3 members", 400));
    }

    if (chat.creator.toString() === req.id.toString()) {
      const newCreator = remainingMember[0];
      chat.creator = newCreator;
    }

    chat.members = remainingMember;
    const [user] = await Promise.all(
      [User.findById(req.id, "name")],
      chat.save()
    );

    emitEvent(req, Alert, chat.members, `User ${user.name} has left the group`);
    emitEvent(req, Refetch_Chats, chat.members);

    return res.status(200).json({
      success: true,
      message: "Member Removed Successfully",
    });
  } catch (err) {
    next(err);
  }
};

const sendAttchments = async (req, res, next) => {
  try {
    const { chatId } = req.body;
    
    const files = req.files || [];

    const chat = await Chat.findById(chatId);

    if(files.length < 1 )return next(new ErrorHandler("Please Upload Attachments" , 400))

      if(files.length > 5 )return next(new ErrorHandler("Files Can't be more than 5",400))

    const me = await User.findById(req.id);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    if (files.length < 1) {
      return next(new ErrorHandler("Please Provied Attchments", 400));
    }

    //Upload file here

    const attachments = await uploadFilesToCloudinary(files);

    const messageForDB = {
      content: "",
      attachments,
      sender: me._id,
      chat: chatId,
    };
    const message = await Message.create(messageForDB);

    const messageForRealTime = {
      ...messageForDB,
      sender: { _id: me._id, name: me.name },
    };


    emitEvent(req, newMessage, chat.members, {
      message: messageForRealTime,
      chatId,
    });

    emitEvent(req, NewMessageAlert, chat.members, { chatId });

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (err) {
    next(err);
  }
};

const getChatDetalils = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      console.log("populate");

      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();

      if (!chat) {
        return next(new ErrorHandler("Chat is not found", 404));
      }

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);
      if (!chat) return next(new ErrorHandler("Chat not found", 404));

      return res.status(200).json({
        success: true,
        chat,
      });
    }
  } catch (err) {
    next(err);
  }
};

const renameGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return next(new ErrorHandler("Chat Not Found", 404));
    }

    if (!chat.groupChat) {
      return next(new ErrorHandler("This is not a group Chat", 400));
    }

    if (chat.creator.toString() !== req.id.toString()) {
      return next(
        new ErrorHandler("You are not allowed to Rename the Group", 403)
      );
    }

    chat.name = name;
    await chat.save();

    emitEvent(req, Refetch_Chats, chat.members);

    return res.status(200).json({
      success: true,
      message: "Group Renamed Successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return next(new ErrorHandler("Chat Not Found", 404));
    }

    const members = chat.members;

    if (chat.groupChat && chat.creator.toString() !== req.id.toString()) {
      return next(
        new ErrorHandler("You are not allowe to delete the Group", 403)
      );
    }

    if (!chat.groupChat && !chat.members.includes(req.id.toString())) {
      return next(
        new ErrorHandler("You are not allowed to delete the chat", 403)
      );
    }

    const messgesWithAttachments = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = [];

    messgesWithAttachments.forEach(({ attachments }) =>
      attachments.forEach(({ public_id }) => public_ids.push(public_id))
    );

    await Promise.all([
      deleteFileFromCloudnary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, Refetch_Chats, members);
    return res.status(200).json({
      success: true,
      message: "Chat Delete Successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  const chatId = req.params.id;
  let { page = 1 } = req.query;
  page = Math.max(page, 1); // Ensure the page is at least 1

  const limit = 10;

  try {
    const [messages, totalMessagesCount] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sender", "name")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessagesCount / limit);

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      totalPages,
    });
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
};

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMember,
  removeMembers,
  leaveGroup,
  sendAttchments,
  getChatDetalils,
  renameGroup,
  deleteChat,
  getMessages,
};
