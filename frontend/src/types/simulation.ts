export type SimulationDataSource = "yahoo-finance2" | "partial" | "estimated";

export interface SimulationTimelinePoint {
  date: string;
  portfolioValueUsd: number;
  benchmarkValueUsd: number;
}

export interface SimulationTradeSummary {
  txDate: string;
  ticker: string;
  txType: string;
  applied: boolean;
  reason?: string;
}

export interface PoliticianSimulationResult {
  initialAmountUsd: number;
  currentValueUsd: number;
  totalReturnPct: number;
  benchmarkValueUsd: number;
  benchmarkReturnPct: number;
  outperformancePct: number;
  timeline: SimulationTimelinePoint[];
  tradesApplied: number;
  tradesSkipped: number;
  tradeSummaries: SimulationTradeSummary[];
  dataSource: SimulationDataSource;
  warning?: string;
}

