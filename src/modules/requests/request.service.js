import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import {
  REQUEST_STATUS,
  RESPONSE_STATUS,
  ROLES,
} from "../../utils/constants.js";
import { ApiError } from "../../utils/ApiError.js";
import { maskPhone } from "../../utils/maskPhone.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import {
  findMatchingDonorsForRequest,
  notifyMatchedDonors,
} from "./matching.service.js";
import { createNotification } from "../notifications/notification.service.js";

export async function createBloodRequest(user, payload) {
  const doc = {
    requesterId: String(user.id),
    requesterName: user.name || payload.contactName,
    patientName: payload.patientName,
    bloodGroup: payload.bloodGroup,
    bagsNeeded: Number(payload.bagsNeeded),
    bagsFulfilled: 0,
    urgency: payload.urgency,
    hospitalName: payload.hospitalName,
    location: payload.location,
    neededBy: new Date(payload.neededBy),
    contactName: payload.contactName,
    contactPhone: payload.contactPhone,
    reason: payload.reason || "",
    notes: payload.notes || "",
    status: REQUEST_STATUS.OPEN,
    responseCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collections.requests().insertOne(doc);
  const created = { ...doc, _id: result.insertedId };

  // Trigger donor matching notifications without blocking response
  notifyMatchedDonors(created).catch((err) =>
    console.error("Failed to notify matched donors:", err)
  );

  return created;
}

export async function listPublicRequests(query = {}) {
  const { page, limit, skip } = getPagination(query, 12, 48);

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = {
      $in: [REQUEST_STATUS.OPEN, REQUEST_STATUS.IN_PROGRESS],
    };
  }

  if (query.bloodGroup) {
    filter.bloodGroup = query.bloodGroup;
  }
  if (query.urgency) {
    filter.urgency = query.urgency;
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

  const [items, total] = await Promise.all([
    collections
      .requests()
      .find(filter)
      .sort({
        urgency: -1,
        neededBy: 1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.requests().countDocuments(filter),
  ]);

  const maskedItems = items.map((reqDoc) => ({
    ...reqDoc,
    contactPhone: maskPhone(reqDoc.contactPhone),
  }));

  return formatPaginatedResponse(maskedItems, total, page, limit);
}

export async function listUserOwnRequests(userId, query = {}) {
  const { page, limit, skip } = getPagination(query, 10, 50);
  const filter = { requesterId: String(userId) };

  if (query.status) {
    filter.status = query.status;
  }

  const [items, total] = await Promise.all([
    collections
      .requests()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.requests().countDocuments(filter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
}

export async function getRequestById(requestId, currentUser = null) {
  if (!ObjectId.isValid(requestId)) {
    throw new ApiError(400, "Invalid blood request ID.");
  }

  const requestDoc = await collections
    .requests()
    .findOne({ _id: new ObjectId(requestId) });

  if (!requestDoc) {
    throw new ApiError(404, "Blood request not found.");
  }

  const isOwner =
    currentUser && String(currentUser.id) === String(requestDoc.requesterId);
  const isStaff =
    currentUser &&
    [ROLES.ADMIN, ROLES.MODERATOR].includes(currentUser.role);

  const responses = await collections
    .requestResponses()
    .find({ requestId: String(requestDoc._id) })
    .sort({ createdAt: -1 })
    .toArray();

  const hasCurrentUserAccepted =
    currentUser &&
    responses.some(
      (r) =>
        String(r.donorId) === String(currentUser.id) &&
        r.status === RESPONSE_STATUS.ACCEPTED
    );

  const shouldShowRequesterPhone =
    isOwner || isStaff || hasCurrentUserAccepted;

  const formattedResponses = responses.map((resp) => ({
    _id: resp._id,
    requestId: resp.requestId,
    donorId: resp.donorId,
    donorName: resp.donorName,
    bloodGroup: resp.bloodGroup,
    status: resp.status,
    note: resp.note,
    contactRevealed: Boolean(resp.contactRevealed),
    donorPhone:
      isOwner && resp.contactRevealed
        ? resp.donorPhone
        : maskPhone(resp.donorPhone),
    createdAt: resp.createdAt,
  }));

  let matchedDonorsPreview = [];
  if (isOwner || isStaff) {
    const matches = await findMatchingDonorsForRequest(requestDoc, 12);
    matchedDonorsPreview = matches.map((m) => ({
      _id: m._id,
      userId: m.userId,
      name: m.name,
      bloodGroup: m.bloodGroup,
      location: m.location,
      maskedPhone: maskPhone(m.phone),
      totalDonations: m.totalDonations || 0,
    }));
  }

  return {
    ...requestDoc,
    contactPhone: shouldShowRequesterPhone
      ? requestDoc.contactPhone
      : maskPhone(requestDoc.contactPhone),
    responses: isOwner || isStaff ? formattedResponses : [],
    myResponse: currentUser
      ? responses.find((r) => String(r.donorId) === String(currentUser.id)) ||
        null
      : null,
    matchedDonorsPreview,
  };
}

export async function respondToRequest(requestId, user, payload) {
  if (!ObjectId.isValid(requestId)) {
    throw new ApiError(400, "Invalid blood request ID.");
  }

  const requestDoc = await collections
    .requests()
    .findOne({ _id: new ObjectId(requestId) });

  if (!requestDoc) {
    throw new ApiError(404, "Blood request not found.");
  }

  if (String(requestDoc.requesterId) === String(user.id)) {
    throw new ApiError(400, "You cannot respond to your own blood request.");
  }

  if (
    ![REQUEST_STATUS.OPEN, REQUEST_STATUS.IN_PROGRESS].includes(
      requestDoc.status
    )
  ) {
    throw new ApiError(400, "This blood request is no longer accepting responses.");
  }

  const donorProfile = await collections
    .donorProfiles()
    .findOne({ userId: String(user.id) });

  if (!donorProfile || !donorProfile.phone) {
    throw new ApiError(
      400,
      "Please complete your donor profile with a valid phone number before responding."
    );
  }

  const now = new Date();
  await collections.requestResponses().updateOne(
    { requestId: String(requestDoc._id), donorId: String(user.id) },
    {
      $set: {
        donorName: donorProfile.name || user.name || "Donor",
        donorPhone: donorProfile.phone,
        bloodGroup: donorProfile.bloodGroup || user.bloodGroup,
        status: payload.status,
        note: payload.note || "",
        updatedAt: now,
      },
      $setOnInsert: {
        requestId: String(requestDoc._id),
        donorId: String(user.id),
        contactRevealed: false,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const acceptedCount = await collections.requestResponses().countDocuments({
    requestId: String(requestDoc._id),
    status: RESPONSE_STATUS.ACCEPTED,
  });

  await collections.requests().updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        responseCount: acceptedCount,
        status:
          acceptedCount >= 1 && requestDoc.status === REQUEST_STATUS.OPEN
            ? REQUEST_STATUS.IN_PROGRESS
            : requestDoc.status,
        updatedAt: now,
      },
    }
  );

  if (payload.status === RESPONSE_STATUS.ACCEPTED) {
    await createNotification({
      userId: requestDoc.requesterId,
      title: `A donor accepted your ${requestDoc.bloodGroup} blood request!`,
      message: `${
        donorProfile.name || user.name
      } offered to donate for ${requestDoc.patientName}. Open your request to reveal their contact.`,
      type: "response",
      link: `/dashboard/requests/${requestDoc._id}`,
    });
  }

  return {
    requestId: String(requestDoc._id),
    status: payload.status,
    acceptedCount,
  };
}

export async function revealDonorContact(requestId, responseId, user) {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(responseId)) {
    throw new ApiError(400, "Invalid request or response ID.");
  }

  const requestDoc = await collections
    .requests()
    .findOne({ _id: new ObjectId(requestId) });

  if (!requestDoc) {
    throw new ApiError(404, "Blood request not found.");
  }

  const isOwner = String(requestDoc.requesterId) === String(user.id);
  const isStaff = [ROLES.ADMIN, ROLES.MODERATOR].includes(user.role);

  if (!isOwner && !isStaff) {
    throw new ApiError(
      403,
      "Only the requester can reveal a responding donor's contact number."
    );
  }

  const responseDoc = await collections.requestResponses().findOneAndUpdate(
    {
      _id: new ObjectId(responseId),
      requestId: String(requestDoc._id),
      status: RESPONSE_STATUS.ACCEPTED,
    },
    {
      $set: {
        contactRevealed: true,
        revealedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!responseDoc) {
    throw new ApiError(404, "Accepted donor response not found.");
  }

  await createNotification({
    userId: responseDoc.donorId,
    title: "Your phone number was shared with the requester",
    message: `${requestDoc.contactName} unlocked your contact number for the ${requestDoc.bloodGroup} request at ${requestDoc.hospitalName}.`,
    type: "reveal",
    link: `/requests/${requestDoc._id}`,
  });

  return {
    responseId: responseDoc._id,
    donorName: responseDoc.donorName,
    donorPhone: responseDoc.donorPhone,
    revealedAt: responseDoc.revealedAt,
  };
}

export async function updateRequestStatus(requestId, user, payload) {
  if (!ObjectId.isValid(requestId)) {
    throw new ApiError(400, "Invalid blood request ID.");
  }

  const requestDoc = await collections
    .requests()
    .findOne({ _id: new ObjectId(requestId) });

  if (!requestDoc) {
    throw new ApiError(404, "Blood request not found.");
  }

  const isOwner = String(requestDoc.requesterId) === String(user.id);
  const isStaff = [ROLES.ADMIN, ROLES.MODERATOR].includes(user.role);

  if (!isOwner && !isStaff) {
    throw new ApiError(403, "Not authorized to update this blood request.");
  }

  const now = new Date();
  const updateData = {
    status: payload.status,
    updatedAt: now,
  };

  if (payload.status === REQUEST_STATUS.FULFILLED) {
    updateData.fulfilledAt = now;
    updateData.bagsFulfilled = requestDoc.bagsNeeded;
  }

  await collections
    .requests()
    .updateOne({ _id: requestDoc._id }, { $set: updateData });

  // If fulfilled by a specific registered donor, record the donation & update donor cooldown
  if (
    payload.status === REQUEST_STATUS.FULFILLED &&
    payload.fulfilledDonorId
  ) {
    const donorUserId = String(payload.fulfilledDonorId);
    const donorProfile = await collections
      .donorProfiles()
      .findOne({ userId: donorUserId });

    const donationDoc = {
      donorId: donorUserId,
      donorName: donorProfile?.name || "Registered Donor",
      bloodGroup: donorProfile?.bloodGroup || requestDoc.bloodGroup,
      requestId: String(requestDoc._id),
      patientName: requestDoc.patientName,
      hospitalName: requestDoc.hospitalName,
      location: requestDoc.location,
      bags: 1,
      donatedAt: now,
      verifiedByRequester: true,
      createdAt: now,
    };

    await collections.donations().insertOne(donationDoc);

    await collections.donorProfiles().updateOne(
      { userId: donorUserId },
      {
        $set: { lastDonatedAt: now, updatedAt: now },
        $inc: { totalDonations: 1 },
      }
    );

    await collections.requestResponses().updateOne(
      { requestId: String(requestDoc._id), donorId: donorUserId },
      { $set: { status: RESPONSE_STATUS.DONATED, updatedAt: now } }
    );

    await createNotification({
      userId: donorUserId,
      title: "Thank you for saving a life!",
      message: `Your donation for ${requestDoc.patientName} at ${requestDoc.hospitalName} has been confirmed. Your certificate is ready in your dashboard.`,
      type: "fulfilled",
      link: "/dashboard/donations",
    });
  }

  return {
    _id: requestDoc._id,
    status: payload.status,
  };
}