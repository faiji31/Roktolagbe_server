import { connectDB, collections } from "../config/db.js";

async function seedBanks() {
  await connectDB();

  const banks = [
    {
      name: "Quantum Lab Blood Bank",
      licenseNo: "DGHS-BB-1001",
      phone: "+8801714010869",
      email: "quantum@roktolagbe.org",
      location: {
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Paltan",
        address: "31/V Shilpacharya Zainul Abedin Sarak, Shantinagar, Dhaka",
      },
      inventory: {
        "A+": 18,
        "A-": 4,
        "B+": 24,
        "B-": 3,
        "AB+": 11,
        "AB-": 2,
        "O+": 29,
        "O-": 5,
      },
      isVerified: true,
      hours: "24/7 Open",
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    {
      name: "Bangladesh Red Crescent Blood Center",
      licenseNo: "DGHS-BB-1002",
      phone: "+88029116563",
      email: "redcrescent@roktolagbe.org",
      location: {
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Mohammadpur",
        address: "7/5 Aurangzeb Road, Mohammadpur, Dhaka",
      },
      inventory: {
        "A+": 22,
        "A-": 6,
        "B+": 30,
        "B-": 5,
        "AB+": 14,
        "AB-": 3,
        "O+": 35,
        "O-": 7,
      },
      isVerified: true,
      hours: "24/7 Open",
      updatedAt: new Date(),
      createdAt: new Date(),
    },
  ];

  for (const bank of banks) {
    await collections.banks().updateOne(
      { licenseNo: bank.licenseNo },
      { $set: bank },
      { upsert: true }
    );
  }

  console.log("Seeded verified blood banks.");
  process.exit(0);
}

seedBanks();