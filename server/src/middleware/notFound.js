import AppError from "../utils/AppError.js";

// Runs when no route matched — turns it into a normal 404 error.
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export default notFound;