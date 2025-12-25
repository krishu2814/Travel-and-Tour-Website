// PRODUCTION VS DEVELOPMENT  ERROR ( REDO )
const AppError = require('../utils/appError');

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message); // looping on errors[] and getting message from it
  const message = `Invalid input data. ${errors.join('. ')}`; // joining all error
  return new AppError(message, 400);
};

// Wrong JWT token...
const handleJWTError = () =>
  new AppError('Invalid token. Please login again!', 401);
// const handleJWTError = function () {
//   return new AppError('Invalid token. Please login again!', 401);
// };

// When JWT token expires due to time...
const handleJWTExpireError = () =>
  new AppError('Your token has expired! Please login again', 401);

// Handles MongoDB duplicate key errors (e.g., unique fields like email already exist).
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 404);
};

// Handles Mongoose cast errors (e.g., invalid MongoDB ObjectId)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

//Sends detailed error information to the client for debugging.
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //Operational / trusted error  :- send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or other unknown error :- don't leak error details
  else {
    // 1) LOG error
    console.error('ERROR😭', err);

    // 2) Send generic message
    // NON OPERATIONAL ERROR
    res.status(500).json({
      status: 'fail',
      message: 'Something went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  //console.log(err.stack); // gives location of error
  err.statusCode = err.statusCode || 500; // (if err.statusCode is undefined, null, 0, or false), default to 500.
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.stack = err.stack;
    if (error.name === 'CastError') error = handleCastErrorDB(error); // name of error
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error); // name of error
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpireError();

    sendErrorProd(error, res);
  }
};
// 500 (Internal Server Error)
// 'error' is typically used for "programming errors" (e.g., a bug in your code)
// 'fail' is often used for "operational errors"
