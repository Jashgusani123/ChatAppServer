import { ErrorHandler } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/userModels.js";
import jwt from 'jsonwebtoken';
import {cookieOptions} from '../utils/features.js';

const adminLogin = async(req , res , next)=>{
const {secretKey} = req.body;
const adminSecretKey = process.env.SECRETKEY;

const isMatch = secretKey === adminSecretKey;

if(!isMatch) return next(new ErrorHandler("Invalid AdminKey",401))

  const token = jwt.sign(secretKey , process.env.JWT_SECRET)

  return res.status(200).cookie("ChatApp_admin_token" , token , {...cookieOptions , maxAge:1000*60*15}).json({
    success:true ,
    message:"Authentication SuccessFully , WellCome Boss"
  })
} 

const adminLogout = async(req , res , next)=>{
  
    return res.status(200).cookie("ChatApp_admin_token"  ,"", {...cookieOptions , maxAge:0}).json({
      success:true ,
      message:"Logout SuccessFully"
    })
} 
  
const allUsers = async (req, res, next) => {
  try {
    const users = await User.find({});

    const transformUsers = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);

        return {
          _id,
          name,
          username,
          avatar: avatar.url,
          groups,
          friends,
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: transformUsers,
    });
  } catch (err) {
    next(err);
  }
};
const allChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformChats = await Promise.all(
      chats.map(async ({ members, _id, groupChat, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chatId: _id });
        return {
          _id,
          groupChat,
          name,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          memebrs: members.map((member) => ({
            _id: member._id,
            name: member.name,
            avatar: member.avatar.url,
          })),
          creator: {
            name: creator?.name || "None",
            avatar: creator?.avatar.url || "",
          },
          totalMembers: members.length,
          totalMessages,
        };
      })
    );

    return res.status(200).json({
      success: true,
      chats: transformChats,
    });
  } catch (err) {
    next(err);
  }
};
const allMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");

    const transformMessage = messages.map(
      ({ _id, content, attachments, sender, createdAt, chat }) => ({
        _id,
        attachments,
        content,
        createdAt,
        chat: chat._id,
        groupChat: chat.groupChat,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
      })
    );

    return res.status(200).json({
      success: true,
      transformMessage,
    });
  } catch (err) {
    next(err);
  }
};
const getDeshBordState = async (req, res, next) => {
    const [groupCount ,  userCount , messagesCount ,totalChatCount] = await Promise.all([
        Chat.countDocuments({groupChat:true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
    ])

    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate()-7);

    const last7DaysMessages =  await Message.find({
        createdAt:{
            $gte:last7Days,
            $lte:today
        }
    }).select("createdAt")

    const messages =  new Array(7).fill(0);
    const dayInMilliseconds = 1000*60*60*24;

    console.log(last7DaysMessages);
    

    last7DaysMessages.forEach(message => {
        const diffInMilliseconds = today.getTime() - message.createdAt.getTime();
        const index = Math.floor(diffInMilliseconds / dayInMilliseconds);
        if (index >= 0 && index < 7) { // Ensure the index is within the last 7 days
            messages[6 - index]++;
        }
    });


    const stats = {
        groupCount,
        userCount,
        messagesCount,
        totalChatCount,
        messageChart:messages,
    }
    
    return res.status(200).json({
        success:true,
        stats
    })
};
const getAdminData = async(req , res , next)=>{
  return res.status(200).json({
    admin:true
  })
}
export { allUsers, allChats, allMessages, getDeshBordState , adminLogin ,adminLogout, getAdminData };
