import cron from "node-cron";
import { syncAllPoliticians } from "../services/capitolTradesSync";

const CRON_SCHEDULE = process.env.SYNC_CRON_SCHEDULE ?? "0 6 * * *";
const ENABLED = process.env.ENABLE_SYNC_CRON !== "false";

export function startPoliticianSyncCron(): void {
  if (!ENABLED) {
    console.log("[cron] Politician sync cron disabled (ENABLE_SYNC_CRON=false)");
    return;
  }

  cron.schedule(CRON_SCHEDULE, () => {
    console.log("[cron] Starting scheduled politician sync...");
    syncAllPoliticians().catch((err) => {
      console.error("[cron] Sync failed:", err);
    });
  });

  console.log(`[cron] Politician sync scheduled: ${CRON_SCHEDULE}`);
}
