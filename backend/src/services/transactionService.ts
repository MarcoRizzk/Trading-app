import { v4 as uuidv4 } from "uuid";
import {
  getAllTransactionsForSymbol,
  insertTransaction,
  upsertHolding,
  deleteHolding,
} from "../db/database";
import type {
  CreateTransactionInput,
  HoldingComputed,
  FIFOLot,
  Transaction,
} from "../types";

// ---------------------------------------------------------------------------
// Mock current prices (simulates a price feed)
// ---------------------------------------------------------------------------
const MOCK_PRICES: Record<string, number> = {
  AAPL: 175,
  TSLA: 250,
  MSFT: 420,
  GOOGL: 140,
  AMZN: 185,
  NVDA: 875,
  META: 510,
  NFLX: 490,
};

export function getMockPrice(symbol: string): number {
  return MOCK_PRICES[symbol.toUpperCase()] ?? 100;
}

// ---------------------------------------------------------------------------
// Create a transaction and recompute holdings
// ---------------------------------------------------------------------------
export function createTransaction(input: CreateTransactionInput): Transaction {
  const fee = input.fee ?? 0;
  const totalAmount = input.quantity * input.unitPrice + fee;

  const txn: Transaction = {
    id: uuidv4(),
    symbol: input.symbol.toUpperCase(),
    name: input.name,
    type: input.type,
    date: input.date,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    fee,
    totalAmount,
    createdAt: new Date().toISOString(),
  };

  insertTransaction({
    id: txn.id,
    symbol: txn.symbol,
    name: txn.name,
    type: txn.type,
    date: txn.date,
    quantity: txn.quantity,
    unitPrice: txn.unitPrice,
    fee: txn.fee,
    totalAmount: txn.totalAmount,
    createdAt: txn.createdAt,
  });

  recomputeHolding(txn.symbol, txn.name);

  return txn;
}

// ---------------------------------------------------------------------------
// Recompute a single holding from all its transactions
// ---------------------------------------------------------------------------
function recomputeHolding(symbol: string, name: string): void {
  const rawTxns = getAllTransactionsForSymbol(symbol);

  const transactions: Transaction[] = rawTxns.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    type: r.type,
    date: r.date,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    fee: r.fee,
    totalAmount: r.total_amount,
    createdAt: r.created_at,
  }));

  const computed = computeFIFOLots(transactions);

  if (computed.totalQuantity <= 0.00000001) {
    deleteHolding(symbol);
    return;
  }

  upsertHolding({
    id: uuidv4(),
    symbol,
    name,
    quantity: computed.totalQuantity,
    averageCost: computed.averageCost,
    totalCost: computed.totalCost,
  });
}

// ---------------------------------------------------------------------------
// FIFO Lot Computation
//
// Given all transactions for a symbol, computes the current open lots,
// total quantity held, average cost, and realized gain/loss.
// ---------------------------------------------------------------------------
export function computeFIFOLots(transactions: Transaction[]): HoldingComputed {
  if (transactions.length === 0) {
    return {
      symbol: "",
      totalQuantity: 0,
      averageCost: 0,
      totalCost: 0,
      realizedGainLoss: 0,
      lots: [],
    };
  }

  const symbol = transactions[0].symbol;
  const lots: FIFOLot[] = [];
  let realizedGainLoss = 0;

  // Sort transactions chronologically (oldest first) — required for FIFO
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const txn of sorted) {
    const qty = Number(txn.quantity);
    const price = Number(txn.unitPrice);

    switch (txn.type) {
      case "BUY":
      case "OPENING_BALANCE":
        lots.push({ txnId: txn.id, date: txn.date, quantity: qty, price, remaining: qty });
        break;

      case "SELL": {
        let remaining = qty;
        while (remaining > 0 && lots.length > 0) {
          const front = lots[0];
          const consumed = Math.min(remaining, front.remaining);
          realizedGainLoss += (price - front.price) * consumed;
          front.remaining -= consumed;
          remaining -= consumed;
          if (front.remaining <= 0.00000001) lots.shift();
        }
        break;
      }

      case "SPLIT": {
        const ratio = qty;
        if (!ratio || ratio <= 0 || !Number.isFinite(ratio)) break;
        for (const lot of lots) {
          lot.remaining *= ratio;
          lot.quantity *= ratio;
          lot.price = Math.round((lot.price / ratio) * 1e8) / 1e8;
        }
        break;
      }

      case "DIVIDEND":
        realizedGainLoss += qty * price;
        break;
    }
  }

  const totalQuantity = lots.reduce((s, l) => s + l.remaining, 0);
  const totalCost = lots.reduce((s, l) => s + l.remaining * l.price, 0);

  const averageCost = totalQuantity > 0 ? totalCost / lots.length : 0;

  return { symbol, totalQuantity, averageCost, totalCost, realizedGainLoss, lots };
}
