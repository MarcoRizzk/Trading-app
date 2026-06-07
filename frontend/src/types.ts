export type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "SPLIT"
  | "OPENING_BALANCE";

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
}

export interface CreateTransactionInput {
  symbol: string;
  name: string;
  type: TransactionType;
  date: string;
  quantity: number;
  unitPrice: number;
  fee?: number;
}
