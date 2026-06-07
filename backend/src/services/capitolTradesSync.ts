import fs from "fs";
import path from "path";
import { parsePoliticianHtml } from "./capitolTradesParser";
import { valueToSizeLabel } from "./capitolTradesUtils";
import type { ParsedPoliticianPage } from "../types";
import {
  insertScrapeRun,
  replaceArticles,
  upsertIssuer,
  upsertPolitician,
  upsertStatsSnapshot,
  upsertTrade,
} from "../db/politicianRepository";

const CAPITOL_BASE = "https://www.capitoltrades.com";
const USER_AGENT = "InvestWhatInterview/1.0 (educational; daily sync)";
const PAGE_DELAY_MS = 1500;

export function getPoliticianIds(): string[] {
  const raw = process.env.POLITICIAN_IDS ?? "P000197";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function fetchPoliticianPage(
  politicianId: string,
  page: number,
): Promise<string> {
  const url =
    page <= 1
      ? `${CAPITOL_BASE}/politicians/${politicianId}`
      : `${CAPITOL_BASE}/politicians/${politicianId}?page=${page}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  return res.text();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncPolitician(politicianId: string): Promise<{
  tradesFound: number;
  pagesFetched: number;
}> {
  const startedAt = new Date().toISOString();
  let pagesFetched = 0;
  const allTrades = new Map<number, ParsedPoliticianPage["trades"][0]>();
  let mergedPage: ParsedPoliticianPage | null = null;

  try {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const html = await fetchPoliticianPage(politicianId, page);
      pagesFetched++;

      const parsed = parsePoliticianHtml(html, politicianId);
      if (!mergedPage) {
        mergedPage = parsed;
        totalPages = Math.max(parsed.totalPages, 1);
      } else {
        totalPages = Math.max(totalPages, parsed.totalPages);
      }

      for (const trade of parsed.trades) {
        allTrades.set(trade.id, trade);
      }

      if (page >= totalPages) break;
      page++;
      await delay(PAGE_DELAY_MS);
    }

    if (!mergedPage) {
      throw new Error("No data parsed from politician pages");
    }

    const trades = Array.from(allTrades.values());
    persistPoliticianData(politicianId, mergedPage, trades);

    insertScrapeRun({
      politicianId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "success",
      tradesFound: trades.length,
      pagesFetched,
      errorMessage: null,
    });

    return { tradesFound: trades.length, pagesFetched };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    insertScrapeRun({
      politicianId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "error",
      tradesFound: allTrades.size || null,
      pagesFetched,
      errorMessage: message,
    });
    throw err;
  }
}

function persistPoliticianData(
  politicianId: string,
  page: ParsedPoliticianPage,
  trades: ParsedPoliticianPage["trades"],
): void {
  upsertPolitician(page.profile, politicianId);

  const issuersSeen = new Set<number>();
  for (const trade of trades) {
    if (!issuersSeen.has(trade.issuer.id)) {
      upsertIssuer(trade.issuer);
      issuersSeen.add(trade.issuer.id);
    }
    upsertTrade(trade, valueToSizeLabel(trade.valueUsd));
  }

  if (page.stats) {
    upsertStatsSnapshot(politicianId, page.stats);
  }

  if (page.articles.length > 0) {
    replaceArticles(politicianId, page.articles);
  }
}

export async function syncAllPoliticians(): Promise<void> {
  const ids = getPoliticianIds();
  for (const id of ids) {
    console.log(`[sync] Starting ${id}...`);
    const result = await syncPolitician(id);
    console.log(
      `[sync] ${id}: ${result.tradesFound} trades from ${result.pagesFetched} page(s)`,
    );
    await delay(PAGE_DELAY_MS);
  }
}

export function loadFixtureHtml(fixturePath: string): string {
  return fs.readFileSync(fixturePath, "utf-8");
}

export function syncFromFixture(
  politicianId: string,
  html: string,
): { tradesFound: number } {
  const parsed = parsePoliticianHtml(html, politicianId);
  persistPoliticianData(politicianId, parsed, parsed.trades);
  return { tradesFound: parsed.trades.length };
}

export function getFixturePath(): string {
  return path.join(__dirname, "../../../example .html");
}
