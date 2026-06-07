export type Trade = {
  issuer: string;
  ticker: string;
  published: string;
  traded: string;
  filedAfter: string;
  type: "BUY" | "SELL";
  size: string;
  sizeTier: 1 | 2 | 3;
};

export const politician = {
  name: "Nancy Pelosi",
  party: "Democrat",
  chamber: "House",
  state: "California",
  trades: 44,
  issuers: 18,
  volume: "$97.81M",
  filings: 12,
  lastTraded: "2026-01-16",
};

export const trades: Trade[] = [
  { issuer: "AllianceBernstein Holding LP", ticker: "AB:US", published: "26 Jan 2026", traded: "16 Jan 2026", filedAfter: "7 days", type: "BUY", size: "1M–5M", sizeTier: 3 },
  { issuer: "Alphabet Inc", ticker: "GOOGL:US", published: "26 Jan 2026", traded: "16 Jan 2026", filedAfter: "7 days", type: "BUY", size: "500K–1M", sizeTier: 2 },
  { issuer: "Amazon.com Inc", ticker: "AMZN:US", published: "26 Jan 2026", traded: "16 Jan 2026", filedAfter: "7 days", type: "BUY", size: "500K–1M", sizeTier: 2 },
  { issuer: "Apple Inc", ticker: "AAPL:US", published: "26 Jan 2026", traded: "24 Dec 2025", filedAfter: "30 days", type: "SELL", size: "5M–25M", sizeTier: 3 },
  { issuer: "Apple Inc", ticker: "AAPL:US", published: "26 Jan 2026", traded: "30 Dec 2025", filedAfter: "24 days", type: "BUY", size: "250K–500K", sizeTier: 1 },
  { issuer: "Apple Inc", ticker: "AAPL:US", published: "26 Jan 2026", traded: "30 Dec 2025", filedAfter: "24 days", type: "SELL", size: "5M–25M", sizeTier: 3 },
  { issuer: "NVIDIA Corporation", ticker: "NVDA:US", published: "26 Jan 2026", traded: "30 Dec 2025", filedAfter: "24 days", type: "BUY", size: "100K–250K", sizeTier: 1 },
  { issuer: "NVIDIA Corporation", ticker: "NVDA:US", published: "26 Jan 2026", traded: "24 Dec 2025", filedAfter: "30 days", type: "SELL", size: "1M–5M", sizeTier: 3 },
  { issuer: "NVIDIA Corporation", ticker: "NVDA:US", published: "26 Jan 2026", traded: "16 Jan 2026", filedAfter: "7 days", type: "BUY", size: "250K–500K", sizeTier: 1 },
  { issuer: "PayPal Holdings Inc", ticker: "PYPL:US", published: "26 Jan 2026", traded: "30 Dec 2025", filedAfter: "24 days", type: "SELL", size: "250K–500K", sizeTier: 1 },
  { issuer: "TEMPUS AI INC", ticker: "TEM:US", published: "26 Jan 2026", traded: "16 Jan 2026", filedAfter: "7 days", type: "BUY", size: "50K–100K", sizeTier: 1 },
];

export const topIssuers = [
  { name: "NVIDIA Corporation", count: 9, color: "oklch(0.72 0.16 55)" },
  { name: "Apple Inc", count: 7, color: "oklch(0.65 0.2 350)" },
  { name: "Alphabet Inc", count: 4, color: "oklch(0.72 0.15 165)" },
  { name: "Amazon.com Inc", count: 4, color: "oklch(0.65 0.2 290)" },
  { name: "Other", count: 20, color: "oklch(0.4 0.02 60)" },
];

export const topSectors = [
  { name: "Information Technology", count: 23, color: "oklch(0.72 0.16 55)" },
  { name: "Communication Services", count: 6, color: "oklch(0.65 0.2 350)" },
  { name: "Consumer Discretionary", count: 6, color: "oklch(0.72 0.15 165)" },
  { name: "Financials", count: 3, color: "oklch(0.65 0.2 290)" },
  { name: "Other", count: 6, color: "oklch(0.4 0.02 60)" },
];
