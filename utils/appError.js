// REDO => lecture

// declares a new class AppError that inherits from the Error class.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // parent constructor

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // for production VVIP

    // to where the error actually occurred.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

/*
to distinguish between operational errors (errors that are expected and handled,
like invalid input) and programming errors (bugs in the code that should be fixed).
*/
