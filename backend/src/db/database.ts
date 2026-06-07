import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { initPoliticianTables } from "./politicianSchema";

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "portfolio.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    symbol      TEXT NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    date        TEXT NOT NULL,
    quantity    REAL NOT NULL,
    unit_price  REAL NOT NULL,
    fee         REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id           TEXT PRIMARY KEY,
    symbol       TEXT NOT NULL,
    name         TEXT NOT NULL,
    quantity     REAL NOT NULL,
    average_cost REAL NOT NULL,
    total_cost   REAL NOT NULL,
    UNIQUE(symbol)
  );
`);

initPoliticianTables();

export function getAllTransactionsForSymbol(symbol: string): any[] {
  return db
    .prepare(
      "SELECT * FROM transactions WHERE symbol = ? ORDER BY date ASC, created_at ASC",
    )
    .all(symbol);
}

export function getAllHoldings(): any[] {
  return db.prepare("SELECT * FROM holdings ORDER BY symbol ASC").all();
}

export function insertTransaction(txn: {
  id: string;
  symbol: string;
  name: string;
  type: string;
  date: string;
  quantity: number;
  unitPrice: number;
  fee: number;
  totalAmount: number;
  createdAt: string;
}): void {
  db.prepare(
    `
    INSERT INTO transactions (id, symbol, name, type, date, quantity, unit_price, fee, total_amount, created_at)
    VALUES (@id, @symbol, @name, @type, @date, @quantity, @unitPrice, @fee, @totalAmount, @createdAt)
  `,
  ).run(txn);
}

export function upsertHolding(holding: {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
}): void {
  db.prepare(
    `
    INSERT INTO holdings (id, symbol, name, quantity, average_cost, total_cost)
    VALUES (@id, @symbol, @name, @quantity, @averageCost, @totalCost)
  `,
  ).run(holding);
}

export function deleteHolding(symbol: string): void {
  db.prepare("DELETE FROM holdings WHERE symbol = ?").run(symbol);
}

export function holdingsCount(): number {
  const row = db.prepare("SELECT COUNT(*) as cnt FROM holdings").get() as {
    cnt: number;
  };
  return row.cnt;
}
