import {
  Globe,
  Youtube,
  Facebook,
  Twitter,
  RefreshCw,
} from "lucide-react";
import type { ChartPeriod } from "../types/chart";

const PERIODS: ChartPeriod[] = ["1M", "3M", "6M", "1Y", "3Y"];

const SOCIAL_KEYS: {
  key: string;
  Icon: typeof Globe;
  label: string;
}[] = [
  { key: "website", Icon: Globe, label: "Website" },
  { key: "youtube", Icon: Youtube, label: "YouTube" },
  { key: "facebook", Icon: Facebook, label: "Facebook" },
  { key: "twitter", Icon: Twitter, label: "Twitter" },
];

export type PoliticianHeaderData = {
  display_name: string;
  party: string | null;
  chamber: string | null;
  state: string | null;
  photo_url: string | null;
  district: string | null;
  dob: string | null;
  years_active: string | null;
  age: number | null;
  last_traded: string | null;
  first_name: string | null;
  last_name: string | null;
  social_links: Record<string, string> | string | null;
  source_url: string | null;
};

function partyLabel(party: string | null): string {
  if (!party) return "";
  return party.charAt(0).toUpperCase() + party.slice(1);
}

function parseSocial(
  raw: Record<string, string> | string | null,
): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
      {children}
    </span>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-gold/50 hover:text-gold"
    >
      {children}
    </a>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function PoliticianProfileHeader({
  politician,
  chartPeriod,
  onPeriodChange,
  onSync,
  syncing,
  lastSynced,
}: {
  politician: PoliticianHeaderData;
  chartPeriod: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  onSync?: () => void;
  syncing?: boolean;
  lastSynced?: string | null;
}) {
  const social = parseSocial(politician.social_links);
  const socialEntries = SOCIAL_KEYS.filter(({ key }) => social[key]);

  const detailItems: { label: string; value: string }[] = [];
  if (politician.district)
    detailItems.push({ label: "District", value: politician.district });
  if (politician.years_active)
    detailItems.push({ label: "Years active", value: politician.years_active });
  if (politician.dob)
    detailItems.push({ label: "Date of birth", value: politician.dob });
  if (politician.age != null)
    detailItems.push({ label: "Age", value: String(politician.age) });
  if (politician.last_traded)
    detailItems.push({ label: "Last traded", value: politician.last_traded });

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-8">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold to-gold-soft opacity-60 blur-md" />
            {politician.photo_url ? (
              <img
                src={politician.photo_url}
                alt=""
                className="relative h-32 w-32 rounded-full border-2 border-gold object-cover object-top"
              />
            ) : (
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-gold bg-muted font-display text-4xl font-bold text-gold">
                {politician.display_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-gold">
              Member Profile
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              {politician.display_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {politician.party && <Badge>{partyLabel(politician.party)}</Badge>}
              {politician.chamber && (
                <>
                  <span className="text-border">·</span>
                  <span>{politician.chamber}</span>
                </>
              )}
              {politician.state && (
                <>
                  <span className="text-border">·</span>
                  <span>{politician.state}</span>
                </>
              )}
            </div>
            {(politician.first_name || politician.last_name) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[politician.first_name, politician.last_name]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            {socialEntries.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                {socialEntries.map(({ key, Icon, label }) => (
                  <SocialIcon key={key} href={social[key]} label={label}>
                    <Icon className="h-3.5 w-3.5" />
                  </SocialIcon>
                ))}
              </div>
            )}
            {lastSynced && (
              <p className="mt-3 text-xs text-muted-foreground">
                Last synced {lastSynced}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 self-start lg:self-end">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  p === chartPeriod
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border bg-card text-muted-foreground hover:border-gold/40 hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="flex items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing…" : "Sync Capitol Trades"}
            </button>
          )}
        </div>
      </div>

      {detailItems.length > 0 && (
        <div className="relative mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {detailItems.map((d) => (
            <DetailPill key={d.label} label={d.label} value={d.value} />
          ))}
        </div>
      )}

      {politician.source_url && (
        <p className="relative mt-4 text-xs text-muted-foreground">
          Profile source:{" "}
          <a
            href={politician.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            Capitol Trades
          </a>
        </p>
      )}
    </section>
  );
}
