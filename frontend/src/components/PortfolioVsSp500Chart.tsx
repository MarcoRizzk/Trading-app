import type { ChartPeriod, PoliticianChartData } from "../types/chart";

const PERIODS: ChartPeriod[] = ["1M", "3M", "6M", "1Y", "3Y"];

interface Props {
  period: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
  showPeriodControls?: boolean;
  data?: PoliticianChartData;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

export function PortfolioVsSp500Chart({
  period,
  onPeriodChange,
  showPeriodControls = false,
  data,
  isLoading,
  isError,
  errorMessage,
}: Props) {
  const points = data?.portfolioLine ?? [];
  const path =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")
      : "";

  const returnLabel =
    data != null
      ? `${data.portfolioReturnPct >= 0 ? "+" : ""}${data.portfolioReturnPct.toFixed(1)}%`
      : "—";

  const outperfLabel =
    data != null
      ? data.outperformancePct >= 0
        ? `Outperforms SP500 by ${data.outperformancePct.toFixed(1)}%`
        : `Underperforms SP500 by ${Math.abs(data.outperformancePct).toFixed(1)}%`
      : "";

  return (
    <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio vs S&P 500
          </div>
          <div className="mt-1 font-display text-lg font-semibold">
            {data?.periodLabel ?? "Performance"}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {showPeriodControls && onPeriodChange && (
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                    p === period
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border bg-background text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-gold">
              {isLoading ? "…" : returnLabel}
            </div>
            {data && !isLoading && (
              <div className="text-xs text-muted-foreground">{outperfLabel}</div>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-6 h-56 w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading market data from Yahoo Finance…
          </div>
        )}
        {isError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-destructive">
            {errorMessage ?? "Could not load chart data"}
          </div>
        )}
        {!isLoading && !isError && points.length > 0 && (
          <svg
            viewBox="0 0 100 80"
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-label="Portfolio performance chart"
          >
            <defs>
              <linearGradient id="portfolio-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${path} L100 80 L0 80 Z`} fill="url(#portfolio-gradient)" />
            <path
              d={path}
              fill="none"
              stroke="var(--gold)"
              strokeWidth="0.6"
            />
            {data?.tradeMarkers.map((m, i) => (
              <line
                key={i}
                x1={m.x}
                y1="80"
                x2={m.x}
                y2={m.y}
                stroke={m.type === "buy" ? "var(--buy)" : "var(--sell)"}
                strokeWidth={m.type === "sell" ? "1" : "0.8"}
                opacity={m.type === "buy" ? 0.7 : 1}
              />
            ))}
          </svg>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {(data?.quarterLabels ?? []).map((q, i) => (
          <span key={i}>{q}</span>
        ))}
      </div>

      {data?.warning && (
        <p className="mt-3 text-xs text-muted-foreground">{data.warning}</p>
      )}
      {data?.dataSource && !isLoading && (
        <p className="mt-1 text-[10px] text-muted-foreground/80">
          {data.dataSource === "yahoo-finance2"
            ? "Prices via yahoo-finance2 · Benchmark: SPY"
            : data.dataSource === "partial"
              ? "Partial Yahoo Finance data · Benchmark: SPY"
              : "Estimated from disclosed trades (Yahoo Finance unavailable)"}
        </p>
      )}
    </div>
  );
}
