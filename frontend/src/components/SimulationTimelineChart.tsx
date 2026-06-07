import type { PoliticianSimulationResult } from "../types/simulation";

function fmtUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

type Point = { x: number; y: number };

function toLinePoints(values: number[]): Point[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  return values.map((v, i) => ({
    x: n <= 1 ? 0 : (i / (n - 1)) * 100,
    y: 80 - ((v - min) / span) * 58,
  }));
}

export function SimulationTimelineChart({
  data,
  isLoading,
  isError,
  errorMessage,
}: {
  data?: PoliticianSimulationResult;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}) {
  const timeline = data?.timeline ?? [];
  const portfolioValues = timeline.map((p) => p.portfolioValueUsd);
  const benchmarkValues = timeline.map((p) => p.benchmarkValueUsd);

  const portfolioPts = toLinePoints(portfolioValues);
  const benchPts = toLinePoints(benchmarkValues);

  const portfolioPath =
    portfolioPts.length > 0
      ? portfolioPts
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
          .join(" ")
      : "";
  const benchPath =
    benchPts.length > 0
      ? benchPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")
      : "";

  return (
    <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Simulation
          </div>
          <div className="mt-1 font-display text-lg font-semibold">
            What-if performance vs SPY
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="font-display text-xl font-bold text-gold">
            {isLoading ? "…" : fmtUsd(data?.currentValueUsd)}
          </div>
          {data && !isLoading && (
            <div className="text-xs text-muted-foreground">
              Return {fmtPct(data.totalReturnPct)} ·{" "}
              {data.outperformancePct >= 0
                ? `Outperforms SPY by ${fmtPct(data.outperformancePct)}`
                : `Underperforms SPY by ${fmtPct(Math.abs(data.outperformancePct))}`}
            </div>
          )}
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
            {errorMessage ?? "Could not load simulation data"}
          </div>
        )}
        {!isLoading && !isError && portfolioPts.length > 0 && (
          <svg
            viewBox="0 0 100 80"
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-label="Simulation timeline chart"
          >
            <defs>
              <linearGradient id="sim-portfolio-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {benchPath && (
              <path
                d={benchPath}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeWidth="0.5"
                opacity="0.7"
              />
            )}
            <path
              d={`${portfolioPath} L100 80 L0 80 Z`}
              fill="url(#sim-portfolio-gradient)"
            />
            <path
              d={portfolioPath}
              fill="none"
              stroke="var(--gold)"
              strokeWidth="0.7"
            />
          </svg>
        )}
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

