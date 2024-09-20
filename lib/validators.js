import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../middlewares/error.js";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", "); 
  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMessages, 400));
};

const registerValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
  body("bio", "Please Enter Bio").notEmpty(),
  
];
const loginValidator = () => [
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
];

const newGroupChatValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100"),
];

const addMemberValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1-97"),
];

const removeMemberValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
  body("userId", "Please Enter User Id").notEmpty(),
];
const sendAttachmentValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
];

const chatIdValidator = () => [param("id", "Please Enter Chat Id").notEmpty()];
const renameValidator = () => [
  param("id", "Please Enter Chat Id").notEmpty(),
  body("name", "Please Enter Name").notEmpty(),
];

const sendRequestValidator = () => [
  body("userId", "Please Enter User Id  ").notEmpty(),
];
const acceptRequestValidator = () => [
  body("requestId", "Please Enter Request Id  ").notEmpty(),
  body("accept").notEmpty().withMessage("Please Add Accept").isBoolean().withMessage("Accept Mut be a Boolean"),

];

const adminLoginValidator = () => [
  body("secretKey", "Please Enter SecretKey").notEmpty(),

];
export {
  acceptRequestValidator, addMemberValidator, adminLoginValidator, chatIdValidator, loginValidator,
  newGroupChatValidator, registerValidator, removeMemberValidator, renameValidator, sendAttachmentValidator, sendRequestValidator, validate
};

