import { Router } from "express";
import {
  getAllPoliticians,
  getArticles,
  getLatestStats,
  getPoliticianById,
  getTradesPaginated,
} from "../db/politicianRepository";
import { syncPolitician } from "../services/capitolTradesSync";
import {
  buildPoliticianChart,
  type ChartPeriod,
} from "../services/portfolioChartService";
import { runPoliticianSimulation } from "../services/portfolioSimulationService";

const router = Router();

const MIN_SIM_AMOUNT = 100;
const MAX_SIM_AMOUNT = 10_000_000;
const DEFAULT_SIM_AMOUNT = 10_000;

const CHART_PERIODS = new Set<ChartPeriod>(["1M", "3M", "6M", "1Y", "3Y"]);

router.get("/", (_req, res) => {
  const politicians = getAllPoliticians();
  res.json(politicians);
});

router.get("/:id/simulate", async (req, res) => {
  const { id } = req.params;
  const amountRaw = parseFloat(String(req.query.amount ?? DEFAULT_SIM_AMOUNT));
  const amountUsd = Number.isFinite(amountRaw)
    ? Math.min(MAX_SIM_AMOUNT, Math.max(MIN_SIM_AMOUNT, amountRaw))
    : DEFAULT_SIM_AMOUNT;

  const politician = getPoliticianById(id);
  if (!politician) {
    res.status(404).json({ error: `Politician ${id} not found` });
    return;
  }

  try {
    const result = await runPoliticianSimulation(id, amountUsd);
    res.json(result);
  } catch (err) {
    console.error("[simulate] build failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({
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
      warning: `Simulation could not be built: ${message}. Try again in a few minutes.`,
    });
  }
});

router.get("/:id/chart", async (req, res) => {
  const { id } = req.params;
  const periodRaw = String(req.query.period ?? "3Y").toUpperCase();
  const period = CHART_PERIODS.has(periodRaw as ChartPeriod)
    ? (periodRaw as ChartPeriod)
    : "3Y";

  const politician = getPoliticianById(id);
  if (!politician) {
    res.status(404).json({ error: `Politician ${id} not found` });
    return;
  }

  try {
    const chart = await buildPoliticianChart(id, period);
    res.json(chart);
  } catch (err) {
    console.error("[chart] build failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({
      period,
      periodLabel: "Performance",
      portfolioReturnPct: 0,
      benchmarkReturnPct: 0,
      outperformancePct: 0,
      quarterLabels: [],
      portfolioLine: [
        { x: 0, y: 70 },
        { x: 100, y: 70 },
      ],
      tradeMarkers: [],
      dataSource: "estimated",
      warning: `Chart could not be built: ${message}. Try again in a few minutes.`,
    });
  }
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.pageSize ?? "12"), 10) || 12),
  );

  const politician = getPoliticianById(id);
  if (!politician) {
    res.status(404).json({ error: `Politician ${id} not found` });
    return;
  }

  const statsRow = getLatestStats(id);
  const { trades, totalCount } = getTradesPaginated(id, page, pageSize);
  const articles = getArticles(id);

  const socialLinks = politician.social_links
    ? (JSON.parse(politician.social_links) as Record<string, string>)
    : {};

  res.json({
    politician: { ...politician, social_links: socialLinks },
    stats: statsRow
      ? {
          tradeCount: statsRow.trade_count,
          filingCount: statsRow.filing_count,
          volumeUsd: statsRow.volume_usd,
          issuerCount: statsRow.issuer_count,
          mostTradedIssuers: JSON.parse(statsRow.most_traded_issuers),
          mostTradedSectors: JSON.parse(statsRow.most_traded_sectors),
          period: statsRow.period,
          scrapedAt: statsRow.scraped_at,
        }
      : null,
    trades,
    articles: articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      publishedAt: a.published_at,
      href: a.href,
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    },
  });
});

router.post("/:id/sync", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await syncPolitician(id);
    res.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
