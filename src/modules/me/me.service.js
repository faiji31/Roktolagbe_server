import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import {
  DEFAULT_ELIGIBILITY_GAP_DAYS,
  REQUEST_STATUS,
} from "../../utils/constants.js";
import {
  calculateEligibleOn,
  isEligibleToDonate,
  getRemainingDaysUntilEligible,
} from "../../utils/eligibility.js";
import { getCompatibleRecipientGroups } from "../../utils/bloodCompatibility.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { maskPhone } from "../../utils/maskPhone.js";

async function getGapDays() {
  const settings = await collections
    .settings()
    .findOne({ key: "platform_rules" });
  return settings?.eligibilityGapDays || DEFAULT_ELIGIBILITY_GAP_DAYS;
}

export async function getMyProfile(user) {
  const gapDays = await getGapDays();
  const userId = String(user.id);

  const [donorProfile, myRequestsCount, totalDonationsCount] =
    await Promise.all([
      collections.donorProfiles().findOne({ userId }),
      collections.requests().countDocuments({ requesterId: userId }),
      collections.donations().countDocuments({ donorId: userId }),
    ]);

  let matchingRequestsCount = 0;
  if (donorProfile?.bloodGroup && donorProfile?.location?.district) {
    const recipientGroups = getCompatibleRecipientGroups(
      donorProfile.bloodGroup
    );
    matchingRequestsCount = await collections.requests().countDocuments({
      requesterId: { $ne: userId },
      status: { $in: [REQUEST_STATUS.OPEN, REQUEST_STATUS.IN_PROGRESS] },
      bloodGroup: { $in: recipientGroups },
      "location.district": donorProfile.location.district,
    });
  }

  const lastDonatedAt = donorProfile?.lastDonatedAt || null;

  return {
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      phone: donorProfile?.phone || user.phone || "",
      bloodGroup: donorProfile?.bloodGroup || user.bloodGroup || "",
    },
    donorProfile: donorProfile || null,
    eligibility: {
      gapDays,
      lastDonatedAt,
      eligibleOn: calculateEligibleOn(lastDonatedAt, gapDays),
      isEligible: isEligibleToDonate(lastDonatedAt, gapDays),
      remainingDays: getRemainingDaysUntilEligible(lastDonatedAt, gapDays),
    },
    stats: {
      totalDonations: donorProfile?.totalDonations || totalDonationsCount,
      myRequestsCount,
      matchingRequestsCount,
    },
  };
}

export async function upsertMyDonorProfile(user, payload) {
  const userId = String(user.id);
  const now = new Date();

  const updateFields = {
    userId,
    name: payload.name?.trim() || user.name || "Donor",
    bloodGroup: payload.bloodGroup,
    phone: payload.phone?.trim(),
    gender: payload.gender || "",
    dateOfBirth: payload.dateOfBirth || null,
    weightKg: payload.weightKg ? Number(payload.weightKg) : null,
    location: {
      division: payload.location?.division || "",
      district: payload.location?.district || "",
      upazila: payload.location?.upazila || "",
      address: payload.location?.address || "",
    },
    lastDonatedAt: payload.lastDonatedAt
      ? new Date(payload.lastDonatedAt)
      : null,
    isAvailable:
      typeof payload.isAvailable === "boolean" ? payload.isAvailable : true,
    bio: payload.bio?.trim() || "",
    updatedAt: now,
  };

  const result = await collections.donorProfiles().findOneAndUpdate(
    { userId },
    {
      $set: updateFields,
      $setOnInsert: {
        totalDonations: 0,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  // Sync name, phone, and bloodGroup to the Better Auth user document
  const userFilter = ObjectId.isValid(userId)
    ? { $or: [{ _id: new ObjectId(userId) }, { id: userId }] }
    : { id: userId };

  await collections.users().updateOne(userFilter, {
    $set: {
      name: updateFields.name,
      phone: updateFields.phone,
      bloodGroup: updateFields.bloodGroup,
      updatedAt: now,
    },
  });

  return result;
}

export async function toggleMyAvailability(user, isAvailable) {
  const userId = String(user.id);
  const result = await collections.donorProfiles().findOneAndUpdate(
    { userId },
    {
      $set: {
        isAvailable: Boolean(isAvailable),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function getMyDonations(user, query = {}) {
  const { page, limit, skip } = getPagination(query, 10, 50);
  const filter = { donorId: String(user.id) };

  const [items, total] = await Promise.all([
    collections
      .donations()
      .find(filter)
      .sort({ donatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.donations().countDocuments(filter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
}

export async function getMyMatchingRequests(user, query = {}) {
  const { page, limit, skip } = getPagination(query, 12, 48);
  const userId = String(user.id);

  const donorProfile = await collections.donorProfiles().findOne({ userId });

  if (!donorProfile || !donorProfile.bloodGroup) {
    return formatPaginatedResponse([], 0, page, limit);
  }

  const compatibleRecipientGroups = getCompatibleRecipientGroups(
    donorProfile.bloodGroup
  );

  const filter = {
    requesterId: { $ne: userId },
    status: { $in: [REQUEST_STATUS.OPEN, REQUEST_STATUS.IN_PROGRESS] },
    bloodGroup: { $in: compatibleRecipientGroups },
  };

  if (query.sameDistrictOnly !== "false" && donorProfile.location?.district) {
    filter["location.district"] = donorProfile.location.district;
  }

  const [items, total] = await Promise.all([
    collections
      .requests()
      .find(filter)
      .sort({ urgency: -1, neededBy: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.requests().countDocuments(filter),
  ]);

  const sanitized = items.map((reqDoc) => ({
    ...reqDoc,
    contactPhone: maskPhone(reqDoc.contactPhone),
  }));

  return formatPaginatedResponse(sanitized, total, page, limit);
}