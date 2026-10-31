import { ApiError } from "../utils/ApiError.js";

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }
    const userRole = req.user.role || "user";
    if (!allowedRoles.includes(userRole)) {
      return next(
        new ApiError(403, `Access denied. Required role: ${allowedRoles.join(" or ")}`)
      );
    }
    next();
  };
}