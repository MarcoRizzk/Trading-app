import { getAllTradesForPolitician } from "../db/politicianRepository";
import type { TradeRow } from "../types";
import {
  BENCHMARK_SYMBOL,
  CACHE_TTL_MS,
  YAHOO_DELAY_MS,
  buildEstimatedPortfolioValues,
  buildMonthKeys,
  buildMonthlyReturns,
  fetchDailyPricesSafe,
  fetchPricesSafe,
  isRateLimitError,
  normalizeTicker,
  parseTradeDate,
  priceOnOrBefore,
  round1,
  sizeWeight,
  sleep,
  topSymbolsByTrades,
  type DataSource,
  type PricePoint,
} from "./yahooPriceUtils";

const MAX_SIM_SYMBOLS = 15;

export interface SimulationTimelinePoint {
  date: string;
  portfolioValueUsd: number;
  benchmarkValueUsd: number;
}

export interface SimulationTradeSummary {
  txDate: string;
  ticker: string;
  txType: string;
  applied: boolean;
  reason?: string;
}

export interface PoliticianSimulationResult {
  initialAmountUsd: number;
  currentValueUsd: number;
  totalReturnPct: number;
  benchmarkValueUsd: number;
  benchmarkReturnPct: number;
  outperformancePct: number;
  timeline: SimulationTimelinePoint[];
  tradesApplied: number;
  tradesSkipped: number;
  tradeSummaries: SimulationTradeSummary[];
  dataSource: DataSource;
  warning?: string;
}

interface HoldingLot {
  shares: number;
  costBasis: number;
}

const simCache = new Map<
  string,
  { expires: number; data: PoliticianSimulationResult }
>();

function politicianWeightAtDate(
  trades: TradeRow[],
  sym: string,
  asOf: Date,
): number {
  let w = 0;
  for (const t of trades) {
    if (parseTradeDate(t.tx_date) > asOf) continue;
    if (normalizeTicker(t.issuer_ticker) !== sym) continue;
    const sw = sizeWeight(t.size_label);
    if (t.tx_type.toLowerCase() === "buy") w += sw;
    else if (t.tx_type.toLowerCase() === "sell") w = Math.max(0, w - sw);
  }
  return w;
}

/** Yahoo close on trade date, else Capitol Trades disclosure price when present. */
function executionPrice(
  trade: TradeRow,
  sym: string,
  txDate: Date,
  pricesBySymbol: Map<string, PricePoint[]>,
): number | null {
  const series = pricesBySymbol.get(sym);
  if (series) {
    const px = priceOnOrBefore(series, txDate);
    if (px != null && px > 0) return px;
  }
  if (trade.price != null && trade.price > 0) return trade.price;
  return null;
}

function markPortfolioValue(
  holdings: Map<string, HoldingLot>,
  cashUsd: number,
  pricesBySymbol: Map<string, PricePoint[]>,
  asOf: Date,
): number {
  let total = cashUsd;
  for (const [sym, lot] of holdings) {
    if (lot.shares <= 0) continue;
    const prices = pricesBySymbol.get(sym);
    const px = prices ? priceOnOrBefore(prices, asOf) : null;
    if (px != null && px > 0) total += lot.shares * px;
    else total += lot.costBasis;
  }
  return total;
}

function buildEstimatedTimeline(
  amountUsd: number,
  monthKeys: string[],
  allTrades: TradeRow[],
  spyPrices: PricePoint[],
): SimulationTimelinePoint[] {
  const indexed = buildEstimatedPortfolioValues(monthKeys, allTrades);
  const spyReturns =
    spyPrices.length > 1 ? buildMonthlyReturns(spyPrices) : new Map<string, number>();
  let bench = amountUsd;
  const timeline: SimulationTimelinePoint[] = [];

  for (let i = 0; i < monthKeys.length; i++) {
    const month = monthKeys[i];
    const scale = indexed[Math.min(i + 1, indexed.length - 1)] / 100;
    if (i > 0) {
      const r = spyReturns.get(month) ?? 0;
      bench = bench * (1 + r);
    }
    timeline.push({
      date: `${month}-01`,
      portfolioValueUsd: round1(amountUsd * scale),
      benchmarkValueUsd: round1(bench),
    });
  }
  return timeline;
}

export async function runPoliticianSimulation(
  politicianId: string,
  amountUsd: number,
): Promise<PoliticianSimulationResult> {
  const cacheKey = `simulate:${politicianId}:${amountUsd}`;
  const cached = simCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const allTrades = getAllTradesForPolitician(politicianId);
  const warnings: string[] = [];
  const tradeSummaries: SimulationTradeSummary[] = [];

  if (allTrades.length === 0) {
    const empty: PoliticianSimulationResult = {
      initialAmountUsd: amountUsd,
      currentValueUsd: amountUsd,
      totalReturnPct: 0,
      benchmarkValueUsd: amountUsd,
      benchmarkReturnPct: 0,
      outperformancePct: 0,
      timeline: [],
      tradesApplied: 0,
      tradesSkipped: 0,
      tradeSummaries: [],
      dataSource: "estimated",
      warning: "No trades on record for this politician.",
    };
    simCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data: empty });
    return empty;
  }

  const periodStart = parseTradeDate(allTrades[0].tx_date);
  const periodEnd = new Date();
  const monthKeys = buildMonthKeys(periodStart, periodEnd);

  const actionableTrades = allTrades.filter((t) => {
    const type = t.tx_type.toLowerCase();
    return (type === "buy" || type === "sell") && normalizeTicker(t.issuer_ticker);
  });

  const buyTrades = actionableTrades.filter((t) => t.tx_type.toLowerCase() === "buy");
  const totalBuyWeight = buyTrades.reduce(
    (sum, t) => sum + sizeWeight(t.size_label),
    0,
  );

  if (totalBuyWeight <= 0) {
    const empty: PoliticianSimulationResult = {
      initialAmountUsd: amountUsd,
      currentValueUsd: amountUsd,
      totalReturnPct: 0,
      benchmarkValueUsd: amountUsd,
      benchmarkReturnPct: 0,
      outperformancePct: 0,
      timeline: [],
      tradesApplied: 0,
      tradesSkipped: actionableTrades.length,
      tradeSummaries: [],
      dataSource: "estimated",
      warning: "No buy trades found to allocate capital.",
    };
    simCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data: empty });
    return empty;
  }

  const symbolsToFetch = topSymbolsByTrades(actionableTrades, MAX_SIM_SYMBOLS);
  const allSymbols = new Set<string>();
  for (const t of actionableTrades) {
    const sym = normalizeTicker(t.issuer_ticker);
    if (sym) allSymbols.add(sym);
  }
  if (allSymbols.size > MAX_SIM_SYMBOLS) {
    warnings.push(
      `Price data loaded for top ${MAX_SIM_SYMBOLS} tickers; ${allSymbols.size - MAX_SIM_SYMBOLS} others may use cost basis.`,
    );
  }

  const pricesBySymbol = new Map<string, PricePoint[]>();
  let yahooBlocked = false;
  let livePriceCount = 0;

  const fetchSymbol = async (sym: string) => {
    await sleep(YAHOO_DELAY_MS);
    try {
      const daily = await fetchDailyPricesSafe(sym, periodStart, periodEnd);
      if (daily.length > 0) {
        pricesBySymbol.set(sym, daily);
        livePriceCount++;
        return;
      }
      const monthly = await fetchPricesSafe(sym, periodStart, periodEnd);
      if (monthly.length > 0) {
        pricesBySymbol.set(sym, monthly);
        livePriceCount++;
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        yahooBlocked = true;
        if (
          !warnings.some((w) => w.includes("Yahoo Finance rate limit"))
        ) {
          warnings.push(
            "Yahoo Finance rate limit reached; using disclosure prices where available.",
          );
        }
      }
    }
  };

  await fetchSymbol(BENCHMARK_SYMBOL);
  for (const sym of symbolsToFetch) {
    if (sym === BENCHMARK_SYMBOL) continue;
    await fetchSymbol(sym);
  }

  const useEstimatedTimeline = livePriceCount === 0;

  const holdings = new Map<string, HoldingLot>();
  let cashUsd = amountUsd;
  let tradesApplied = 0;
  let tradesSkipped = 0;
  let deployedUsd = 0;

  const spyPrices = pricesBySymbol.get(BENCHMARK_SYMBOL) ?? [];
  const firstTradeDate = parseTradeDate(allTrades[0].tx_date);
  const spyEntryPx = spyPrices.length
    ? priceOnOrBefore(spyPrices, firstTradeDate)
    : null;
  const benchmarkShares =
    spyEntryPx && spyEntryPx > 0 ? amountUsd / spyEntryPx : 0;

  const timeline: SimulationTimelinePoint[] = [];
  let monthIndex = 0;

  const pushMonthSnapshot = (asOf: Date) => {
    while (monthIndex < monthKeys.length) {
      const monthEnd = new Date(`${monthKeys[monthIndex]}-15T12:00:00`);
      if (monthEnd > asOf) break;
      const portfolioValueUsd = markPortfolioValue(
        holdings,
        cashUsd,
        pricesBySymbol,
        monthEnd,
      );
      const spyPx = spyPrices.length
        ? priceOnOrBefore(spyPrices, monthEnd)
        : null;
      const benchmarkValueUsd =
        benchmarkShares > 0 && spyPx != null
          ? benchmarkShares * spyPx
          : amountUsd;
      timeline.push({
        date: `${monthKeys[monthIndex]}-01`,
        portfolioValueUsd: round1(portfolioValueUsd),
        benchmarkValueUsd: round1(benchmarkValueUsd),
      });
      monthIndex++;
    }
  };

  if (!useEstimatedTimeline) {
    pushMonthSnapshot(periodStart);
  }

  for (const t of actionableTrades) {
    const sym = normalizeTicker(t.issuer_ticker)!;
    const txDate = parseTradeDate(t.tx_date);
    const w = sizeWeight(t.size_label);
    const type = t.tx_type.toLowerCase();
    const series = pricesBySymbol.get(sym);
    const yahooPx =
      series && series.length > 0 ? priceOnOrBefore(series, txDate) : null;
    const px = executionPrice(t, sym, txDate, pricesBySymbol);
    const usedDisclosurePrice =
      px != null &&
      px > 0 &&
      (yahooPx == null || yahooPx <= 0) &&
      t.price != null &&
      t.price > 0;

    if (type === "buy") {
      const investUsd = amountUsd * (w / totalBuyWeight);
      const remaining = amountUsd - deployedUsd;
      const actualInvest = Math.min(investUsd, remaining, cashUsd);

      if (actualInvest <= 0 || px == null || px <= 0) {
        tradesSkipped++;
        tradeSummaries.push({
          txDate: t.tx_date,
          ticker: sym,
          txType: t.tx_type,
          applied: false,
          reason:
            actualInvest <= 0
              ? "Capital fully deployed"
              : "No Yahoo or disclosure price",
        });
        continue;
      }

      const shares = actualInvest / px;
      const lot = holdings.get(sym) ?? { shares: 0, costBasis: 0 };
      lot.shares += shares;
      lot.costBasis += actualInvest;
      holdings.set(sym, lot);
      cashUsd -= actualInvest;
      deployedUsd += actualInvest;
      tradesApplied++;
      tradeSummaries.push({
        txDate: t.tx_date,
        ticker: sym,
        txType: t.tx_type,
        applied: true,
        reason: usedDisclosurePrice ? "Disclosure price" : undefined,
      });
    } else if (type === "sell") {
      const lot = holdings.get(sym);
      if (!lot || lot.shares <= 0) {
        tradesSkipped++;
        tradeSummaries.push({
          txDate: t.tx_date,
          ticker: sym,
          txType: t.tx_type,
          applied: false,
          reason: "No position to sell",
        });
        continue;
      }

      const politicianW = politicianWeightAtDate(allTrades, sym, txDate);
      const sellFraction =
        politicianW > 0 ? Math.min(1, w / politicianW) : 1;
      const sharesToSell = lot.shares * sellFraction;

      if (sharesToSell <= 0) {
        tradesSkipped++;
        tradeSummaries.push({
          txDate: t.tx_date,
          ticker: sym,
          txType: t.tx_type,
          applied: false,
          reason: "Sell weight exceeds position",
        });
        continue;
      }

      const sellPx = px ?? (lot.costBasis / lot.shares);
      const proceeds = sharesToSell * sellPx;
      const costRemoved = (lot.costBasis / lot.shares) * sharesToSell;
      lot.shares -= sharesToSell;
      lot.costBasis -= costRemoved;
      if (lot.shares < 1e-9) {
        holdings.delete(sym);
      } else {
        holdings.set(sym, lot);
      }
      cashUsd += proceeds;
      tradesApplied++;
      tradeSummaries.push({
        txDate: t.tx_date,
        ticker: sym,
        txType: t.tx_type,
        applied: true,
        reason: usedDisclosurePrice ? "Disclosure price" : undefined,
      });
    }

    if (!useEstimatedTimeline) {
      pushMonthSnapshot(txDate);
    }
  }

  if (!useEstimatedTimeline) {
    pushMonthSnapshot(periodEnd);
  }

  let finalTimeline = timeline;
  let currentValueUsd =
    timeline[timeline.length - 1]?.portfolioValueUsd ??
    markPortfolioValue(holdings, cashUsd, pricesBySymbol, periodEnd);
  let benchmarkValueUsd =
    timeline[timeline.length - 1]?.benchmarkValueUsd ?? amountUsd;

  if (useEstimatedTimeline) {
    finalTimeline = buildEstimatedTimeline(
      amountUsd,
      monthKeys,
      allTrades,
      spyPrices,
    );
    const last = finalTimeline[finalTimeline.length - 1];
    currentValueUsd = last?.portfolioValueUsd ?? amountUsd;
    benchmarkValueUsd = last?.benchmarkValueUsd ?? amountUsd;
    if (!warnings.some((w) => w.includes("estimated"))) {
      warnings.push(
        "Portfolio curve estimated from disclosures; trade replay used disclosure prices where available.",
      );
    }
  }

  const totalReturnPct = returnPctFrom(amountUsd, currentValueUsd);
  const benchmarkReturnPct = returnPctFrom(amountUsd, benchmarkValueUsd);

  const dataSource: DataSource = useEstimatedTimeline
    ? "estimated"
    : yahooBlocked || tradesSkipped > 0
      ? "partial"
      : "yahoo-finance2";

  const data: PoliticianSimulationResult = {
    initialAmountUsd: amountUsd,
    currentValueUsd: round1(currentValueUsd),
    totalReturnPct,
    benchmarkValueUsd: round1(benchmarkValueUsd),
    benchmarkReturnPct,
    outperformancePct: round1(totalReturnPct - benchmarkReturnPct),
    timeline: finalTimeline,
    tradesApplied,
    tradesSkipped,
    tradeSummaries: tradeSummaries.slice(0, 20),
    dataSource,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };

  simCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

function returnPctFrom(initial: number, current: number): number {
  if (initial <= 0) return 0;
  return round1(((current - initial) / initial) * 100);
}
