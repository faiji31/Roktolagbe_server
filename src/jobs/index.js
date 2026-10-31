import cron from "node-cron";
import { runExpireRequestsJob } from "./expireRequests.job.js";
import { runEligibleAgainJob } from "./eligibleAgain.job.js";
import { runLowStockJob } from "./lowStock.job.js";

export function startCronJobs() {
  // Every 15 minutes: expire overdue blood requests
  cron.schedule("*/15 * * * *", async () => {
    try {
      await runExpireRequestsJob();
    } catch (err) {
      console.error("[Cron Error - expireRequests]:", err.message);
    }
  });

  // Every day at 09:00 AM: notify donors who are eligible again
  cron.schedule("0 9 * * *", async () => {
    try {
      await runEligibleAgainJob();
    } catch (err) {
      console.error("[Cron Error - eligibleAgain]:", err.message);
    }
  });

  // Every 6 hours: evaluate blood bank low stock thresholds
  cron.schedule("0 */6 * * *", async () => {
    try {
      await runLowStockJob();
    } catch (err) {
      console.error("[Cron Error - lowStock]:", err.message);
    }
  });

  console.log("Scheduled background cron jobs (expireRequests, eligibleAgain, lowStock).");
}