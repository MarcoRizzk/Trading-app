import "../db/database";
import { syncAllPoliticians } from "../services/capitolTradesSync";

syncAllPoliticians()
  .then(() => {
    console.log("[sync] Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[sync] Failed:", err);
    process.exit(1);
  });
