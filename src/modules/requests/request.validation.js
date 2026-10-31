import { z } from "zod";
import {
  BLOOD_GROUPS,
  URGENCY_LEVELS,
  REQUEST_STATUS,
  RESPONSE_STATUS,
} from "../../utils/constants.js";

export const createRequestSchema = z.object({
  patientName: z.string().trim().min(2, "Patient name is required").max(100),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: "Valid blood group is required" }),
  }),
  bagsNeeded: z.coerce.number().int().min(1).max(20).default(1),
  urgency: z
    .enum([
      URGENCY_LEVELS.NORMAL,
      URGENCY_LEVELS.URGENT,
      URGENCY_LEVELS.CRITICAL,
    ])
    .default(URGENCY_LEVELS.NORMAL),
  hospitalName: z.string().trim().min(2, "Hospital name is required").max(160),
  location: z.object({
    division: z.string().trim().min(2, "Division is required"),
    district: z.string().trim().min(2, "District is required"),
    upazila: z.string().trim().min(2, "Upazila is required"),
    address: z.string().trim().max(240).optional().default(""),
  }),
  neededBy: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Valid neededBy date/time is required",
  }),
  contactName: z.string().trim().min(2, "Contact person name is required").max(100),
  contactPhone: z
    .string()
    .trim()
    .min(10, "Valid contact phone number is required")
    .max(20),
  reason: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(600).optional().default(""),
});

export const respondRequestSchema = z.object({
  status: z.enum([RESPONSE_STATUS.ACCEPTED, RESPONSE_STATUS.DECLINED]),
  note: z.string().trim().max(300).optional().default(""),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum([
    REQUEST_STATUS.OPEN,
    REQUEST_STATUS.IN_PROGRESS,
    REQUEST_STATUS.FULFILLED,
    REQUEST_STATUS.CANCELLED,
  ]),
  fulfilledDonorId: z.string().trim().optional().nullable(),
});