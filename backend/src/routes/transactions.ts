import { Router, Request, Response } from "express";
import { createTransaction } from "../services/transactionService";
import type { CreateTransactionInput } from "../types";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  try {
    const input = req.body as CreateTransactionInput;

    if (!input.symbol || !input.name || !input.type || !input.date) {
      return res.status(400).json({ error: "Missing required fields: symbol, name, type, date" });
    }
    if (!input.quantity || input.quantity <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }
    if (input.unitPrice == null || input.unitPrice < 0) {
      return res.status(400).json({ error: "unitPrice must be a non-negative number" });
    }

    const txn = createTransaction(input);
    return res.status(201).json(txn);
  } catch (err: any) {
    console.error("[POST /api/transactions] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
