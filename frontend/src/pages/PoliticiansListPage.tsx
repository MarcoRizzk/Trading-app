import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Building2 } from "lucide-react";
import { fetchPoliticians } from "../api/client";

function formatVolume(usd: number | null | undefined): string {
  if (usd == null) return "—";
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function partyLabel(party: string | null): string {
  if (!party) return "";
  return party.charAt(0).toUpperCase() + party.slice(1);
}

export function PoliticiansListPage() {
  const { data: politicians = [], isLoading, isError, error } = useQuery({
    queryKey: ["politicians"],
    queryFn: fetchPoliticians,
  });

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.3em] text-gold">
            Capitol Insider Track
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Politicians
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Browse congressional trade disclosures synced from Capitol Trades.
            Select a member to view portfolio performance, filings, and recent
            activity.
          </p>
        </div>
      </section>

      {isLoading && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Loading politicians…
        </p>
      )}

      {isError && (
        <p className="mt-10 text-center text-sm text-destructive">
          {(error as Error)?.message ?? "Failed to load politicians"}
        </p>
      )}

      {!isLoading && !isError && politicians.length === 0 && (
        <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No politicians in the database yet.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Run{" "}
            <code className="rounded bg-muted px-1">npm run seed:politicians</code>{" "}
            in the backend folder.
          </p>
        </div>
      )}

      {!isLoading && politicians.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {politicians.map((p) => (
            <Link
              key={p.id}
              to={`/politicians/${p.id}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-gold/40"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/5 opacity-0 blur-2xl transition group-hover:opacity-100" />
              <div className="relative flex items-start gap-4">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full border-2 border-gold object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-muted font-display text-xl font-bold text-gold">
                    {p.display_name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-gold">
                    {p.display_name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[partyLabel(p.party), p.chamber, p.state]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Trades
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {p.trade_count ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    Volume
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-gold">
                    {formatVolume(p.volume_usd)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last traded</div>
                  <div className="mt-1 truncate font-mono text-[11px] text-foreground">
                    {p.last_traded ?? "—"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
