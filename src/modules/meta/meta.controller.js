import { collections } from "../../config/db.js";
import { BLOOD_GROUPS, REQUEST_STATUS } from "../../utils/constants.js";
import {
  RECIPIENT_COMPATIBLE_DONORS,
  DONOR_COMPATIBLE_RECIPIENTS,
} from "../../utils/bloodCompatibility.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const BD_LOCATIONS = [
  {
    division: "Dhaka",
    districts: [
      {
        district: "Dhaka",
        upazilas: [
          "Dhanmondi",
          "Mirpur",
          "Mohammadpur",
          "Uttara",
          "Gulshan",
          "Banani",
          "Tejgaon",
          "Motijheel",
          "Savar",
          "Keraniganj",
        ],
      },
      {
        district: "Gazipur",
        upazilas: ["Gazipur Sadar", "Tongi", "Kaliakair", "Kapasia", "Sreepur"],
      },
      {
        district: "Narayanganj",
        upazilas: ["Narayanganj Sadar", "Bandar", "Rupganj", "Sonargaon", "Araihazar"],
      },
    ],
  },
  {
    division: "Chattogram",
    districts: [
      {
        district: "Chattogram",
        upazilas: [
          "Kotwali",
          "Panchlaish",
          "Pahartali",
          "Halishahar",
          "Sitakunda",
          "Hathazari",
          "Patiya",
        ],
      },
      {
        district: "Cumilla",
        upazilas: ["Cumilla Sadar", "Daudkandi", "Laksam", "Chauddagram"],
      },
    ],
  },
  {
    division: "Rajshahi",
    districts: [
      {
        district: "Rajshahi",
        upazilas: ["Boalia", "Rajpara", "Motihar", "Paba", "Godagari"],
      },
      {
        district: "Bogura",
        upazilas: ["Bogura Sadar", "Sherpur", "Shajahanpur", "Shibganj"],
      },
    ],
  },
  {
    division: "Khulna",
    districts: [
      {
        district: "Khulna",
        upazilas: ["Khulna Sadar", "Sonadanga", "Khalishpur", "Dumuria"],
      },
      {
        district: "Jashore",
        upazilas: ["Jashore Sadar", "Abhaynagar", "Jhikargachha"],
      },
    ],
  },
  {
    division: "Sylhet",
    districts: [
      {
        district: "Sylhet",
        upazilas: ["Sylhet Sadar", "Beanibazar", "Golapganj", "Fenchuganj"],
      },
    ],
  },
  {
    division: "Barishal",
    districts: [
      {
        district: "Barishal",
        upazilas: ["Barishal Sadar", "Bakerganj", "Babuganj", "Mehendiganj"],
      },
    ],
  },
  {
    division: "Rangpur",
    districts: [
      {
        district: "Rangpur",
        upazilas: ["Rangpur Sadar", "Badarganj", "Mithapukur", "Gangachara"],
      },
    ],
  },
  {
    division: "Mymensingh",
    districts: [
      {
        district: "Mymensingh",
        upazilas: ["Mymensingh Sadar", "Trishal", "Bhaluka", "Muktagachha"],
      },
    ],
  },
];

export const getBloodGroups = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      bloodGroups: BLOOD_GROUPS,
      recipientCompatibleDonors: RECIPIENT_COMPATIBLE_DONORS,
      donorCompatibleRecipients: DONOR_COMPATIBLE_RECIPIENTS,
    },
  });
});

export const getLocations = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: BD_LOCATIONS,
  });
});

export const getPublicStats = asyncHandler(async (_req, res) => {
  const [totalDonors, fulfilledRequests, openRequests, verifiedBanks] =
    await Promise.all([
      collections.donorProfiles().countDocuments({ isAvailable: true }),
      collections.requests().countDocuments({ status: REQUEST_STATUS.FULFILLED }),
      collections.requests().countDocuments({ status: REQUEST_STATUS.OPEN }),
      collections.banks().countDocuments({ isVerified: true }),
    ]);

  res.json({
    success: true,
    data: {
      totalDonors,
      fulfilledRequests,
      openRequests,
      verifiedBanks,
    },
  });
});