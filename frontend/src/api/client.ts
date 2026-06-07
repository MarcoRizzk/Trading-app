import type { Holding, CreateTransactionInput } from "../types";
import type { ChartPeriod, PoliticianChartData } from "../types/chart";
import type { PoliticianProfileResponse, PoliticianSummary } from "../types/politician";
import type { PoliticianSimulationResult } from "../types/simulation";

const BASE = "/api";

export async function fetchHoldings(): Promise<Holding[]> {
  const res = await fetch(`${BASE}/holdings`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to fetch holdings");
  }
  return res.json();
}

export async function addTransaction(
  input: CreateTransactionInput
): Promise<void> {
  const res = await fetch(`${BASE}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to add transaction");
  }
}

export async function fetchPoliticians(): Promise<PoliticianSummary[]> {
  const res = await fetch(`${BASE}/politicians`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to fetch politicians");
  }
  return res.json();
}

export async function fetchPolitician(
  id: string,
  page = 1,
  pageSize = 12,
): Promise<PoliticianProfileResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(`${BASE}/politicians/${id}?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to fetch politician profile");
  }
  return res.json();
}

export async function fetchPoliticianChart(
  id: string,
  period: ChartPeriod = "3Y",
): Promise<PoliticianChartData> {
  const params = new URLSearchParams({ period });
  const res = await fetch(`${BASE}/politicians/${id}/chart?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to fetch chart data");
  }
  return res.json();
}

export async function fetchPoliticianSimulation(
  id: string,
  amountUsd: number,
): Promise<PoliticianSimulationResult> {
  const params = new URLSearchParams({ amount: String(amountUsd) });
  const res = await fetch(`${BASE}/politicians/${id}/simulate?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to fetch simulation data");
  }
  return res.json();
}

export async function syncPolitician(
  id: string,
): Promise<{ ok: boolean; tradesFound: number; pagesFetched: number }> {
  const res = await fetch(`${BASE}/politicians/${id}/sync`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to sync politician");
  }
  return res.json();
}
