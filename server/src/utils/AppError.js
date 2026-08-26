// Thrown for known error conditions (bad input, not found, unauthorized, etc.)
// so the central handler can distinguish these from unexpected bugs.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;