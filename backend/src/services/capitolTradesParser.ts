import type {
  ParsedArticle,
  ParsedIssuer,
  ParsedPoliticianPage,
  ParsedPoliticianProfile,
  ParsedStatsSnapshot,
  ParsedTrade,
} from "../types";
import {
  extractJsonArrayAfterKey,
  extractNextFlightPayloads,
  findChunkPayload,
  parseMoneyToUsd,
} from "./capitolTradesUtils";

const CAPITOL_BASE = "https://www.capitoltrades.com";

interface RawTradeRow {
  _txId: number;
  _issuerId: number;
  _politicianId: string;
  txDate: string;
  pubDate?: string;
  reportingGap?: number;
  txType: string;
  value?: number | null;
  owner?: string | null;
  price?: number | null;
  comment?: string | null;
  issuer: {
    issuerName: string;
    issuerTicker?: string | null;
    sector?: string | null;
    country?: string | null;
  };
  politician?: {
    firstName?: string;
    lastName?: string;
  };
}

export function parsePoliticianHtml(
  html: string,
  politicianId: string,
): ParsedPoliticianPage {
  const flight = extractNextFlightPayloads(html);
  const trades = extractTrades(flight);
  const { totalCount, totalPages } = extractPagination(flight);
  const profile = extractProfile(flight, politicianId, html);
  const stats = extractStats(flight);
  const articles = extractArticles(flight, html);

  return {
    profile,
    trades,
    stats,
    articles,
    totalCount,
    totalPages,
  };
}

function extractTrades(flight: string): ParsedTrade[] {
  const rawTrades: RawTradeRow[] = [];
  let searchFrom = 0;

  while (true) {
    const dataIdx = flight.indexOf('"data":[', searchFrom);
    if (dataIdx === -1) break;
    const arrStart = dataIdx + '"data":'.length;
    const jsonStr = extractBalancedFrom(flight, arrStart);
    searchFrom = arrStart + 1;
    if (!jsonStr) continue;
    try {
      const arr = JSON.parse(jsonStr) as unknown[];
      if (
        Array.isArray(arr) &&
        arr.length > 0 &&
        typeof arr[0] === "object" &&
        arr[0] !== null &&
        "_txId" in (arr[0] as object)
      ) {
        rawTrades.push(...(arr as RawTradeRow[]));
      }
    } catch {
      /* try next */
    }
  }

  const byId = new Map<number, ParsedTrade>();
  for (const row of rawTrades) {
    const issuer: ParsedIssuer = {
      id: row._issuerId,
      name: row.issuer.issuerName,
      ticker: row.issuer.issuerTicker ?? null,
      sector: row.issuer.sector ?? null,
      country: row.issuer.country ?? null,
    };
    byId.set(row._txId, {
      id: row._txId,
      politicianId: row._politicianId,
      issuerId: row._issuerId,
      txDate: row.txDate,
      pubDate: row.pubDate ?? null,
      reportingGapDays: row.reportingGap ?? null,
      txType: row.txType,
      valueUsd: row.value ?? null,
      owner: row.owner ?? null,
      price: row.price ?? null,
      comment: row.comment ?? null,
      issuer,
    });
  }

  return Array.from(byId.values());
}

function extractBalancedFrom(text: string, start: number): string | null {
  const open = text[start];
  if (open !== "[" && open !== "{") return null;
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractPagination(flight: string): {
  totalCount: number;
  totalPages: number;
} {
  const tcMatch = flight.match(/"totalCount":(\d+)/);
  const tpMatch = flight.match(/"totalPages":(\d+)/);
  return {
    totalCount: tcMatch ? parseInt(tcMatch[1], 10) : 0,
    totalPages: tpMatch ? parseInt(tpMatch[1], 10) : 1,
  };
}

interface HtmlProfileFields {
  tradeCount: number | null;
  issuerCount: number | null;
  volumeUsd: number | null;
  lastTraded: string | null;
  district: string | null;
  dob: string | null;
  yearsActive: string | null;
  age: number | null;
  socialLinks: Record<string, string>;
}

function extractProfileFromHtml(html: string): HtmlProfileFields {
  const card =
    html.match(
      /politician-detail-card[\s\S]*?politician-detail-card-footer[\s\S]*?<\/footer>/i,
    )?.[0] ?? html;

  const stat = (label: string): string | null => {
    const pairRegex =
      /order-1[^>]*>\s*([^<]+?)\s*<\/span\s*>[\s\S]*?order-2[^>]*>\s*([^<]+?)\s*<\/span\s*>/gi;
    const target = label.toLowerCase();
    let m: RegExpExecArray | null;
    while ((m = pairRegex.exec(card)) !== null) {
      const lbl = m[2].trim().toLowerCase();
      if (lbl === target.toLowerCase()) {
        return m[1].trim().replace(/\$/g, "");
      }
    }
    return null;
  };

  const parseCount = (label: string): number | null => {
    const raw = stat(label);
    if (!raw) return null;
    const n = parseInt(raw.replace(/,/g, ""), 10);
    return Number.isNaN(n) ? null : n;
  };

  const volumeRaw = stat("Volume");
  const volumeUsd = volumeRaw
    ? parseMoneyToUsd(volumeRaw.startsWith("$") ? volumeRaw : `$${volumeRaw}`)
    : null;

  const ageRaw = stat("Age");
  const age = ageRaw ? parseInt(ageRaw, 10) : null;

  return {
    tradeCount: parseCount("Trades"),
    issuerCount: parseCount("Issuers"),
    volumeUsd,
    lastTraded: stat("Last Traded"),
    district: stat("District"),
    dob: stat("Date of Birth"),
    yearsActive: stat("Years Active"),
    age: age != null && !Number.isNaN(age) ? age : null,
    socialLinks: extractSocialLinksFromHtml(card),
  };
}

function extractSocialLinksFromHtml(cardHtml: string): Record<string, string> {
  const links: Record<string, string> = {};
  const footer =
    cardHtml.match(/cell--social-media-links[\s\S]*?<\/footer/i)?.[0] ??
    cardHtml;

  const anchorRegex =
    /<a\s+[\s\S]*?href="(https:\/\/[^"]+)"[\s\S]*?aria-label="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(footer)) !== null) {
    const url = m[1];
    const label = m[2].toLowerCase();

    if (label.includes("official website")) links.website = url;
    else if (label.includes("youtube")) links.youtube = url;
    else if (label.includes("facebook")) links.facebook = url;
    else if (label.includes("twitter")) links.twitter = url;
  }

  return links;
}

function extractProfile(
  flight: string,
  politicianId: string,
  html: string,
): ParsedPoliticianProfile {
  const chunk7 = findChunkPayload(flight, "7:") ?? flight;
  const fromHtml = extractProfileFromHtml(html);
  const entityMatch = chunk7.match(/"entityId":"([^"]+)"/);
  const id = entityMatch?.[1] ?? politicianId;

  const displayName =
    matchFirst(html, /<h1>([^<]+)<\/h1>/) ??
    matchFirst(chunk7, /"children":"([^"]+)"[^}]*\}[^]]*\],\[\"\$\",\"h1\"/) ??
    "Unknown";

  const party = html.includes("party--democrat")
    ? "democrat"
    : html.includes("party--republican")
      ? "republican"
      : null;

  const chamber = html.includes("chamber--house")
    ? "house"
    : html.includes("chamber--senate")
      ? "senate"
      : null;

  const stateMatch =
    html.match(/us-state-full--([a-z]{2})/) ??
    chunk7.match(/us-state-full--([a-z]{2})/);
  const state = stateMatch?.[1]?.toUpperCase() ?? null;

  let photoUrl: string | null = null;
  const htmlPhoto = html.match(/\/assets\/politicians\/(p[0-9]+\.jpg)/i);
  if (htmlPhoto) {
    photoUrl = `${CAPITOL_BASE}/assets/politicians/${htmlPhoto[1]}`;
  } else {
    const chunkPhoto = chunk7.match(/"src":"(\/assets\/politicians\/[^"]+)"/);
    if (chunkPhoto) photoUrl = `${CAPITOL_BASE}${chunkPhoto[1]}`;
  }

  const firstName =
    matchFirst(chunk7, /"firstName":"([^"]+)"/) ??
    displayName.split(" ")[0] ??
    null;
  const lastName =
    matchFirst(chunk7, /"lastName":"([^"]+)"/) ??
    (displayName.split(" ").slice(1).join(" ") || null);

  return {
    id,
    firstName,
    lastName,
    displayName,
    party,
    chamber,
    state,
    photoUrl,
    tradeCount: fromHtml.tradeCount,
    issuerCount: fromHtml.issuerCount,
    volumeUsd: fromHtml.volumeUsd,
    lastTraded: fromHtml.lastTraded,
    district: fromHtml.district,
    dob: fromHtml.dob,
    yearsActive: fromHtml.yearsActive,
    age: fromHtml.age,
    socialLinks: fromHtml.socialLinks,
  };
}

function extractStats(flight: string): ParsedStatsSnapshot | null {
  const chunk21 = findChunkPayload(flight, "21:");
  if (!chunk21) return null;

  const tradeCount = extractExplorerStat(chunk21, "Trades") ?? 0;
  const filingCount = extractExplorerStat(chunk21, "Filings") ?? 0;
  const volumeText = extractExplorerMoney(chunk21, "Volume");
  const volumeUsd = volumeText ? parseMoneyToUsd(volumeText) ?? 0 : 0;
  const issuerCount = extractExplorerStat(chunk21, "Issuers") ?? 0;

  const chunk23 = findChunkPayload(flight, "23:");
  const chunk24 = findChunkPayload(flight, "24:");

  const mostTradedIssuers = chunk23
    ? parsePieData(chunk23)
    : [];
  const mostTradedSectors = chunk24
    ? parsePieData(chunk24).map((d) => ({
        sector: formatSectorLabel(d.name),
        count: d.count,
      }))
    : [];

  return {
    tradeCount,
    filingCount,
    volumeUsd,
    issuerCount,
    mostTradedIssuers,
    mostTradedSectors,
    period: "3Y",
  };
}

function parsePieData(chunk: string): { name: string; count: number }[] {
  const data = extractJsonArrayAfterKey(chunk, '"data":');
  if (!data) return [];
  return data
    .filter(
      (item): item is { name: string; value: number } =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "value" in item,
    )
    .filter((item) => item.name !== "other")
    .map((item) => ({
      name: item.name === "other" ? "Other" : item.name,
      count: item.value,
    }));
}

function formatSectorLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractArticles(flight: string, html: string): ParsedArticle[] {
  const chunk = findChunkPayload(flight, "1d:");
  if (!chunk) return extractArticlesFromHtml(html);

  const articles: ParsedArticle[] = [];
  const titleDateRegex =
    /"children":"(\d{4}-\d{2}-\d{2})"[^}]*"children":"([^"]{8,200})"/g;
  const hrefRegex = /"href":"(\/(?:articles|buzz)\/[^"]+)"/g;

  const hrefs: string[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = hrefRegex.exec(chunk)) !== null) {
    hrefs.push(hm[1]);
  }

  const entries: { date: string; title: string }[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = titleDateRegex.exec(chunk)) !== null) {
    entries.push({ date: tm[1], title: tm[2] });
  }

  for (let i = 0; i < Math.min(hrefs.length, entries.length); i++) {
    const href = hrefs[i];
    const { date, title } = entries[i];
    articles.push({
      slug: href.split("/").pop() ?? href,
      title,
      publishedAt: date,
      href,
    });
  }

  return articles.length > 0 ? articles : extractArticlesFromHtml(html);
}

function extractArticlesFromHtml(html: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  const itemRegex =
    /href="(\/(?:articles|buzz)\/[^"]+)"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2})[\s\S]*?<h3[^>]*>([^<]+)</g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(html)) !== null) {
    articles.push({
      slug: m[1].split("/").pop() ?? m[1],
      title: m[3].trim(),
      publishedAt: m[2],
      href: m[1],
    });
  }
  return articles;
}

function matchFirst(text: string, regex: RegExp): string | null {
  const m = text.match(regex);
  return m?.[1] ?? null;
}

function extractSidebarStat(
  chunk: string,
  label: string,
): number | null {
  const regex = new RegExp(
    `"children":(\\d+)[\\s\\S]*?"children":"${label}"`,
  );
  const m = chunk.match(regex);
  return m ? parseInt(m[1], 10) : null;
}

function extractSidebarString(chunk: string, label: string): string | null {
  const regex = new RegExp(
    `"children":"([^"]+)"[^}]*"children":"${label}"`,
  );
  const m = chunk.match(regex);
  return m?.[1] ?? null;
}

function extractSidebarMoney(chunk: string, label: string): string | null {
  const regex = new RegExp(
    `"children":"(\\$[^"]*)"[\\s\\S]*?"children":"${label}"`,
  );
  const m = chunk.match(regex);
  return m?.[1]?.replace(/\$\$/g, "$") ?? null;
}

function extractSidebarDate(chunk: string, label: string): string | null {
  const regex = new RegExp(
    `"children":"(\\d{4}-\\d{2}-\\d{2})"[^}]*"children":"${label}"`,
  );
  const m = chunk.match(regex);
  return m?.[1] ?? null;
}

function extractExplorerStat(chunk: string, label: string): number | null {
  const labelIdx = chunk.indexOf(`"children":"${label}"`);
  if (labelIdx === -1) return null;
  const before = chunk.slice(Math.max(0, labelIdx - 500), labelIdx);
  const matches = [...before.matchAll(/"children":(\d+)/g)];
  if (matches.length === 0) return null;
  return parseInt(matches[matches.length - 1][1], 10);
}

function extractExplorerMoney(chunk: string, label: string): string | null {
  const regex = new RegExp(
    `"children":"(\\$[^"]*)"[\\s\\S]*?"children":"${label}"`,
  );
  const m = chunk.match(regex);
  if (!m) return null;
  return m[1].replace(/\$\$/g, "$");
}
