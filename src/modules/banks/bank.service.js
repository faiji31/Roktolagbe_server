import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { createNotification } from "../notifications/notification.service.js";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function normalizeId(id) {
  if (id instanceof ObjectId) return id;

  if (typeof id === "string") {
    if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
    const match = id.match(/[a-f0-9]{24}/i);
    if (match) return new ObjectId(match[0]);
  }

  throw new ApiError(400, "Invalid ID.");
}

function getUserId(user) {
  return String(user?.id || user?._id || "");
}

function buildUserFilter(user) {
  const uid = getUserId(user);
  const orConditions = [];

  if (user?._id) orConditions.push({ _id: user._id });
  if (ObjectId.isValid(uid) && uid.length === 24) {
    orConditions.push({ _id: new ObjectId(uid) });
  }
  if (uid) {
    orConditions.push({ _id: uid });
    orConditions.push({ id: uid });
  }
  if (user?.email) {
    orConditions.push({ email: user.email });
  }

  return { $or: orConditions };
}

function sanitizeInventoryObject(raw = {}) {
  const inv = {};
  for (const group of BLOOD_GROUPS) {
    const val = Number(raw?.[group] ?? 0);
    inv[group] = Number.isInteger(val) && val >= 0 && val <= 10000 ? val : 0;
  }
  return inv;
}

function clean(value) {
  return String(value ?? "").trim();
}

function validateBankPayload(payload = {}) {
  const loc = payload.location || {};
  const rawPhone = clean(payload.phone).replace(/[\s-]/g, "");
  const normalizedPhone = rawPhone.startsWith("+88")
    ? rawPhone.slice(3)
    : rawPhone.startsWith("88") && rawPhone.length === 13
    ? rawPhone.slice(2)
    : rawPhone;

  const data = {
    name: clean(payload.name),
    phone: normalizedPhone,
    email: clean(payload.email),
    division: clean(payload.division || loc.division),
    district: clean(payload.district || loc.district),
    upazila: clean(payload.upazila || loc.upazila),
    address: clean(payload.address || loc.address),
    licenseNo:
      clean(payload.licenseNo) ||
      `DGHS-BB-${Date.now().toString().slice(-5)}`,
    openingHours: clean(payload.openingHours || payload.hours || "24/7 Open"),
    inventory: sanitizeInventoryObject(payload.inventory),
  };

  if (data.name.length < 3 || data.name.length > 100) {
    throw new ApiError(400, "Bank name must be 3 to 100 characters.");
  }
  if (!/^01[3-9]\d{8}$/.test(data.phone)) {
    throw new ApiError(400, "Enter a valid mobile number (01XXXXXXXXX).");
  }
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    throw new ApiError(400, "Invalid email address.");
  }
  if (data.division.length < 2) throw new ApiError(400, "Division is required.");
  if (data.district.length < 2) throw new ApiError(400, "District is required.");
  if (data.upazila.length < 2) throw new ApiError(400, "Upazila / area is required.");
  if (data.address.length < 3 || data.address.length > 250) {
    throw new ApiError(400, "Address must be 3 to 250 characters.");
  }

  return data;
}

// ============================================
// Find bank owned/staffed by the logged-in Bank Staff user
// ============================================

export async function findMyBankOrNull(user) {
  if (!user) return null;
  const uid = getUserId(user);

  if (user.bankId) {
    try {
      const bankId = normalizeId(user.bankId);
      const byId = await collections.banks().findOne({ _id: bankId });
      if (byId) return byId;
    } catch {
      // Fall through to owner/staff lookup
    }
  }

  const bank = await collections.banks().findOne({
    $or: [{ ownerUserId: uid }, { staffUserIds: uid }],
  });

  if (bank && String(user.bankId) !== String(bank._id)) {
    await collections
      .users()
      .updateOne(buildUserFilter(user), {
        $set: { bankId: String(bank._id), updatedAt: new Date() },
      })
      .catch(() => {});
  }

  return bank || null;
}

// ============================================
// Strict Bank Staff Access
// ============================================

export async function getBankForStaff(user) {
  const uid = getUserId(user);
  if (!user || !uid) {
    throw new ApiError(401, "Authentication required.");
  }

  if (user.role !== ROLES.BANK) {
    throw new ApiError(
      403,
      "Only Blood Bank Staff can manage blood bank inventory."
    );
  }

  const bank = await findMyBankOrNull(user);

  if (!bank) {
    throw new ApiError(
      404,
      "You have not created your blood bank yet. Please complete the setup form first."
    );
  }

  return bank;
}

// ============================================
// Create a Blood Bank (Bank Staff Only, starts unverified)
// ============================================

export async function createBankForUser(user, payload = {}) {
  if (user.role !== ROLES.BANK) {
    throw new ApiError(403, "Only Blood Bank Staff can create a blood bank.");
  }

  const uid = getUserId(user);
  const data = validateBankPayload(payload);

  const existing = await findMyBankOrNull(user);
  if (existing) {
    throw new ApiError(409, "You have already created a blood bank.");
  }

  if (data.licenseNo) {
    const dup = await collections
      .banks()
      .findOne({ licenseNo: data.licenseNo });
    if (dup) {
      throw new ApiError(
        409,
        "A blood bank with this license number already exists."
      );
    }
  }

  const now = new Date();

  const doc = {
    name: data.name,
    phone: data.phone,
    email: data.email || user.email || "",
    address: data.address,
    licenseNo: data.licenseNo,
    openingHours: data.openingHours,
    hours: data.openingHours,
    location: {
      division: data.division,
      district: data.district,
      upazila: data.upazila,
      address: data.address,
    },
    inventory: data.inventory,
    ownerUserId: uid,
    ownerName: user.name || "Bank Staff",
    staffUserIds: [uid],
    isVerified: false, // Must be approved by Admin or Moderator
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId } = await collections.banks().insertOne(doc);

  await collections
    .users()
    .updateOne(buildUserFilter(user), {
      $set: { bankId: String(insertedId), updatedAt: now },
    })
    .catch(() => {});

  return { ...doc, _id: insertedId };
}

// ============================================
// Update Blood Inventory (Bank Staff Only)
// ============================================

export async function updateBankInventory(user, inventoryPayload = {}) {
  const bank = await getBankForStaff(user);

  const updates = {};

  for (const group of BLOOD_GROUPS) {
    if (inventoryPayload[group] === undefined) continue;

    const value = Number(inventoryPayload[group]);

    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new ApiError(400, `Invalid inventory value for ${group}.`);
    }

    updates[`inventory.${group}`] = value;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid inventory values provided.");
  }

  updates.updatedAt = new Date();

  const updatedBank = await collections.banks().findOneAndUpdate(
    { _id: bank._id },
    { $set: updates },
    { returnDocument: "after" }
  );

  return updatedBank;
}

// ============================================
// Public & Admin Blood Bank Directory
// ============================================

export async function listPublicBanks(query = {}) {
  const filter =
    query.includeUnverified === "true" ? {} : { isVerified: true };

  if (query.search) {
    const search = String(query.search).trim();
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { "location.district": { $regex: search, $options: "i" } },
      { "location.division": { $regex: search, $options: "i" } },
    ];
  }

  if (query.division) filter["location.division"] = String(query.division);
  if (query.district) filter["location.district"] = String(query.district);
  if (query.upazila) filter["location.upazila"] = String(query.upazila);
  if (query.bloodGroup && BLOOD_GROUPS.includes(query.bloodGroup)) {
    filter[`inventory.${query.bloodGroup}`] = { $gt: 0 };
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [banks, total] = await Promise.all([
    collections
      .banks()
      .find(filter)
      .sort({ isVerified: 1, createdAt: -1 }) // Shows pending banks first in admin view
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.banks().countDocuments(filter),
  ]);

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };

  return {
    items: banks,
    banks,
    meta: pagination,
    pagination,
  };
}

// ============================================
// Get Single Public Bank
// ============================================

export async function getBankById(id) {
  const bankId = normalizeId(id);

  const bank = await collections.banks().findOne(
    { _id: bankId },
    { projection: { staffUserIds: 0, ownerUserId: 0 } }
  );

  if (!bank) throw new ApiError(404, "Blood bank not found.");
  return bank;
}

// ============================================
// Record Walk-in Donation (Bank Staff Only)
// ============================================

export async function recordBankDonation(user, payload = {}) {
  const bank = await getBankForStaff(user);

  const bloodGroup = String(payload.bloodGroup || "").toUpperCase();
  const units = Number(payload.units ?? payload.bags ?? 1);

  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    throw new ApiError(400, "Invalid blood group.");
  }

  if (!Number.isInteger(units) || units < 1 || units > 10) {
    throw new ApiError(400, "Units must be between 1 and 10.");
  }

  let matchedDonorProfile = null;
  if (payload.donorEmail || payload.donorPhone) {
    const userDoc = payload.donorEmail
      ? await collections.users().findOne({ email: clean(payload.donorEmail) })
      : null;

    if (userDoc) {
      matchedDonorProfile = await collections
        .donorProfiles()
        .findOne({ userId: String(userDoc._id) });
    } else if (payload.donorPhone) {
      matchedDonorProfile = await collections
        .donorProfiles()
        .findOne({ phone: clean(payload.donorPhone) });
    }
  }

  const now = new Date();
  const donatedAt = payload.donatedAt ? new Date(payload.donatedAt) : now;

  const donation = {
    bankId: String(bank._id),
    bankName: bank.name,
    hospitalName: bank.name,
    location: bank.location,
    donorId: matchedDonorProfile ? String(matchedDonorProfile.userId) : null,
    donorName:
      clean(payload.donorName) ||
      matchedDonorProfile?.name ||
      "Walk-in Voluntary Donor",
    donorPhone: clean(payload.donorPhone) || matchedDonorProfile?.phone || "",
    bloodGroup,
    bags: units,
    units,
    donatedAt,
    notes: clean(payload.notes),
    createdBy: getUserId(user),
    verifiedByBank: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collections.donations().insertOne(donation);

  await collections.banks().updateOne(
    { _id: bank._id },
    {
      $inc: { [`inventory.${bloodGroup}`]: units },
      $set: { updatedAt: now },
    }
  );

  if (matchedDonorProfile) {
    await collections.donorProfiles().updateOne(
      { _id: matchedDonorProfile._id },
      {
        $set: {
          updatedAt: now,
          lastDonatedAt: donatedAt,
          lastDonationAt: donatedAt,
        },
        $inc: { totalDonations: 1 },
      }
    );

    await createNotification({
      userId: matchedDonorProfile.userId,
      title: `Donation recorded at ${bank.name}`,
      message: `Thank you for donating ${units} bag(s) of ${bloodGroup} blood. Your digital certificate is now available.`,
      type: "fulfilled",
      link: "/dashboard/donations",
    });
  }

  return { ...donation, _id: result.insertedId };
}

// ============================================
// List Bank Donations
// ============================================

export async function listBankDonations(user, query = {}) {
  const bank = await getBankForStaff(user);

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { bankId: String(bank._id) };

  const [donations, total] = await Promise.all([
    collections
      .donations()
      .find(filter)
      .sort({ donatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.donations().countDocuments(filter),
  ]);

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };

  return {
    items: donations,
    donations,
    meta: pagination,
    pagination,
  };
}