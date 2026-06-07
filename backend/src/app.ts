import "dotenv/config";
import express from "express";
import cors from "cors";
import transactionsRouter from "./routes/transactions";
import holdingsRouter from "./routes/holdings";
import politiciansRouter from "./routes/politicians";
import { seedIfEmpty } from "./db/seed";
import { startPoliticianSyncCron } from "./jobs/scheduleSync";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use("/api/transactions", transactionsRouter);
app.use("/api/holdings", holdingsRouter);
app.use("/api/politicians", politiciansRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

seedIfEmpty();
startPoliticianSyncCron();

app.listen(PORT, () => {
  console.log(`[backend] Running at http://localhost:${PORT}`);
});
