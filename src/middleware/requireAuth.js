import { ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { collections } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const cookieHeader = req.headers.cookie || "";
  const authHeader = req.headers.authorization || "";

  if (!cookieHeader && !authHeader) {
    throw new ApiError(401, "Authentication required.");
  }

  let sessionUser = null;
  let session = null;

  try {
    const response = await fetch(env.authSessionUrl, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        authorization: authHeader,
      },
    });

    if (response.ok) {
      const data = await response.json();
      sessionUser = data?.user || null;
      session = data?.session || null;
    }
  } catch (error) {
    console.error("Better Auth session check error:", error.message);
  }

  if (!sessionUser) {
    throw new ApiError(401, "Invalid or expired session.");
  }

  const conditions = [];

  if (sessionUser.id) {
    if (ObjectId.isValid(sessionUser.id) && String(sessionUser.id).length === 24) {
      conditions.push({ _id: new ObjectId(sessionUser.id) });
    }
    conditions.push({ _id: sessionUser.id });
    conditions.push({ id: sessionUser.id });
  }

  if (sessionUser.email) {
    conditions.push({ email: sessionUser.email });
  }

  if (!conditions.length) {
    throw new ApiError(401, "Invalid session user.");
  }

  const dbUser = await collections.users().findOne({
    $or: conditions,
  });

  if (!dbUser) {
    throw new ApiError(401, "User account not found.");
  }

  const mergedUser = {
    ...sessionUser,
    ...dbUser,
    _id: dbUser._id,
    id: String(dbUser._id || dbUser.id || sessionUser.id),
    role: dbUser.role || sessionUser.role || "user",
    bankId: dbUser.bankId || null,
  };

  if (mergedUser.isBanned) {
    throw new ApiError(403, "Your account has been suspended.");
  }

  req.user = mergedUser;
  req.session = session;

  next();
});