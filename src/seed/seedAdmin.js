import { connectDB, collections, getDB } from "../config/db.js";
import { ROLES } from "../utils/constants.js";

const ADMIN_EMAIL = "admin@roktolagbe.org";
const ADMIN_PASSWORD = "admin1234";

async function seedAdminWithPassword() {
  await connectDB();
  const db = getDB();

  // 1. Remove any old passwordless admin record
  const existing = await collections.users().findOne({ email: ADMIN_EMAIL });
  if (existing) {
    await db.collection("account").deleteMany({
      $or: [{ userId: existing._id }, { userId: String(existing._id) }],
    });
    await collections.users().deleteOne({ _id: existing._id });
  }

  // 2. Register the admin through Better Auth on your running Next.js app (port 3000)
  const response = await fetch("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      name: "RoktoLagbe System Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      phone: "01700000000",
      bloodGroup: "O+",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(
      "Make sure roktolagbe-client is running on http://localhost:3000 first!\n",
      errText
    );
    process.exit(1);
  }

  // 3. Upgrade role from "user" to "admin" in MongoDB
  await collections.users().updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        role: ROLES.ADMIN,
        emailVerified: true,
        isBanned: false,
        updatedAt: new Date(),
      },
    }
  );

  console.log("==========================================");
  console.log("ADMIN ACCOUNT READY!");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("==========================================");
  process.exit(0);
}

seedAdminWithPassword();