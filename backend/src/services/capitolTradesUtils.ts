const SIZE_BUCKETS: { min: number; max: number; label: string }[] = [
  { min: 0, max: 15000, label: "1K–15K" },
  { min: 15000, max: 50000, label: "15K–50K" },
  { min: 50000, max: 100000, label: "50K–100K" },
  { min: 100000, max: 250000, label: "100K–250K" },
  { min: 250000, max: 500000, label: "250K–500K" },
  { min: 500000, max: 1000000, label: "500K–1M" },
  { min: 1000000, max: 5000000, label: "1M–5M" },
  { min: 5000000, max: 25000000, label: "5M–25M" },
  { min: 25000000, max: 50000000, label: "25M–50M" },
  { min: 50000000, max: Infinity, label: "50M+" },
];

export function valueToSizeLabel(value: number | null): string {
  if (value == null || value <= 0) return "—";
  for (const bucket of SIZE_BUCKETS) {
    if (value >= bucket.min && value < bucket.max) {
      return bucket.label;
    }
  }
  return "50M+";
}

export function parseMoneyToUsd(text: string): number | null {
  const cleaned = text.replace(/\$/g, "").replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*(K|M|B)?$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (Number.isNaN(num)) return null;
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") return num * 1_000;
  if (suffix === "M") return num * 1_000_000;
  if (suffix === "B") return num * 1_000_000_000;
  return num;
}

export function extractNextFlightPayloads(html: string): string {
  const parts: string[] = [];
  let searchFrom = 0;

  while (searchFrom < html.length) {
    const pushIdx = html.indexOf("self.__next_f.push([", searchFrom);
    if (pushIdx === -1) break;

    const bracketStart = html.indexOf("[", pushIdx);
    if (bracketStart === -1) {
      searchFrom = pushIdx + 1;
      continue;
    }

    let pos = bracketStart + 1;
    while (pos < html.length && /\s/.test(html[pos])) pos++;

    if (html.slice(pos, pos + 1) !== "1") {
      searchFrom = pushIdx + 1;
      continue;
    }

    while (pos < html.length && /[\d]/.test(html[pos])) pos++;
    while (pos < html.length && /\s/.test(html[pos])) pos++;
    if (html[pos] !== ",") {
      searchFrom = pushIdx + 1;
      continue;
    }
    pos++;
    while (pos < html.length && /\s/.test(html[pos])) pos++;

    const quote = html[pos];
    if (quote !== "'" && quote !== '"') {
      searchFrom = pushIdx + 1;
      continue;
    }
    pos++;

    const contentStart = pos;
    let content = "";
    while (pos < html.length) {
      const ch = html[pos];
      if (ch === "\\") {
        pos++;
        if (pos < html.length) {
          content += html[pos];
          pos++;
        }
        continue;
      }
      if (ch === quote) break;
      content += ch;
      pos++;
    }

    parts.push(content);
    searchFrom = pos + 1;
  }

  return parts.join("\n");
}

export function extractJsonArrayAfterKey(
  text: string,
  key: string,
): unknown[] | null {
  const idx = text.indexOf(key);
  if (idx === -1) return null;
  const start = text.indexOf("[", idx + key.length);
  if (start === -1) return null;
  const slice = extractBalancedJson(text, start);
  if (!slice) return null;
  try {
    return JSON.parse(slice) as unknown[];
  } catch {
    return null;
  }
}

export function extractJsonObjectAfterKey(
  text: string,
  key: string,
): Record<string, unknown> | null {
  const idx = text.indexOf(key);
  if (idx === -1) return null;
  const start = text.indexOf("{", idx + key.length);
  if (start === -1) return null;
  const slice = extractBalancedJson(text, start);
  if (!slice) return null;
  try {
    return JSON.parse(slice) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractBalancedJson(text: string, start: number): string | null {
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function findChunkPayload(flight: string, chunkId: string): string | null {
  const idx = flight.indexOf(chunkId);
  if (idx === -1) return null;
  return flight.slice(idx + chunkId.length);
}
