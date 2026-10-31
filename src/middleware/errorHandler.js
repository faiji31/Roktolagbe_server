import { env } from "../config/env.js";

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || null,
    ...(env.nodeEnv === "development" && { stack: err.stack }),
  });
};