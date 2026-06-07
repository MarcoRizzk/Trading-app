import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { politician, trades, topIssuers, topSectors } from "@/lib/trades-data";
import portrait from "@/assets/politician-portrait.jpg";
import {
  ArrowUpRight, TrendingUp, FileText, Wallet, Building2,
  Globe, Youtube, Facebook, Twitter, ChevronRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, Search,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nancy Pelosi · Capitol Insider Track" },
      { name: "description", content: "Trade activity, filings, and portfolio insights for Rep. Nancy Pelosi." },
      { property: "og:title", content: "Nancy Pelosi · Capitol Insider Track" },
      { property: "og:description", content: "Trade activity, filings, and portfolio insights." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-6 py-8 lg:px-10">
            <ProfileHeader />
            <StatsRow />
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <PortfolioChart />
              <Breakdowns />
            </div>
            <TradesTable />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-10">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="ml-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span>Politicians</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gold">Nancy Pelosi</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
          <Search className="h-3.5 w-3.5" />
          <span>Search issuers, tickers…</span>
        </div>
        <button className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/20">
          Follow
        </button>
      </div>
    </header>
  );
}

function ProfileHeader() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-8">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold to-gold-soft blur-md opacity-60" />
            <img
              src={portrait}
              alt="Nancy Pelosi"
              width={128}
              height={128}
              className="relative h-32 w-32 rounded-full border-2 border-gold object-cover"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-gold">Member Profile</div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{politician.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <Badge>{politician.party}</Badge>
              <span>·</span>
              <span>{politician.chamber}</span>
              <span>·</span>
              <span>{politician.state}</span>
            </div>
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <SocialIcon><Globe className="h-3.5 w-3.5" /></SocialIcon>
              <SocialIcon><Youtube className="h-3.5 w-3.5" /></SocialIcon>
              <SocialIcon><Facebook className="h-3.5 w-3.5" /></SocialIcon>
              <SocialIcon><Twitter className="h-3.5 w-3.5" /></SocialIcon>
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-start md:self-end">
          {["1M", "3M", "6M", "1Y", "3Y"].map((p) => (
            <button
              key={p}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                p === "3Y"
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border bg-card text-muted-foreground hover:border-gold/40 hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
      {children}
    </span>
  );
}

function SocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-gold/50 hover:text-gold">
      {children}
    </button>
  );
}

function StatsRow() {
  const stats = [
    { label: "Trades", value: politician.trades, icon: TrendingUp },
    { label: "Filings", value: politician.filings, icon: FileText },
    { label: "Volume", value: politician.volume, icon: Wallet, accent: true },
    { label: "Issuers", value: politician.issuers, icon: Building2 },
  ];
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`group relative overflow-hidden rounded-xl border p-5 transition hover:-translate-y-0.5 ${
            s.accent ? "border-gold/40 bg-gradient-to-br from-gold/10 to-card" : "border-border bg-card hover:border-gold/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</div>
              <div className={`mt-3 font-display text-3xl font-bold ${s.accent ? "text-gold" : "text-foreground"}`}>{s.value}</div>
            </div>
            <s.icon className={`h-5 w-5 ${s.accent ? "text-gold" : "text-muted-foreground"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioChart() {
  // simple SVG line chart
  const points = [
    [0, 70], [8, 65], [16, 60], [24, 55], [32, 58], [40, 50], [48, 45],
    [56, 40], [64, 48], [72, 38], [80, 42], [88, 30], [96, 35], [100, 20],
  ];
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
  return (
    <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Portfolio vs S&P 500</div>
          <div className="mt-1 font-display text-lg font-semibold">3-Year performance</div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-gold">+182.4%</div>
          <div className="text-xs text-muted-foreground">Outperforms SP500 by 56.1%</div>
        </div>
      </div>
      <div className="mt-6 h-56 w-full">
        <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.13 85)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(0.78 0.13 85)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L100 80 L0 80 Z`} fill="url(#g)" />
          <path d={path} fill="none" stroke="oklch(0.78 0.13 85)" strokeWidth="0.6" />
          {/* trade markers */}
          {[20, 35, 50, 65, 78, 90].map((x, i) => (
            <line key={i} x1={x} y1="80" x2={x} y2={70 - i * 4} stroke="oklch(0.72 0.15 165)" strokeWidth="0.8" opacity="0.7" />
          ))}
          <line x1="55" y1="80" x2="55" y2="15" stroke="oklch(0.72 0.16 55)" strokeWidth="1" />
          <line x1="82" y1="80" x2="82" y2="10" stroke="oklch(0.72 0.16 55)" strokeWidth="1" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {["Q2","Q3","Q4","Q1","Q2","Q3","Q4","Q1","Q2","Q3","Q4","Q1","Q2"].map((q, i) => <span key={i}>{q}</span>)}
      </div>
    </div>
  );
}

function Breakdowns() {
  return (
    <div className="flex flex-col gap-6">
      <BreakdownCard title="Top Issuers" items={topIssuers} />
      <BreakdownCard title="Top Sectors" items={topSectors} />
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: { name: string; count: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
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
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
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
              <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
              <span className="flex-1 truncate text-foreground">{it.name}</span>
              <span className="font-mono text-muted-foreground">({it.count})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TradesTable() {
  const [sort, setSort] = useState<"published" | "type">("published");
  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => (sort === "type" ? a.type.localeCompare(b.type) : 0));
  }, [sort]);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Trade activity</div>
          <h2 className="mt-1 font-display text-xl font-bold">Recent disclosures</h2>
        </div>
        <button
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
            {sorted.map((t, i) => (
              <tr key={i} className="border-b border-border/50 transition hover:bg-accent/40">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background font-mono text-xs font-bold text-gold">
                      {t.ticker.split(":")[0].slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{t.issuer}</div>
                      <div className="font-mono text-xs text-muted-foreground">{t.ticker}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 font-mono text-xs text-muted-foreground">{t.published}</td>
                <td className="px-3 py-4 font-mono text-xs text-muted-foreground">{t.traded}</td>
                <td className="px-3 py-4">
                  <span className="font-mono text-xs text-muted-foreground">{t.filedAfter}</span>
                </td>
                <td className="px-3 py-4">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      t.type === "BUY"
                        ? "bg-buy/15 text-buy ring-1 ring-buy/30"
                        : "bg-sell/15 text-sell ring-1 ring-sell/30"
                    }`}
                  >
                    {t.type}*
                  </span>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className={`h-2.5 w-2.5 rounded-full ${
                            n <= t.sizeTier ? "bg-gold" : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs text-foreground">{t.size}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-right">
                  <button className="text-muted-foreground hover:text-gold">
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <PagerBtn><ChevronsLeft className="h-3.5 w-3.5" /></PagerBtn>
          <PagerBtn><ChevronLeft className="h-3.5 w-3.5" /></PagerBtn>
          <span className="px-3">Page <span className="font-semibold text-foreground">1</span> of 3</span>
          <PagerBtn><ChevronRight className="h-3.5 w-3.5" /></PagerBtn>
          <PagerBtn><ChevronsRight className="h-3.5 w-3.5" /></PagerBtn>
        </div>
        <div className="flex items-center gap-2">
          Show
          <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-foreground">12</span>
        </div>
      </div>
    </section>
  );
}

function PagerBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:border-gold/40 hover:text-foreground">
      {children}
    </button>
  );
}
