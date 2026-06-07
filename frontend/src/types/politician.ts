export interface PoliticianSummary {
  id: string;
  display_name: string;
  party: string | null;
  chamber: string | null;
  state: string | null;
  photo_url: string | null;
  trade_count: number | null;
  volume_usd: number | null;
  last_traded: string | null;
  scraped_at: string | null;
}

export interface PoliticianTrade {
  id: number;
  politician_id: string;
  issuer_id: number;
  tx_date: string;
  pub_date: string | null;
  reporting_gap_days: number | null;
  tx_type: string;
  size_label: string | null;
  value_usd: number | null;
  issuer_name?: string;
  issuer_ticker?: string | null;
  source_trade_url?: string | null;
}

export interface PoliticianProfileResponse {
  politician: PoliticianSummary & {
    first_name: string | null;
    last_name: string | null;
    issuer_count: number | null;
    district: string | null;
    dob: string | null;
    years_active: string | null;
    age: number | null;
    social_links: Record<string, string> | string | null;
    source_url: string | null;
    updated_at: string;
  };
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
  trades: PoliticianTrade[];
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
