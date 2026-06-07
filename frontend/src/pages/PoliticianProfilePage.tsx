import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  TrendingUp,
  FileText,
  Wallet,
  Building2,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { fetchPolitician, fetchPoliticianChart, syncPolitician } from "../api/client";
import { PoliticianProfileHeader } from "../components/PoliticianProfileHeader";
import { PortfolioVsSp500Chart } from "../components/PortfolioVsSp500Chart";
import { useAppOutlet } from "../context/AppOutletContext";
import type { ChartPeriod } from "../types/chart";

const CHART_COLORS = [
  "oklch(0.72 0.16 55)",
  "oklch(0.65 0.2 350)",
  "oklch(0.72 0.15 165)",
  "oklch(0.65 0.2 290)",
  "oklch(0.4 0.02 60)",
];

function formatVolume(usd: number | null | undefined): string {
  if (usd == null) return "—";
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sizeTierFromLabel(label: string | null): 1 | 2 | 3 {
  if (!label) return 1;
  const lower = label.toLowerCase();
  if (lower.includes("25m") || lower.includes("5m") || lower.includes("1m–5m"))
    return 3;
  if (lower.includes("500k") || lower.includes("250k")) return 2;
  return 1;
}

function tickerInitials(ticker: string | null | undefined): string {
  if (!ticker) return "—";
  return ticker.split(":")[0].slice(0, 2).toUpperCase();
}

export function PoliticianProfilePage() {
  const { id } = useParams<{ id: string }>();
  const outlet = useAppOutlet();
  const [page, setPage] = useState(1);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("3Y");
  const queryClient = useQueryClient();

  if (!id) {
    return (
      <main className="flex-1 px-6 py-12 text-center lg:px-10">
        <p className="text-destructive">Missing politician id.</p>
        <Link to="/politicians" className="mt-4 inline-block text-sm text-gold">
          Back to politicians
        </Link>
      </main>
    );
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["politician", id, page],
    queryFn: () => fetchPolitician(id, page),
  });

  const {
    data: chartData,
    isLoading: chartLoading,
    isError: chartError,
    error: chartErr,
  } = useQuery({
    queryKey: ["politician-chart", id, chartPeriod],
    queryFn: () => fetchPoliticianChart(id, chartPeriod),
    staleTime: 60 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncPolitician(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["politician", id] });
      queryClient.invalidateQueries({ queryKey: ["politician-chart", id] });
      queryClient.invalidateQueries({ queryKey: ["politicians"] });
    },
  });

  useEffect(() => {
    if (data?.politician.display_name) {
      outlet?.setPoliticianName(data.politician.display_name);
    }
    return () => outlet?.setPoliticianName(null);
  }, [data?.politician.display_name, outlet]);

  if (isLoading) {
    return (
      <main className="flex-1 px-6 py-12 text-center text-muted-foreground lg:px-10">
        Loading profile…
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex-1 px-6 py-12 text-center lg:px-10">
        <p className="mb-4 text-destructive">
          {(error as Error)?.message ?? "Profile not found"}
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Run{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            npm run seed:politicians
          </code>{" "}
          in the backend folder to load sample data.
        </p>
        <Link to="/politicians" className="text-sm text-gold hover:underline">
          Back to politicians
        </Link>
      </main>
    );
  }

  const { politician, stats, trades, articles, pagination } = data;
  const statsSource = stats ?? {
    tradeCount: politician.trade_count ?? 0,
    filingCount: 0,
    volumeUsd: politician.volume_usd ?? 0,
    issuerCount: politician.issuer_count ?? 0,
    mostTradedIssuers: [] as { name: string; count: number }[],
    mostTradedSectors: [] as { sector: string; count: number }[],
    period: "3Y",
    scrapedAt: politician.scraped_at ?? "",
  };

  const topIssuers = statsSource.mostTradedIssuers.map((i, idx) => ({
    name: i.name,
    count: i.count,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const topSectors = statsSource.mostTradedSectors.map((s, idx) => ({
    name: s.sector,
    count: s.count,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      {syncMutation.error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {(syncMutation.error as Error).message}
        </p>
      )}

      <PoliticianProfileHeader
        politician={politician}
        chartPeriod={chartPeriod}
        onPeriodChange={setChartPeriod}
        onSync={() => syncMutation.mutate()}
        syncing={syncMutation.isPending}
        lastSynced={
          statsSource.scrapedAt
            ? formatDate(statsSource.scrapedAt)
            : politician.scraped_at
              ? formatDate(politician.scraped_at)
              : null
        }
      />

      <StatsRow stats={statsSource} politician={politician} />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <PortfolioVsSp500Chart
          period={chartPeriod}
          data={chartData}
          isLoading={chartLoading}
          isError={chartError}
          errorMessage={(chartErr as Error)?.message}
        />
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            What-if
          </div>
          <h2 className="mt-2 font-display text-lg font-semibold text-foreground">
            Simulate your investment
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Replay this politician’s disclosed trades using size-weighted allocations
            and Yahoo Finance prices.
          </p>
          <Link
            to={`/politicians/${id}/simulate?amount=10000`}
            className="mt-4 inline-flex rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/20"
          >
            What-if I invested $10,000
          </Link>
        </div>
        {(topIssuers.length > 0 || topSectors.length > 0) && (
          <div className="flex flex-col gap-6">
            {topIssuers.length > 0 && (
              <BreakdownCard title="Top Issuers" items={topIssuers} />
            )}
            {topSectors.length > 0 && (
              <BreakdownCard title="Top Sectors" items={topSectors} />
            )}
          </div>
        )}
      </div>

      <TradesTable
        trades={trades}
        page={page}
        pagination={pagination}
        onPageChange={setPage}
      />

      {articles.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Related reading
          </div>
          <ul className="mt-4 space-y-3">
            {articles.slice(0, 5).map((a) => (
              <li key={a.slug}>
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm text-gold hover:underline"
                >
                  {a.title}
                </a>
                {a.publishedAt && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {a.publishedAt}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data from{" "}
        <a
          href={politician.source_url ?? "https://www.capitoltrades.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gold"
        >
          Capitol Trades
        </a>
        {statsSource.scrapedAt && (
          <> · Last synced {formatDate(statsSource.scrapedAt)}</>
        )}
      </p>
    </main>
  );
}

function StatsRow({
  stats,
  politician,
}: {
  stats: {
    tradeCount: number;
    filingCount: number;
    volumeUsd: number;
    issuerCount: number;
  };
  politician: {
    trade_count: number | null;
    issuer_count: number | null;
    volume_usd: number | null;
  };
}) {
  const items = [
    {
      label: "Trades",
      value: stats.tradeCount ?? politician.trade_count ?? "—",
      icon: TrendingUp,
    },
    { label: "Filings", value: stats.filingCount, icon: FileText },
    {
      label: "Volume",
      value: formatVolume(stats.volumeUsd ?? politician.volume_usd),
      icon: Wallet,
      accent: true,
    },
    {
      label: "Issuers",
      value: stats.issuerCount ?? politician.issuer_count ?? "—",
      icon: Building2,
    },
  ];

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s) => (
        <div
          key={s.label}
          className={`group relative overflow-hidden rounded-xl border p-5 transition hover:-translate-y-0.5 ${
            s.accent
              ? "border-gold/40 bg-gradient-to-br from-gold/10 to-card"
              : "border-border bg-card hover:border-gold/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </div>
              <div
                className={`mt-3 font-display text-3xl font-bold ${
                  s.accent ? "text-gold" : "text-foreground"
                }`}
              >
                {s.value}
              </div>
            </div>
            <s.icon
              className={`h-5 w-5 ${s.accent ? "text-gold" : "text-muted-foreground"}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: { name: string; count: number; color: string }[];
}) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  let acc = 0;
  const arcs = items.map((it) => {
    const start = (acc / total) * 360;
    acc += it.count;
    const end = (acc / total) * 360;
    return { ...it, start, end };
  });

  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [50 + r * Math.cos(rad), 50 + r * Math.sin(rad)];
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0">
          {arcs.map((a, i) => {
            const [x1, y1] = polar(a.start, 40);
            const [x2, y2] = polar(a.end, 40);
            const large = a.end - a.start > 180 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M50 50 L${x1} ${y1} A40 40 0 ${large} 1 ${x2} ${y2} Z`}
                fill={a.color}
              />
            );
          })}
          <circle cx="50" cy="50" r="22" fill="var(--card)" />
        </svg>
        <ul className="flex-1 space-y-1.5 text-xs">
          {items.map((it) => (
            <li key={it.name} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: it.color }}
              />
              <span className="flex-1 truncate text-foreground">{it.name}</span>
              <span className="font-mono text-muted-foreground">({it.count})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TradesTable({
  trades,
  page,
  pagination,
  onPageChange,
}: {
  trades: {
    id: number;
    issuer_name?: string;
    issuer_ticker?: string | null;
    pub_date: string | null;
    tx_date: string;
    reporting_gap_days: number | null;
    tx_type: string;
    size_label: string | null;
    source_trade_url?: string | null;
  }[];
  page: number;
  pagination: { totalPages: number };
  onPageChange: (p: number) => void;
}) {
  const [sort, setSort] = useState<"published" | "type">("published");
  const sorted = useMemo(() => {
    return [...trades].sort((a, b) =>
      sort === "type" ? a.tx_type.localeCompare(b.tx_type) : 0,
    );
  }, [trades, sort]);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Trade activity
          </div>
          <h2 className="mt-1 font-display text-xl font-bold">Recent disclosures</h2>
        </div>
        <button
          type="button"
          onClick={() => setSort(sort === "type" ? "published" : "type")}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-gold/40 hover:text-foreground"
        >
          Sort by: {sort}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-5 py-3 text-left font-medium">Traded Issuer</th>
              <th className="px-3 py-3 text-left font-medium">Published</th>
              <th className="px-3 py-3 text-left font-medium">Traded</th>
              <th className="px-3 py-3 text-left font-medium">Filed After</th>
              <th className="px-3 py-3 text-left font-medium">Type</th>
              <th className="px-3 py-3 text-left font-medium">Size</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const isBuy = t.tx_type.toLowerCase() === "buy";
              const tier = sizeTierFromLabel(t.size_label);
              return (
                <tr
                  key={t.id}
                  className="border-b border-border/50 transition hover:bg-accent/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background font-mono text-xs font-bold text-gold">
                        {tickerInitials(t.issuer_ticker)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {t.issuer_name ?? "—"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {t.issuer_ticker ?? "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 font-mono text-xs text-muted-foreground">
                    {formatDate(t.pub_date)}
                  </td>
                  <td className="px-3 py-4 font-mono text-xs text-muted-foreground">
                    {formatDate(t.tx_date)}
                  </td>
                  <td className="px-3 py-4">
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.reporting_gap_days != null
                        ? `${t.reporting_gap_days} days`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        isBuy
                          ? "bg-buy/15 text-buy ring-1 ring-buy/30"
                          : "bg-sell/15 text-sell ring-1 ring-sell/30"
                      }`}
                    >
                      {t.tx_type.toUpperCase()}
                      {isBuy ? "*" : ""}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className={`h-2.5 w-2.5 rounded-full ${
                              n <= tier ? "bg-gold" : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs text-foreground">
                        {t.size_label ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    {t.source_trade_url ? (
                      <a
                        href={t.source_trade_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-gold"
                      >
                        <ArrowUpRight className="inline h-4 w-4" />
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <PagerBtn disabled={page <= 1} onClick={() => onPageChange(1)}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </PagerBtn>
            <PagerBtn
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </PagerBtn>
            <span className="px-3">
              Page <span className="font-semibold text-foreground">{page}</span>{" "}
              of {pagination.totalPages}
            </span>
            <PagerBtn
              disabled={page >= pagination.totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </PagerBtn>
            <PagerBtn
              disabled={page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.totalPages)}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </PagerBtn>
          </div>
        </div>
      )}
    </section>
  );
}

function PagerBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:border-gold/40 hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
