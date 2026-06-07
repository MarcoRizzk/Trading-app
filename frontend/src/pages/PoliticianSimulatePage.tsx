import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchPolitician, fetchPoliticianSimulation } from "../api/client";
import { useAppOutlet } from "../context/AppOutletContext";
import { SimulationTimelineChart } from "../components/SimulationTimelineChart";

function clampAmount(raw: number): number {
  if (!Number.isFinite(raw)) return 10_000;
  return Math.min(10_000_000, Math.max(100, raw));
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function PoliticianSimulatePage() {
  const { id } = useParams<{ id: string }>();
  const outlet = useAppOutlet();
  const [searchParams, setSearchParams] = useSearchParams();

  const amountFromQuery = useMemo(() => {
    const raw = parseFloat(String(searchParams.get("amount") ?? "10000"));
    return clampAmount(raw);
  }, [searchParams]);

  const [amountInput, setAmountInput] = useState(String(amountFromQuery));

  useEffect(() => {
    setAmountInput(String(amountFromQuery));
  }, [amountFromQuery]);

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

  const { data: profile } = useQuery({
    queryKey: ["politician", id, 1],
    queryFn: () => fetchPolitician(id, 1),
  });

  useEffect(() => {
    if (profile?.politician.display_name) {
      outlet?.setPoliticianName(profile.politician.display_name);
    }
    return () => outlet?.setPoliticianName(null);
  }, [profile?.politician.display_name, outlet]);

  const amountUsd = amountFromQuery;

  const {
    data: sim,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["politician-simulate", id, amountUsd],
    queryFn: () => fetchPoliticianSimulation(id, amountUsd),
    staleTime: 60 * 60 * 1000,
  });

  const applied = sim?.tradesApplied ?? 0;
  const skipped = sim?.tradesSkipped ?? 0;

  const canRun = () => {
    const n = parseFloat(amountInput);
    return Number.isFinite(n) && n > 0;
  };

  function run() {
    const next = clampAmount(parseFloat(amountInput));
    setSearchParams({ amount: String(next) });
  }

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-gold">
              Simulation
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              What-if I invested {fmtUsd(amountUsd)}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Replays disclosed trades over time, using size-weighted allocations.
            </p>
          </div>
          <Link
            to={`/politicians/${id}`}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to profile
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Investment amount (USD)
            </label>
            <input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              min="100"
              max="10000000"
              step="any"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={run}
            disabled={!canRun()}
            className="rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/20 disabled:opacity-50"
          >
            Run simulation
          </button>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SimulationTimelineChart
          data={sim}
          isLoading={isLoading}
          isError={isError}
          errorMessage={(error as Error)?.message}
        />
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Replay details
          </div>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Applied trades</span>
              <span className="font-semibold text-foreground">{applied}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Skipped trades</span>
              <span className="font-semibold text-foreground">{skipped}</span>
            </div>
          </div>
          {sim?.tradeSummaries?.length ? (
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sample of trade handling
              </div>
              <ul className="mt-2 space-y-2 text-xs">
                {sim.tradeSummaries.slice(0, 10).map((t, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {t.ticker} · {t.txType}
                      </div>
                      <div className="text-muted-foreground">{t.txDate}</div>
                    </div>
                    <div
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${
                        t.applied ? "text-buy" : "text-muted-foreground"
                      }`}
                    >
                      {t.applied ? "Applied" : "Skipped"}
                    </div>
                  </li>
                ))}
              </ul>
              {sim.warning && (
                <p className="mt-3 text-xs text-muted-foreground">{sim.warning}</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              {isLoading ? "Loading trade replay…" : "No trade details available."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

