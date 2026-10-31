
import { MongoClient } from "mongodb";
import { env } from "./env.js";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

let client;
let dbInstance;

export async function connectDB() {
  if (dbInstance) return dbInstance;

  client = new MongoClient(env.mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 2,
  });

  await client.connect();

  dbInstance = client.db(env.mongoDb);

  console.log(`Connected to MongoDB database: ${env.mongoDb}`);

  await ensureIndexes(dbInstance);

  return dbInstance;
}

export function getDB() {
  if (!dbInstance) {
    throw new Error(
      "Database not initialized. Call connectDB() first."
    );
  }

  return dbInstance;
}

export const collections = {
  users: () => getDB().collection("user"),
  sessions: () => getDB().collection("session"),

  donorProfiles: () => getDB().collection("donorProfiles"),
  requests: () => getDB().collection("bloodRequests"),
  requestResponses: () => getDB().collection("requestResponses"),
  donations: () => getDB().collection("donations"),

  banks: () => getDB().collection("bloodBanks"),
  bloodInventoryLogs: () =>
    getDB().collection("bloodInventoryLogs"),

  camps: () => getDB().collection("camps"),
  reports: () => getDB().collection("reports"),
  notifications: () => getDB().collection("notifications"),
  articles: () => getDB().collection("articles"),
  settings: () => getDB().collection("settings"),
  auditLogs: () => getDB().collection("auditLogs"),
};

async function ensureIndexes(db) {
  await Promise.all([
    // Users
    db.collection("user").createIndex(
      { email: 1 },
      { unique: true }
    ),

    db.collection("user").createIndex({
      bankId: 1,
      role: 1,
    }),

    // Donors
    db.collection("donorProfiles").createIndex(
      { userId: 1 },
      { unique: true }
    ),

    db.collection("donorProfiles").createIndex({
      bloodGroup: 1,
      "location.division": 1,
      "location.district": 1,
      "location.upazila": 1,
      isAvailable: 1,
    }),

    // Blood Requests
    db.collection("bloodRequests").createIndex({
      status: 1,
      bloodGroup: 1,
      "location.district": 1,
      neededBy: 1,
    }),

    db.collection("bloodRequests").createIndex({
      requesterId: 1,
      createdAt: -1,
    }),

    // Request Responses
    db.collection("requestResponses").createIndex(
      { requestId: 1, donorId: 1 },
      { unique: true }
    ),

    // Donations
    db.collection("donations").createIndex({
      donorId: 1,
      donatedAt: -1,
    }),

    // Blood Banks
    db.collection("bloodBanks").createIndex(
      { licenseNo: 1 },
      {
        unique: true,
        partialFilterExpression: {
          licenseNo: { $type: "string" },
        },
      }
    ),

    db.collection("bloodBanks").createIndex({
      "location.division": 1,
      "location.district": 1,
      isVerified: 1,
    }),

    // Inventory History
    db.collection("bloodInventoryLogs").createIndex({
      bankId: 1,
      createdAt: -1,
    }),

    // Notifications
    db.collection("notifications").createIndex({
      userId: 1,
      isRead: 1,
      createdAt: -1,
    }),

    // Audit Logs
    db.collection("auditLogs").createIndex({
      createdAt: -1,
    }),
  ]);

  console.log("MongoDB indexes ensured.");
}
