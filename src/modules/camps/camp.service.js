import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";

export async function listCamps(query = {}) {
  const { page, limit, skip } = getPagination(query, 12, 48);
  const filter = {};

  if (query.division) {
    filter["location.division"] = query.division;
  }
  if (query.district) {
    filter["location.district"] = query.district;
  }
  if (query.upcomingOnly !== "false") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    filter.date = { $gte: yesterday };
  }

  const [items, total] = await Promise.all([
    collections
      .camps()
      .find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.camps().countDocuments(filter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
}

export async function createCamp(user, payload) {
  if (!payload.title || !payload.date || !payload.organizer) {
    throw new ApiError(400, "Camp title, organizer, and date are required.");
  }

  const doc = {
    title: payload.title.trim(),
    organizer: payload.organizer.trim(),
    date: new Date(payload.date),
    startTime: payload.startTime || "09:00 AM",
    endTime: payload.endTime || "04:00 PM",
    venue: payload.venue?.trim() || "",
    location: {
      division: payload.location?.division || "Dhaka",
      district: payload.location?.district || "Dhaka",
      upazila: payload.location?.upazila || "",
      address: payload.location?.address || "",
    },
    contactPhone: payload.contactPhone?.trim() || user.phone || "",
    description: payload.description?.trim() || "",
    bannerUrl: payload.bannerUrl || "",
    createdBy: String(user.id),
    participants: [],
    participantCount: 0,
    createdAt: new Date(),
  };

  const result = await collections.camps().insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function registerForCamp(campId, user) {
  if (!ObjectId.isValid(campId)) {
    throw new ApiError(400, "Invalid camp ID.");
  }

  const userId = String(user.id);
  const camp = await collections.camps().findOne({ _id: new ObjectId(campId) });

  if (!camp) {
    throw new ApiError(404, "Blood donation camp not found.");
  }

  const alreadyRegistered = (camp.participants || []).some(
    (p) => String(p.userId) === userId
  );

  if (alreadyRegistered) {
    throw new ApiError(400, "You are already registered for this camp.");
  }

  const participant = {
    userId,
    name: user.name || "Volunteer Donor",
    email: user.email,
    phone: user.phone || "",
    registeredAt: new Date(),
  };

  const updated = await collections.camps().findOneAndUpdate(
    { _id: camp._id },
    {
      $push: { participants: participant },
      $inc: { participantCount: 1 },
    },
    { returnDocument: "after" }
  );

  return updated;
}