import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import { getBase64 } from "../lib/helper.js";
import { getSockets } from "../lib/helper.js";
import dotenv from 'dotenv';
dotenv.config();
export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URL; // Use environment variable for URL
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
    process.exit(1); // Exit the process with failure
  }
};

// Cookie options for sending JWT token
const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  sameSite: "None",
  httpOnly: true,
  secure: true, // Use secure cookies in production
};

// Function to send JWT token
const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  
  return res.status(code).cookie("ChatApp", token, cookieOptions).json({
    success: true,
    message,
    user,
  });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event, data);
};

const deleteFileFromCloudnary = async (public_ids) => {};

const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file), // Ensure getBase64 works properly
        {
          resource_type: "auto",
          public_id: uuid(), // Assuming uuid() is working fine
        },
        (error, result) => {
          if (error) return reject(error); // Reject the promise on error
          resolve(result); // Resolve the promise with the result
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    const formattedResult = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formattedResult;
  } catch (err) {
    console.error("Error Uploading files to Cloudinary:", err); // Log full error
    throw new Error("Error uploading files to Cloudinary"); // Throw a simpler error message
  }
};


export {
  sendToken,
  cookieOptions,
  emitEvent,
  deleteFileFromCloudnary,
  uploadFilesToCloudinary,
};
