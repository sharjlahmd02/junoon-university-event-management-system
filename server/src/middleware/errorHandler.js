// Central error handler — every error in the app ends up here via next(err)
// or asyncHandler. Must stay last in app.use() order (4-arg signature is
// what tells Express this is an error handler, not regular middleware).
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Something went wrong";

  // Full detail always goes to the server log, regardless of environment.
  console.error(err);

  const response = { error: message };
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;