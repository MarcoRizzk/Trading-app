import { db } from "./database";
import type {
  ParsedArticle,
  ParsedIssuer,
  ParsedPoliticianProfile,
  ParsedStatsSnapshot,
  ParsedTrade,
  PoliticianRow,
  TradeRow,
} from "../types";

const CAPITOL_BASE = "https://www.capitoltrades.com";

export function upsertPolitician(
  profile: ParsedPoliticianProfile,
  politicianId: string,
): void {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO politicians (
      id, first_name, last_name, display_name, party, chamber, state,
      photo_url, trade_count, issuer_count, volume_usd, last_traded,
      district, dob, years_active, age, social_links, source_url, scraped_at, updated_at
    ) VALUES (
      @id, @firstName, @lastName, @displayName, @party, @chamber, @state,
      @photoUrl, @tradeCount, @issuerCount, @volumeUsd, @lastTraded,
      @district, @dob, @yearsActive, @age, @socialLinks, @sourceUrl, @scrapedAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      display_name = excluded.display_name,
      party = excluded.party,
      chamber = excluded.chamber,
      state = excluded.state,
      photo_url = excluded.photo_url,
      trade_count = excluded.trade_count,
      issuer_count = excluded.issuer_count,
      volume_usd = excluded.volume_usd,
      last_traded = excluded.last_traded,
      district = excluded.district,
      dob = excluded.dob,
      years_active = excluded.years_active,
      age = excluded.age,
      social_links = excluded.social_links,
      source_url = excluded.source_url,
      scraped_at = excluded.scraped_at,
      updated_at = excluded.updated_at
  `,
  ).run({
    id: politicianId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    party: profile.party,
    chamber: profile.chamber,
    state: profile.state,
    photoUrl: profile.photoUrl,
    tradeCount: profile.tradeCount,
    issuerCount: profile.issuerCount,
    volumeUsd: profile.volumeUsd,
    lastTraded: profile.lastTraded,
    district: profile.district,
    dob: profile.dob,
    yearsActive: profile.yearsActive,
    age: profile.age,
    socialLinks: JSON.stringify(profile.socialLinks),
    sourceUrl: `${CAPITOL_BASE}/politicians/${politicianId}`,
    scrapedAt: now,
    updatedAt: now,
  });
}

export function upsertIssuer(issuer: ParsedIssuer): void {
  db.prepare(
    `
    INSERT INTO issuers (id, name, ticker, sector, country, updated_at)
    VALUES (@id, @name, @ticker, @sector, @country, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      ticker = excluded.ticker,
      sector = excluded.sector,
      country = excluded.country,
      updated_at = datetime('now')
  `,
  ).run({
    id: issuer.id,
    name: issuer.name,
    ticker: issuer.ticker,
    sector: issuer.sector,
    country: issuer.country,
  });
}

export function upsertTrade(trade: ParsedTrade, sizeLabel: string): void {
  const existing = db
    .prepare("SELECT first_seen_at FROM trades WHERE id = ?")
    .get(trade.id) as { first_seen_at: string } | undefined;

  const firstSeen = existing?.first_seen_at ?? new Date().toISOString();

  db.prepare(
    `
    INSERT INTO trades (
      id, politician_id, issuer_id, tx_date, pub_date, reporting_gap_days,
      tx_type, size_label, value_usd, owner, price, comment, source_trade_url,
      first_seen_at, updated_at
    ) VALUES (
      @id, @politicianId, @issuerId, @txDate, @pubDate, @reportingGapDays,
      @txType, @sizeLabel, @valueUsd, @owner, @price, @comment, @sourceTradeUrl,
      @firstSeenAt, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      politician_id = excluded.politician_id,
      issuer_id = excluded.issuer_id,
      tx_date = excluded.tx_date,
      pub_date = excluded.pub_date,
      reporting_gap_days = excluded.reporting_gap_days,
      tx_type = excluded.tx_type,
      size_label = excluded.size_label,
      value_usd = excluded.value_usd,
      owner = excluded.owner,
      price = excluded.price,
      comment = excluded.comment,
      source_trade_url = excluded.source_trade_url,
      updated_at = datetime('now')
  `,
  ).run({
    id: trade.id,
    politicianId: trade.politicianId,
    issuerId: trade.issuerId,
    txDate: trade.txDate,
    pubDate: trade.pubDate,
    reportingGapDays: trade.reportingGapDays,
    txType: trade.txType,
    sizeLabel,
    valueUsd: trade.valueUsd,
    owner: trade.owner,
    price: trade.price,
    comment: trade.comment,
    sourceTradeUrl: `${CAPITOL_BASE}/trades/${trade.id}`,
    firstSeenAt: firstSeen,
  });
}

export function upsertStatsSnapshot(
  politicianId: string,
  stats: ParsedStatsSnapshot,
): void {
  db.prepare(
    `
    INSERT INTO politician_stats_snapshot (
      politician_id, period, trade_count, filing_count, volume_usd, issuer_count,
      most_traded_issuers, most_traded_sectors, scraped_at
    ) VALUES (
      @politicianId, @period, @tradeCount, @filingCount, @volumeUsd, @issuerCount,
      @mostTradedIssuers, @mostTradedSectors, @scrapedAt
    )
    ON CONFLICT(politician_id, period) DO UPDATE SET
      trade_count = excluded.trade_count,
      filing_count = excluded.filing_count,
      volume_usd = excluded.volume_usd,
      issuer_count = excluded.issuer_count,
      most_traded_issuers = excluded.most_traded_issuers,
      most_traded_sectors = excluded.most_traded_sectors,
      scraped_at = excluded.scraped_at
  `,
  ).run({
    politicianId,
    period: stats.period,
    tradeCount: stats.tradeCount,
    filingCount: stats.filingCount,
    volumeUsd: stats.volumeUsd,
    issuerCount: stats.issuerCount,
    mostTradedIssuers: JSON.stringify(stats.mostTradedIssuers),
    mostTradedSectors: JSON.stringify(stats.mostTradedSectors),
    scrapedAt: new Date().toISOString(),
  });
}

export function replaceArticles(
  politicianId: string,
  articles: ParsedArticle[],
): void {
  const deleteStmt = db.prepare(
    "DELETE FROM related_articles WHERE politician_id = ?",
  );
  const insertStmt = db.prepare(
    `
    INSERT INTO related_articles (politician_id, slug, title, published_at, href, scraped_at)
    VALUES (@politicianId, @slug, @title, @publishedAt, @href, @scrapedAt)
  `,
  );

  const scrapedAt = new Date().toISOString();
  const tx = db.transaction(() => {
    deleteStmt.run(politicianId);
    for (const article of articles) {
      insertStmt.run({
        politicianId,
        slug: article.slug,
        title: article.title,
        publishedAt: article.publishedAt,
        href: article.href.startsWith("http")
          ? article.href
          : `${CAPITOL_BASE}${article.href}`,
        scrapedAt,
      });
    }
  });
  tx();
}

export function insertScrapeRun(run: {
  politicianId: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  tradesFound: number | null;
  pagesFetched: number | null;
  errorMessage: string | null;
}): number {
  const result = db
    .prepare(
      `
    INSERT INTO scrape_runs (
      politician_id, started_at, finished_at, status,
      trades_found, pages_fetched, error_message
    ) VALUES (
      @politicianId, @startedAt, @finishedAt, @status,
      @tradesFound, @pagesFetched, @errorMessage
    )
  `,
    )
    .run(run);
  return Number(result.lastInsertRowid);
}

export function getAllPoliticians(): PoliticianRow[] {
  return db
    .prepare("SELECT * FROM politicians ORDER BY display_name ASC")
    .all() as PoliticianRow[];
}

export function getPoliticianById(id: string): PoliticianRow | undefined {
  return db.prepare("SELECT * FROM politicians WHERE id = ?").get(id) as
    | PoliticianRow
    | undefined;
}

export function getLatestStats(politicianId: string) {
  return db
    .prepare(
      `
    SELECT * FROM politician_stats_snapshot
    WHERE politician_id = ? AND period = '3Y'
    ORDER BY scraped_at DESC LIMIT 1
  `,
    )
    .get(politicianId) as
    | {
        trade_count: number;
        filing_count: number;
        volume_usd: number;
        issuer_count: number;
        most_traded_issuers: string;
        most_traded_sectors: string;
        period: string;
        scraped_at: string;
      }
    | undefined;
}

export function getArticles(politicianId: string) {
  return db
    .prepare(
      `
    SELECT slug, title, published_at, href
    FROM related_articles
    WHERE politician_id = ?
    ORDER BY published_at DESC
  `,
    )
    .all(politicianId) as {
    slug: string;
    title: string;
    published_at: string | null;
    href: string;
  }[];
}

export function getAllTradesForPolitician(politicianId: string): TradeRow[] {
  return db
    .prepare(
      `
    SELECT t.*, i.name as issuer_name, i.ticker as issuer_ticker
    FROM trades t
    JOIN issuers i ON i.id = t.issuer_id
    WHERE t.politician_id = ?
    ORDER BY t.tx_date ASC, t.id ASC
  `,
    )
    .all(politicianId) as TradeRow[];
}

export function getTradesPaginated(
  politicianId: string,
  page: number,
  pageSize: number,
): { trades: TradeRow[]; totalCount: number } {
  const countRow = db
    .prepare("SELECT COUNT(*) as cnt FROM trades WHERE politician_id = ?")
    .get(politicianId) as { cnt: number };

  const offset = (page - 1) * pageSize;
  const trades = db
    .prepare(
      `
    SELECT t.*, i.name as issuer_name, i.ticker as issuer_ticker
    FROM trades t
    JOIN issuers i ON i.id = t.issuer_id
    WHERE t.politician_id = ?
    ORDER BY t.tx_date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `,
    )
    .all(politicianId, pageSize, offset) as TradeRow[];

  return { trades, totalCount: countRow.cnt };
}
