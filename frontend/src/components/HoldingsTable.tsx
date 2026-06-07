import { useState, useMemo, useCallback } from "react";
import type { Holding } from "../types";

type SortField = keyof Pick<
  Holding,
  | "symbol"
  | "name"
  | "quantity"
  | "averageCost"
  | "currentPrice"
  | "currentValue"
  | "unrealizedGainLoss"
  | "unrealizedGainLossPct"
>;

type SortDir = "asc" | "desc";

function fmt2(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pnlClass(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n === 0) return "text-muted-foreground";
  return n > 0 ? "font-semibold text-buy" : "font-semibold text-sell";
}

const COLUMNS: { key: SortField; label: string; right?: boolean }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "name", label: "Name" },
  { key: "quantity", label: "Qty", right: true },
  { key: "averageCost", label: "Avg Cost", right: true },
  { key: "currentPrice", label: "Price", right: true },
  { key: "currentValue", label: "Value", right: true },
  { key: "unrealizedGainLoss", label: "P/L $", right: true },
  { key: "unrealizedGainLossPct", label: "P/L %", right: true },
];

interface Props {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: Props) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return holdings;
    return holdings.filter(
      (h) =>
        h.symbol.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q)
    );
  }, [holdings, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === "asc" ? an - bn : bn - an;
    });
  }, [filtered, sortField, sortDir]);

  const totals = useMemo(() => {
    const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
    const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { totalCost, totalValue, totalPnl, totalPnlPct };
  }, [holdings]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search holdings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-64 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="overflow-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground ${
                    col.right ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortField === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 bg-card">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? "No holdings match your search." : "No holdings yet."}
                </td>
              </tr>
            ) : (
              sorted.map((h) => (
                <tr key={h.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-4 py-2 font-mono font-bold text-gold">{h.symbol}</td>
                  <td className="max-w-[160px] truncate px-4 py-2 text-foreground">{h.name}</td>
                  <td className="px-4 py-2 text-right font-mono">{h.quantity.toLocaleString("en-US")}</td>
                  <td className="px-4 py-2 text-right font-mono">${fmt2(h.averageCost)}</td>
                  <td className="px-4 py-2 text-right font-mono">${fmt2(h.currentPrice)}</td>
                  <td className="px-4 py-2 text-right font-mono">${fmt2(h.currentValue)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${pnlClass(h.unrealizedGainLoss)}`}>
                    {h.unrealizedGainLoss >= 0 ? "+" : ""}${fmt2(Math.abs(h.unrealizedGainLoss))}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${pnlClass(h.unrealizedGainLossPct)}`}>
                    {fmtPct(h.unrealizedGainLossPct)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr className="font-semibold">
                <td className="px-4 py-2 text-xs text-muted-foreground" colSpan={3}>
                  {holdings.length} position{holdings.length !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">${fmt2(totals.totalCost)}</td>
                <td />
                <td className="px-4 py-2 text-right font-mono text-xs">${fmt2(totals.totalValue)}</td>
                <td className={`px-4 py-2 text-right font-mono text-xs ${pnlClass(totals.totalPnl)}`}>
                  {totals.totalPnl >= 0 ? "+" : ""}${fmt2(Math.abs(totals.totalPnl))}
                </td>
                <td className={`px-4 py-2 text-right font-mono text-xs ${pnlClass(totals.totalPnlPct)}`}>
                  {fmtPct(totals.totalPnlPct)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
