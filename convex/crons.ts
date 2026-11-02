import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("Reconcile eligible guest reminders", { minutes: 15 }, internal.guestReminders.reconcile, {});
export default crons;
