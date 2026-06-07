import { Router, Request, Response } from "express";
import { getAllHoldings } from "../db/database";
import { getMockPrice } from "../services/transactionService";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  try {
    const rows = getAllHoldings();

    const holdings = rows.map((row) => {
      const currentPrice = getMockPrice(row.symbol);
      const currentValue = row.quantity * currentPrice;
      const unrealizedGainLoss = currentValue - row.total_cost;
      const unrealizedGainLossPct =
        row.total_cost > 0 ? (unrealizedGainLoss / row.total_cost) * 100 : 0;

      return {
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        quantity: row.quantity,
        averageCost: row.average_cost,
        totalCost: row.total_cost,
        currentPrice,
        currentValue,
        unrealizedGainLoss,
        unrealizedGainLossPct,
      };
    });

    return res.json(holdings);
  } catch (err: any) {
    console.error("[GET /api/holdings] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
