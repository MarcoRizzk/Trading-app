import { db, holdingsCount } from "./database";
import { v4 as uuidv4 } from "uuid";

export function seedIfEmpty(): void {
  if (holdingsCount() > 0) return;

  console.log("[seed] Seeding initial portfolio data...");

  // Transactions include brokerage fees — these should affect cost basis
  const transactions = [
    {
      id: uuidv4(),
      symbol: "AAPL",
      name: "Apple Inc.",
      type: "BUY",
      date: "2024-01-15",
      quantity: 10,
      unit_price: 150.0,
      fee: 10.0,
      total_amount: 1510.0,
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      symbol: "TSLA",
      name: "Tesla Inc.",
      type: "BUY",
      date: "2024-01-20",
      quantity: 5,
      unit_price: 200.0,
      fee: 10.0,
      total_amount: 1010.0,
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      symbol: "MSFT",
      name: "Microsoft Corp.",
      type: "BUY",
      date: "2024-02-01",
      quantity: 8,
      unit_price: 380.0,
      fee: 0,
      total_amount: 3040.0,
      created_at: new Date().toISOString(),
    },
  ];

  const insertTxn = db.prepare(`
    INSERT INTO transactions (id, symbol, name, type, date, quantity, unit_price, fee, total_amount, created_at)
    VALUES (@id, @symbol, @name, @type, @date, @quantity, @unit_price, @fee, @total_amount, @created_at)
  `);

  // Holdings reflect what the current (buggy) FIFO computation produces.
  // Fee is NOT factored into cost basis — average costs are understated.
  //   AAPL: paid $1510 for 10 shares → correct avg = $151.00, stored as $150.00
  //   TSLA: paid $1010 for 5 shares  → correct avg = $202.00, stored as $200.00
  //   MSFT: paid $3040, no fee       → correct avg = $380.00, stored as $380.00 (correct)
  const insertHolding = db.prepare(`
    INSERT INTO holdings (id, symbol, name, quantity, average_cost, total_cost)
    VALUES (@id, @symbol, @name, @quantity, @average_cost, @total_cost)
  `);

  const holdings = [
    {
      id: uuidv4(),
      symbol: "AAPL",
      name: "Apple Inc.",
      quantity: 10,
      average_cost: 150.0,
      total_cost: 1500.0,
    },
    {
      id: uuidv4(),
      symbol: "TSLA",
      name: "Tesla Inc.",
      quantity: 5,
      average_cost: 200.0,
      total_cost: 1000.0,
    },
    {
      id: uuidv4(),
      symbol: "MSFT",
      name: "Microsoft Corp.",
      quantity: 8,
      average_cost: 380.0,
      total_cost: 3040.0,
    },
  ];

  const seedAll = db.transaction(() => {
    for (const txn of transactions) insertTxn.run(txn);
    for (const h of holdings) insertHolding.run(h);
  });

  seedAll();
  console.log("[seed] Done — 3 holdings seeded.");
}
