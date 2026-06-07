export type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "SPLIT"
  | "OPENING_BALANCE";

export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: TransactionType;
  date: string;
  quantity: number;
  unitPrice: number;
  fee: number;
  totalAmount: number;
  createdAt: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
}

export interface FIFOLot {
  txnId: string;
  date: string;
  quantity: number;
  price: number;
  remaining: number;
}

export interface HoldingComputed {
  symbol: string;
  totalQuantity: number;
  averageCost: number;
  totalCost: number;
  realizedGainLoss: number;
  lots: FIFOLot[];
}

export interface CreateTransactionInput {
  symbol: string;
  name: string;
  type: TransactionType;
  date: string;
  quantity: number;
  unitPrice: number;
  fee?: number;
}

export interface ParsedIssuer {
  id: number;
  name: string;
  ticker: string | null;
  sector: string | null;
  country: string | null;
}

export interface ParsedTrade {
  id: number;
  politicianId: string;
  issuerId: number;
  txDate: string;
  pubDate: string | null;
  reportingGapDays: number | null;
  txType: string;
  valueUsd: number | null;
  owner: string | null;
  price: number | null;
  comment: string | null;
  issuer: ParsedIssuer;
}

export interface ParsedPoliticianProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  party: string | null;
  chamber: string | null;
  state: string | null;
  photoUrl: string | null;
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

export interface ParsedStatsSnapshot {
  tradeCount: number;
  filingCount: number;
  volumeUsd: number;
  issuerCount: number;
  mostTradedIssuers: { name: string; count: number }[];
  mostTradedSectors: { sector: string; count: number }[];
  period: string;
}

export interface ParsedArticle {
  slug: string;
  title: string;
  publishedAt: string | null;
  href: string;
}

export interface ParsedPoliticianPage {
  profile: ParsedPoliticianProfile;
  trades: ParsedTrade[];
  stats: ParsedStatsSnapshot | null;
  articles: ParsedArticle[];
  totalCount: number;
  totalPages: number;
}

export interface PoliticianRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  party: string | null;
  chamber: string | null;
  state: string | null;
  photo_url: string | null;
  trade_count: number | null;
  issuer_count: number | null;
  volume_usd: number | null;
  last_traded: string | null;
  district: string | null;
  dob: string | null;
  years_active: string | null;
  age: number | null;
  social_links: string | null;
  source_url: string | null;
  scraped_at: string | null;
  updated_at: string;
}

export interface TradeRow {
  id: number;
  politician_id: string;
  issuer_id: number;
  tx_date: string;
  pub_date: string | null;
  reporting_gap_days: number | null;
  tx_type: string;
  size_label: string | null;
  value_usd: number | null;
  owner: string | null;
  price: number | null;
  comment: string | null;
  source_trade_url: string | null;
  issuer_name?: string;
  issuer_ticker?: string | null;
}

export interface PoliticianProfileResponse {
  politician: PoliticianRow;
  stats: {
    tradeCount: number;
    filingCount: number;
    volumeUsd: number;
    issuerCount: number;
    mostTradedIssuers: { name: string; count: number }[];
    mostTradedSectors: { sector: string; count: number }[];
    period: string;
    scrapedAt: string;
  } | null;
  trades: TradeRow[];
  articles: {
    slug: string;
    title: string;
    publishedAt: string | null;
    href: string;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
