import yahooFinanceModule from "yahoo-finance2";
import type { TradeRow } from "../types";

const yahooFinance =
  (yahooFinanceModule as { default?: typeof yahooFinanceModule }).default ??
  yahooFinanceModule;

yahooFinance.suppressNotices(["ripHistorical"]);

export const BENCHMARK_SYMBOL = "SPY";
export const YAHOO_DELAY_MS = 1200;
export const CACHE_TTL_MS = 60 * 60 * 1000;

export type DataSource = "yahoo-finance2" | "partial" | "estimated";

export interface PricePoint {
  date: Date;
  close: number;
}

export function normalizeTicker(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const sym = raw.split(":")[0]?.trim().toUpperCase();
  return sym && /^[A-Z.\-]{1,10}$/.test(sym) ? sym : null;
}

export function sizeWeight(sizeLabel: string | null): number {
  if (!sizeLabel) return 1;
  const lower = sizeLabel.toLowerCase();
  if (lower.includes("25m") || lower.includes("5m") || lower.includes("1m"))
    return 3;
  if (lower.includes("500k") || lower.includes("250k")) return 2;
  return 1;
}

export function parseTradeDate(txDate: string): Date {
  return new Date(txDate.includes("T") ? txDate : `${txDate}T12:00:00`);
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Too Many Requests") ||
    msg.includes("429") ||
    msg.includes("Not valid JSON")
  );
}

export function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

export function returnPct(values: number[]): number {
  if (values.length < 2 || values[0] === 0) return 0;
  return ((values[values.length - 1] - values[0]) / values[0]) * 100;
}

export async function fetchMonthlyCloses(
  symbol: string,
  period1: Date,
  period2: Date,
): Promise<PricePoint[]> {
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1mo",
  });

  const quotes = (result as { quotes?: Array<{ date?: Date; close?: number | null }> })
    .quotes;

  if (!quotes?.length) return [];

  return quotes
    .filter((q) => q.date && q.close != null && !Number.isNaN(q.close))
    .map((q) => ({
      date: new Date(q.date!),
      close: Number(q.close),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function fetchDailyCloses(
  symbol: string,
  period1: Date,
  period2: Date,
): Promise<PricePoint[]> {
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  });

  const quotes = (result as { quotes?: Array<{ date?: Date; close?: number | null }> })
    .quotes;

  if (!quotes?.length) return [];

  return quotes
    .filter((q) => q.date && q.close != null && !Number.isNaN(q.close))
    .map((q) => ({
      date: new Date(q.date!),
      close: Number(q.close),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function fetchPricesSafe(
  symbol: string,
  period1: Date,
  period2: Date,
): Promise<PricePoint[]> {
  try {
    return await fetchMonthlyCloses(symbol, period1, period2);
  } catch (err) {
    if (isRateLimitError(err)) throw err;
    return [];
  }
}

export async function fetchDailyPricesSafe(
  symbol: string,
  period1: Date,
  period2: Date,
): Promise<PricePoint[]> {
  try {
    return await fetchDailyCloses(symbol, period1, period2);
  } catch (err) {
    if (isRateLimitError(err)) throw err;
    return [];
  }
}

/** Nearest close on or before target date. */
export function priceOnOrBefore(
  prices: PricePoint[],
  target: Date,
): number | null {
  const t = target.getTime();
  let best: PricePoint | null = null;
  for (const p of prices) {
    if (p.date.getTime() <= t) best = p;
    else break;
  }
  return best?.close ?? null;
}

export function buildMonthKeys(
  periodStart: Date,
  periodEnd: Date,
  count?: number,
): string[] {
  const keys: string[] = [];
  const cursor = new Date(periodStart);
  cursor.setDate(1);
  while (cursor <= periodEnd) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (count == null || keys.length <= count) return keys;
  const step = (keys.length - 1) / (count - 1);
  const sampled: string[] = [];
  for (let i = 0; i < count; i++) {
    sampled.push(keys[Math.round(i * step)]);
  }
  return sampled;
}

export function buildMonthlyReturns(prices: PricePoint[]): Map<string, number> {
  const returns = new Map<string, number>();
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].close;
    const curr = prices[i].close;
    if (prev > 0) {
      returns.set(monthKey(prices[i].date), (curr - prev) / prev);
    }
  }
  return returns;
}

export function buildHoldingsAtMonth(
  trades: TradeRow[],
  monthEnd: Date,
): Map<string, number> {
  const holdings = new Map<string, number>();
  for (const t of trades) {
    const txDate = parseTradeDate(t.tx_date);
    if (txDate > monthEnd) continue;
    const sym = normalizeTicker(t.issuer_ticker);
    if (!sym) continue;
    const w = sizeWeight(t.size_label);
    const current = holdings.get(sym) ?? 0;
    if (t.tx_type.toLowerCase() === "buy") {
      holdings.set(sym, current + w);
    } else if (t.tx_type.toLowerCase() === "sell") {
      holdings.set(sym, Math.max(0, current - w));
    }
  }
  return holdings;
}

export function topSymbolsByTrades(trades: TradeRow[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const sym = normalizeTicker(t.issuer_ticker);
    if (!sym) continue;
    counts.set(sym, (counts.get(sym) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([sym]) => sym);
}

/** Estimated indexed curve from disclosure activity when Yahoo is unavailable. */
export function buildEstimatedPortfolioValues(
  monthKeys: string[],
  allTrades: TradeRow[],
): number[] {
  let value = 100;
  const values = [100];
  for (const month of monthKeys) {
    let flow = 0;
    for (const t of allTrades) {
      if (monthKey(parseTradeDate(t.tx_date)) !== month) continue;
      const w = sizeWeight(t.size_label);
      if (t.tx_type.toLowerCase() === "buy") flow += w * 1.8;
      else if (t.tx_type.toLowerCase() === "sell") flow -= w * 1.2;
    }
    value = Math.max(88, Math.min(125, value + flow));
    values.push(value);
  }
  return values;
}
