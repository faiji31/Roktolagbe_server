import { connectDB, collections, getDB } from "../config/db.js";
import { ROLES } from "../utils/constants.js";

const STAFF_ACCOUNTS = [
  {
    name: "RoktoLagbe Moderator",
    email: "moderator@roktolagbe.org",
    password: "mod1234",
    role: ROLES.MODERATOR,
  },
  {
    name: "Quantum Bank Staff",
    email: "quantumstaff@roktolagbe.org",
    password: "bank1234",
    role: ROLES.BANK,
  },
];

async function seedStaffAccounts() {
  await connectDB();
  const db = getDB();

  for (const staff of STAFF_ACCOUNTS) {
    // 1. Remove old record if it exists
    const existing = await collections.users().findOne({ email: staff.email });
    if (existing) {
      await db.collection("account").deleteMany({
        $or: [{ userId: existing._id }, { userId: String(existing._id) }],
      });
      await collections.users().deleteOne({ _id: existing._id });
    }

    // 2. Register via Better Auth on Next.js client (port 3000)
    const response = await fetch("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: staff.name,
        email: staff.email,
        password: staff.password,
        phone: "01700000000",
        bloodGroup: "O+",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Failed to register ${staff.email}. Make sure roktolagbe-client is running on http://localhost:3000.\n`, errText);
      continue;
    }

    // 3. Update role in MongoDB to moderator or bank
    await collections.users().updateOne(
      { email: staff.email },
      {
        $set: {
          role: staff.role,
          emailVerified: true,
          isBanned: false,
          updatedAt: new Date(),
        },
      }
    );

    // 4. If bank staff, link them to a blood bank document
    if (staff.role === ROLES.BANK) {
      const userDoc = await collections.users().findOne({ email: staff.email });
      if (userDoc) {
        await collections.banks().updateOne(
          { licenseNo: "DGHS-BB-1001" },
          { $addToSet: { staffUserIds: String(userDoc._id) } },
          { upsert: true }
        );

        const bank = await collections.banks().findOne({
          licenseNo: "DGHS-BB-1001",
        });

        if (!bank) {
          throw new Error("Unable to find or create the assigned blood bank.");
        }

        await collections.users().updateOne(
          { _id: userDoc._id },
          {
            $set: {
              bankId: String(bank._id),
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    console.log("-----------------------------------------");
    console.log(`CREATED ${staff.role.toUpperCase()} ACCOUNT:`);
    console.log(`Email:    ${staff.email}`);
    console.log(`Password: ${staff.password}`);
    console.log("-----------------------------------------");
  }

  process.exit(0);
}

seedStaffAccounts();