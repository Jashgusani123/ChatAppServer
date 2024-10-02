import { envMode } from "../app.js";

// ErrorHandler Class
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Error Middleware Function
const errorMiddlewares = (err, req, res, next) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate Field - ${error}`;
    err.statusCode ||= 400;
  }
  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid Formate Of ${errorPath}`;
    err.statusCode = 400;
  }
  const response = { success: false, message: err.message };

  if(envMode === "DEVELOPMENT"){
    response.error = err
  }

  return res.status(err.statusCode || 500).json(response);
};

export { errorMiddlewares, ErrorHandler };
