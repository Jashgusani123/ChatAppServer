import { ErrorHandler } from "../middlewares/error.js";
import { User } from "../models/userModels.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { cookieOptions, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import {compare} from 'bcryptjs';
import { NewRequest, Refetch_Chats } from "../Constants/Evants.js";
import {getOtherMembers} from '../lib/helper.js';

// Create a New User and save into DataBase
const newUser = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;
    const file = req.file;

    if(!file)return next(new ErrorHandler("Please Upload Avatar" ,400))

    const result = await uploadFilesToCloudinary([file]);

    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };
    const user = await User.create({
      name: name,
      bio: bio,
      username: username,
      password: password,
      avatar: avatar, // If you're including avatar
    });

    sendToken(res, user, 201, "User Created Successfully");
  } catch (err) {
    next(err)
  }
};

const login = async (req, res, next) => {
  try{const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Username or Password", 404));
  }

  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid Username or Password", 404));
  }
  sendToken(res, user, 200, `WellCome Back ${user.name}`);}catch(err){
    next(err)
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.id);

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    next(new ErrorHandler("User Not Found !!"));
  }
};

const logout = async (req, res ,next) => {
  try{return res
    .status(200)
    .cookie("ChatApp", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out Successfully",
    });}catch(err){
      next(err)
    }
};

const searchUser = async (req, res) => {
  try{const { name = "" } = req.query;

  const myChats = await Chat.find({ groupChat: false, members: req.id });

  const allUserFromMyChats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUserFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const user = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    user,
  });}catch(err){
    next(err)
  }
};

const sendFriendRequest = async (req, res , next) => {

 try {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.id, receiver: userId },
      { sender: userId, receiver: req.id },
    ],
  });
  console.log(request);
  
  if (request) return next(new ErrorHandler("Request Already sent.", 401));

  await Request.create({
    sender: req.id,
    receiver: userId,
  });
  emitEvent(req, NewRequest, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
 } catch (err) {
  console.log(err);
  next(err)
 }
};

const acceptFriendRequest = async (req, res, next) => {
 try{ const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request Not Found", 404));

  if (request.receiver._id.toString() !== req.id.toString())
    return next(
      new ErrorHandler("Your not authorized to accept this request", 401)
    );
  
    if(!accept){
      await request.deleteOne()
      return res.status(200).json({
        success: true,
        message: "Friend Request Rejected",
      });
    }

    const members = [request.sender._id,  request.receiver._id]

    await Promise.all([
      Chat.create({
        members,
        name:`${request.sender.name} - ${request.receiver.name}`
      }),
      request.deleteOne()
    ])

    emitEvent(req , Refetch_Chats , members)

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId:request.sender._id,
  });}catch(err){
    next(err)
  }
};

const getMyNotifications = async (req, res , next) => {
  try {
    const requests = await Request.find({ receiver: req.id }).populate("sender", "name avatar");

    const allRequests = requests.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatarUrl: sender.avatar.url, // Assuming `url` is a property in `avatar`
      },
    }));

    return res.status(200).json({
      success: true,
      allRequests,
    });
  } catch (err) {
    next(err)
  }
};

const getMyFriends = async(req , res , next)=>{
 try{ const chatId = req.query.chatId;

  const chats = await Chat.find({
    members:req.id,
    groupChat:false,
  }).populate("members" , "name avatar");

  const Friends = chats.map(({members})=>{
    const otherUsers = getOtherMembers(members , req.id)
    console.log(otherUsers);
    
    return {
      _id:otherUsers._id,
      name:otherUsers.name,
      avatar:otherUsers.avatar.url
    }
  })
  console.log("OtherMembers" , Friends);
  

  if(chatId){
    const chat = await Chat.findById(chatId) ;
    const availableFriends = Friends.filter((friend)=>!chat.members.includes(friend._id))

    return res.status(200).json({
      success:true,
      friend:availableFriends
    })

  }else{
    return res.status(200).json({
      success:true,
      Friends
    })
  }}catch(err){
    next(err)
  }

}

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
};
