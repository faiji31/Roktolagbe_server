import fs from "fs/promises";
import cloudinary from "../../config/cloudinary.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided.");
  }

  // If Cloudinary credentials are configured, upload to Cloudinary
  if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "roktolagbe",
      resource_type: "image",
    });

    await fs.unlink(req.file.path).catch(() => {});

    return res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  }

  // Fallback for local development without Cloudinary keys
  res.json({
    success: true,
    data: {
      url: `/uploads/${req.file.filename}`,
      publicId: req.file.filename,
    },
  });
});