import { getAllTradesForPolitician } from "../db/politicianRepository";
import type { TradeRow } from "../types";
import {
  BENCHMARK_SYMBOL,
  CACHE_TTL_MS,
  YAHOO_DELAY_MS,
  buildEstimatedPortfolioValues,
  buildHoldingsAtMonth,
  buildMonthKeys,
  buildMonthlyReturns,
  fetchPricesSafe,
  isRateLimitError,
  monthKey,
  normalizeTicker,
  parseTradeDate,
  returnPct,
  round1,
  sleep,
  topSymbolsByTrades,
  type DataSource,
} from "./yahooPriceUtils";

export type ChartPeriod = "1M" | "3M" | "6M" | "1Y" | "3Y";

const PERIOD_CONFIG: Record<
  ChartPeriod,
  { months: number; pointCount: number; label: string }
> = {
  "1M": { months: 1, pointCount: 5, label: "1-Month performance" },
  "3M": { months: 3, pointCount: 7, label: "3-Month performance" },
  "6M": { months: 6, pointCount: 9, label: "6-Month performance" },
  "1Y": { months: 12, pointCount: 11, label: "1-Year performance" },
  "3Y": { months: 36, pointCount: 13, label: "3-Year performance" },
};

const MAX_STOCK_SYMBOLS = 5;

export interface ChartPoint {
  x: number;
  y: number;
}

export interface TradeMarker {
  x: number;
  y: number;
  type: "buy" | "sell";
}

export interface PoliticianChartData {
  period: ChartPeriod;
  periodLabel: string;
  portfolioReturnPct: number;
  benchmarkReturnPct: number;
  outperformancePct: number;
  quarterLabels: string[];
  portfolioLine: ChartPoint[];
  tradeMarkers: TradeMarker[];
  dataSource: DataSource;
  warning?: string;
}

const chartCache = new Map<string, { expires: number; data: PoliticianChartData }>();

function cacheKey(politicianId: string, period: ChartPeriod): string {
  return `${politicianId}:${period}`;
}

function quarterLabels(count: number, end: Date): string[] {
  const labels: string[] = [];
  let quarter = Math.floor(end.getMonth() / 3) + 1;
  for (let i = 0; i < count; i++) {
    labels.unshift(`Q${quarter}`);
    quarter -= 1;
    if (quarter === 0) quarter = 4;
  }
  return labels;
}

function compoundSeries(monthKeys: string[], monthlyReturns: number[]): number[] {
  const values: number[] = [100];
  for (const r of monthlyReturns) {
    values.push(values[values.length - 1] * (1 + r));
  }
  const targetLen = Math.max(monthKeys.length + 1, 2);
  while (values.length < targetLen) {
    values.push(values[values.length - 1]);
  }
  return values.slice(0, targetLen);
}

function downsample(values: number[], targetCount: number): number[] {
  if (values.length === 0) return Array.from({ length: targetCount }, () => 100);
  if (values.length <= targetCount) return values;
  if (targetCount <= 1) return [values[values.length - 1]];
  const result: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.round((i / (targetCount - 1)) * (values.length - 1));
    result.push(values[idx]);
  }
  return result;
}

function valuesToSvgPoints(values: number[]): ChartPoint[] {
  if (values.length === 0) {
    return [
      { x: 0, y: 70 },
      { x: 100, y: 70 },
    ];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;

  return values.map((v, i) => ({
    x: n <= 1 ? 0 : (i / (n - 1)) * 100,
    y: 80 - ((v - min) / span) * 58,
  }));
}

function portfolioReturnForMonth(
  holdings: Map<string, number>,
  month: string,
  symbolReturns: Map<string, Map<string, number>>,
): number {
  let weighted = 0;
  let total = 0;
  for (const [sym, weight] of holdings) {
    if (weight <= 0) continue;
    const ret = symbolReturns.get(sym)?.get(month);
    if (ret == null) continue;
    weighted += ret * weight;
    total += weight;
  }
  return total > 0 ? weighted / total : 0;
}

function tradeMarkersForPeriod(
  trades: TradeRow[],
  periodStart: Date,
  periodEnd: Date,
  linePoints: ChartPoint[],
): TradeMarker[] {
  const span = periodEnd.getTime() - periodStart.getTime();
  if (span <= 0) return [];

  return trades
    .filter((t) => {
      const d = parseTradeDate(t.tx_date);
      return d >= periodStart && d <= periodEnd && normalizeTicker(t.issuer_ticker);
    })
    .map((t) => {
      const d = parseTradeDate(t.tx_date);
      const x = ((d.getTime() - periodStart.getTime()) / span) * 100;
      const isBuy = t.tx_type.toLowerCase() === "buy";
      const lineY =
        linePoints.length > 0
          ? linePoints.reduce((best, p) =>
              Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best,
            ).y
          : 50;
      return {
        x,
        y: isBuy ? Math.min(78, lineY + 8) : Math.max(12, lineY - 25),
        type: isBuy ? ("buy" as const) : ("sell" as const),
      };
    });
}

function assembleChart(
  period: ChartPeriod,
  periodStart: Date,
  periodEnd: Date,
  tradesInPeriod: TradeRow[],
  portfolioValues: number[],
  benchmarkValues: number[],
  warnings: string[],
  dataSource: PoliticianChartData["dataSource"],
): PoliticianChartData {
  const config = PERIOD_CONFIG[period];
  const sampledPortfolio = downsample(portfolioValues, config.pointCount);
  const sampledBenchmark = downsample(benchmarkValues, config.pointCount);
  const portfolioLine = valuesToSvgPoints(sampledPortfolio);
  const portfolioReturnPct = returnPct(sampledPortfolio);
  const benchmarkReturnPct = returnPct(sampledBenchmark);

  return {
    period,
    periodLabel: config.label,
    portfolioReturnPct: round1(portfolioReturnPct),
    benchmarkReturnPct: round1(benchmarkReturnPct),
    outperformancePct: round1(portfolioReturnPct - benchmarkReturnPct),
    quarterLabels: quarterLabels(config.pointCount, periodEnd),
    portfolioLine,
    tradeMarkers: tradeMarkersForPeriod(
      tradesInPeriod,
      periodStart,
      periodEnd,
      portfolioLine,
    ),
    dataSource,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

export async function buildPoliticianChart(
  politicianId: string,
  period: ChartPeriod = "3Y",
): Promise<PoliticianChartData> {
  const key = cacheKey(politicianId, period);
  const cached = chartCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const config = PERIOD_CONFIG[period];
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - config.months);

  const allTrades = getAllTradesForPolitician(politicianId);
  const tradesInPeriod = allTrades.filter((t) => {
    const d = parseTradeDate(t.tx_date);
    return d >= periodStart && d <= periodEnd;
  });

  const symbols = topSymbolsByTrades(allTrades, MAX_STOCK_SYMBOLS);
  const monthKeys = buildMonthKeys(
    periodStart,
    periodEnd,
    Math.max(config.pointCount - 1, 2),
  );

  const warnings: string[] = [];
  let benchmarkPrices: Awaited<ReturnType<typeof fetchPricesSafe>> = [];
  let yahooBlocked = false;

  try {
    benchmarkPrices = await fetchPricesSafe(
      BENCHMARK_SYMBOL,
      periodStart,
      periodEnd,
    );
    if (benchmarkPrices.length < 2) {
      warnings.push("S&P 500 (SPY) history was empty from Yahoo Finance.");
    }
  } catch (err) {
    yahooBlocked = isRateLimitError(err);
    warnings.push(
      yahooBlocked
        ? "Yahoo Finance rate limit reached; showing an estimated chart from trade disclosures."
        : "Could not load S&P 500 (SPY) benchmark from Yahoo Finance.",
    );
  }

  if (yahooBlocked) {
    const estimated = buildEstimatedPortfolioValues(monthKeys, allTrades);
    const flatBenchmark = Array.from({ length: estimated.length }, () => 100);
    const data = assembleChart(
      period,
      periodStart,
      periodEnd,
      tradesInPeriod,
      estimated,
      flatBenchmark,
      warnings,
      "estimated",
    );
    chartCache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
    return data;
  }

  const symbolReturns = new Map<string, Map<string, number>>();
  for (const sym of symbols) {
    await sleep(YAHOO_DELAY_MS);
    try {
      const prices = await fetchPricesSafe(sym, periodStart, periodEnd);
      if (prices.length > 1) {
        symbolReturns.set(sym, buildMonthlyReturns(prices));
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        yahooBlocked = true;
        warnings.push(
          "Yahoo Finance rate limit reached while loading stock prices.",
        );
        break;
      }
      warnings.push(`Skipped ${sym} (no price history).`);
    }
  }

  const priceMonthKeys =
    benchmarkPrices.length > 1
      ? benchmarkPrices.slice(1).map((p) => monthKey(p.date))
      : monthKeys;

  const portfolioMonthlyReturns = priceMonthKeys.map((month) => {
    const monthEnd = new Date(`${month}-15T12:00:00`);
    const holdings = buildHoldingsAtMonth(allTrades, monthEnd);
    return portfolioReturnForMonth(holdings, month, symbolReturns);
  });

  const benchmarkReturnMap =
    benchmarkPrices.length > 1
      ? buildMonthlyReturns(benchmarkPrices)
      : new Map<string, number>();
  const benchmarkMonthlyReturns = priceMonthKeys.map(
    (m) => benchmarkReturnMap.get(m) ?? 0,
  );

  let portfolioValues = compoundSeries(priceMonthKeys, portfolioMonthlyReturns);
  let benchmarkValues = compoundSeries(priceMonthKeys, benchmarkMonthlyReturns);

  const hasLivePrices = symbolReturns.size > 0 || benchmarkPrices.length > 1;

  if (!hasLivePrices || yahooBlocked) {
    portfolioValues = buildEstimatedPortfolioValues(monthKeys, allTrades);
    benchmarkValues =
      benchmarkPrices.length > 1
        ? compoundSeries(priceMonthKeys, benchmarkMonthlyReturns)
        : Array.from({ length: portfolioValues.length }, () => 100);
    if (!warnings.some((w) => w.includes("estimated"))) {
      warnings.push(
        "Live market prices unavailable; portfolio line is estimated from disclosed trades.",
      );
    }
  } else if (portfolioValues.every((v) => v === 100) && symbols.length > 0) {
    portfolioValues = [...benchmarkValues];
    warnings.push(
      "Could not match all holdings to price data; portfolio line follows SPY.",
    );
  }

  const dataSource: PoliticianChartData["dataSource"] = hasLivePrices
    ? warnings.length
      ? "partial"
      : "yahoo-finance2"
    : "estimated";

  const data = assembleChart(
    period,
    periodStart,
    periodEnd,
    tradesInPeriod,
    portfolioValues,
    benchmarkValues,
    warnings,
    dataSource,
  );

  chartCache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}
