import { db } from "./database";

export function initPoliticianTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS politicians (
      id              TEXT PRIMARY KEY,
      first_name      TEXT,
      last_name       TEXT,
      display_name    TEXT NOT NULL,
      party           TEXT,
      chamber         TEXT,
      state           TEXT,
      photo_url       TEXT,
      trade_count     INTEGER,
      issuer_count    INTEGER,
      volume_usd      REAL,
      last_traded     TEXT,
      district        TEXT,
      dob             TEXT,
      years_active    TEXT,
      age             INTEGER,
      social_links    TEXT,
      source_url      TEXT,
      scraped_at      TEXT,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS issuers (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      ticker      TEXT,
      sector      TEXT,
      country     TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trades (
      id                  INTEGER PRIMARY KEY,
      politician_id       TEXT NOT NULL REFERENCES politicians(id),
      issuer_id           INTEGER NOT NULL REFERENCES issuers(id),
      tx_date             TEXT NOT NULL,
      pub_date            TEXT,
      reporting_gap_days  INTEGER,
      tx_type             TEXT NOT NULL,
      size_label          TEXT,
      value_usd           REAL,
      owner               TEXT,
      price               REAL,
      comment             TEXT,
      source_trade_url    TEXT,
      first_seen_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS politician_stats_snapshot (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      politician_id         TEXT NOT NULL REFERENCES politicians(id),
      period                TEXT NOT NULL DEFAULT '3Y',
      trade_count           INTEGER,
      filing_count          INTEGER,
      volume_usd            REAL,
      issuer_count          INTEGER,
      most_traded_issuers   TEXT,
      most_traded_sectors   TEXT,
      scraped_at            TEXT NOT NULL,
      UNIQUE(politician_id, period)
    );

    CREATE TABLE IF NOT EXISTS related_articles (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      politician_id   TEXT NOT NULL REFERENCES politicians(id),
      slug            TEXT NOT NULL,
      title           TEXT NOT NULL,
      published_at    TEXT,
      href            TEXT NOT NULL,
      scraped_at      TEXT NOT NULL,
      UNIQUE(politician_id, slug)
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      politician_id   TEXT NOT NULL,
      started_at      TEXT NOT NULL,
      finished_at     TEXT,
      status          TEXT NOT NULL,
      trades_found    INTEGER,
      pages_fetched   INTEGER,
      error_message   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_trades_politician ON trades(politician_id);
    CREATE INDEX IF NOT EXISTS idx_trades_tx_date ON trades(tx_date DESC);
  `);

  try {
    db.exec(`ALTER TABLE politicians ADD COLUMN age INTEGER`);
  } catch {
    /* column already exists */
  }
}
