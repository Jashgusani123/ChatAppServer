import { ErrorHandler } from "./error.js";
import jwt from "jsonwebtoken";
import  {adminSecretKey} from '../app.js';
import { User } from "../models/userModels.js";

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies["ChatApp"];
    if (!token) {
      return next(new ErrorHandler("Please login to access this route", 401));
    }
    const regetPass = jwt.verify(token, process.env.JWT_SECRET);

    req.id = regetPass._id;
    next();
  } catch (err) {
    console.log(err);

    next(err);
  }
};
const adminOnlyAuthentication = async (req, res, next) => {
  try {
    const token = req.cookies["ChatApp_admin_token"];
    if (!token) {
      return next(new ErrorHandler("Only Admin can access this routes", 401));
    }
    const secretKey = jwt.verify(token, process.env.JWT_SECRET);
    const isMatch = secretKey === adminSecretKey;

    if(!isMatch) return next(new ErrorHandler("Only Admin can access this routes" , 401))

    next();
  } catch (err) {
    console.log(err);

    next(err);
  }
};

const socketAuthenticator = async(err , socket , next)=>{
  try {
    if(err)return next(err);
    const authToken = socket.request.cookies["ChatApp"];
    if(!authToken){
      return next(new ErrorHandler("Please Login to access this Route" , 401))
    }

    const decodedData = jwt.verify(authToken , process.env.JWT_SECRET)

    const user = await User.findById(decodedData._id)
    if(!user)return next(new ErrorHandler("Please Login to access this Route" , 401))

    socket.user = user

    return next()

  } catch (err) {
    return next(new ErrorHandler("Please Login to access this route",401))
  }
}
export { isAuthenticated , adminOnlyAuthentication , socketAuthenticator};
