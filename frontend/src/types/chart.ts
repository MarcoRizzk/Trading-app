export type ChartPeriod = "1M" | "3M" | "6M" | "1Y" | "3Y";

export interface ChartPoint {
  x: number;
  y: number;
}

export interface TradeMarker {
  x: number;
  y: number;
  type: "buy" | "sell";
}

export interface PoliticianChartData {
  period: ChartPeriod;
  periodLabel: string;
  portfolioReturnPct: number;
  benchmarkReturnPct: number;
  outperformancePct: number;
  quarterLabels: string[];
  portfolioLine: ChartPoint[];
  tradeMarkers: TradeMarker[];
  dataSource: "yahoo-finance2" | "partial" | "estimated";
  warning?: string;
}
