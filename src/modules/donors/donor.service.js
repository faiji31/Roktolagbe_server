import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { maskPhone } from "../../utils/maskPhone.js";
import { getCompatibleDonorGroups } from "../../utils/bloodCompatibility.js";
import {
  calculateEligibleOn,
  isEligibleToDonate,
  getRemainingDaysUntilEligible,
} from "../../utils/eligibility.js";
import { DEFAULT_ELIGIBILITY_GAP_DAYS } from "../../utils/constants.js";
import { ApiError } from "../../utils/ApiError.js";

async function getGapDays() {
  const settings = await collections
    .settings()
    .findOne({ key: "platform_rules" });
  return settings?.eligibilityGapDays || DEFAULT_ELIGIBILITY_GAP_DAYS;
}

export async function searchDonors(query = {}) {
  const { page, limit, skip } = getPagination(query, 12, 48);
  const gapDays = await getGapDays();

  const filter = {
    isAvailable: query.includeUnavailable === "true" ? { $in: [true, false] } : true,
  };

  if (query.bloodGroup) {
    if (query.compatible === "true") {
      const compatibleGroups = getCompatibleDonorGroups(query.bloodGroup);
      filter.bloodGroup = {
        $in: compatibleGroups.length ? compatibleGroups : [query.bloodGroup],
      };
    } else {
      filter.bloodGroup = query.bloodGroup;
    }
  }

  if (query.division) {
    filter["location.division"] = query.division;
  }
  if (query.district) {
    filter["location.district"] = query.district;
  }
  if (query.upazila) {
    filter["location.upazila"] = query.upazila;
  }

  // Filter out donors still within their recovery window unless explicitly requested
  if (query.onlyEligible !== "false") {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gapDays);
    filter.$or = [
      { lastDonatedAt: null },
      { lastDonatedAt: { $exists: false } },
      { lastDonatedAt: { $lte: cutoffDate } },
    ];
  }

  const [profiles, total] = await Promise.all([
    collections
      .donorProfiles()
      .find(filter)
      .sort({ totalDonations: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.donorProfiles().countDocuments(filter),
  ]);

  const sanitizedItems = profiles.map((profile) => ({
    _id: profile._id,
    userId: profile.userId,
    name: profile.name || "Verified Donor",
    bloodGroup: profile.bloodGroup,
    location: profile.location,
    maskedPhone: maskPhone(profile.phone),
    isAvailable: Boolean(profile.isAvailable),
    lastDonatedAt: profile.lastDonatedAt || null,
    eligibleOn: calculateEligibleOn(profile.lastDonatedAt, gapDays),
    isEligible: isEligibleToDonate(profile.lastDonatedAt, gapDays),
    remainingDays: getRemainingDaysUntilEligible(profile.lastDonatedAt, gapDays),
    totalDonations: profile.totalDonations || 0,
    verifiedBadge: (profile.totalDonations || 0) >= 1,
  }));

  return formatPaginatedResponse(sanitizedItems, total, page, limit);
}

export async function getPublicDonorById(id) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid donor profile ID.");
  }

  const gapDays = await getGapDays();
  const profile = await collections
    .donorProfiles()
    .findOne({ _id: new ObjectId(id) });

  if (!profile) {
    throw new ApiError(404, "Donor profile not found.");
  }

  return {
    _id: profile._id,
    userId: profile.userId,
    name: profile.name || "Verified Donor",
    bloodGroup: profile.bloodGroup,
    location: profile.location,
    maskedPhone: maskPhone(profile.phone),
    bio: profile.bio || "",
    isAvailable: Boolean(profile.isAvailable),
    lastDonatedAt: profile.lastDonatedAt || null,
    eligibleOn: calculateEligibleOn(profile.lastDonatedAt, gapDays),
    isEligible: isEligibleToDonate(profile.lastDonatedAt, gapDays),
    remainingDays: getRemainingDaysUntilEligible(profile.lastDonatedAt, gapDays),
    totalDonations: profile.totalDonations || 0,
  };
}