import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHoldings } from "../api/client";
import { HoldingsTable } from "../components/HoldingsTable";
import { AddTransactionForm } from "../components/AddTransactionForm";

export function PortfolioPage() {
  const [showForm, setShowForm] = useState(false);

  const {
    data: holdings = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["holdings"],
    queryFn: fetchHoldings,
    refetchInterval: false,
  });

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-gold">
              Portfolio
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Holdings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track positions and record transactions
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/20"
          >
            {showForm ? "Cancel" : "+ Add Transaction"}
          </button>
        </div>
      </section>

      {showForm && (
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">
            New Transaction
          </h2>
          <div className="mt-4">
            <AddTransactionForm />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Positions
          </h2>
          <div className="flex items-center gap-3">
            {isLoading && (
              <span className="animate-pulse text-xs text-gold">Refreshing…</span>
            )}
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {holdings.length} position{holdings.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading holdings...
          </div>
        )}

        {isError && (
          <div className="py-6 text-center text-sm text-destructive">
            Failed to load holdings: {(error as Error).message}
          </div>
        )}

        {!isLoading && !isError && <HoldingsTable holdings={holdings} />}
      </section>
    </main>
  );
}
