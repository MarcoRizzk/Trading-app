import fs from "fs";
import path from "path";
import { parsePoliticianHtml } from "../services/capitolTradesParser";

const fixturePath = path.resolve(
  __dirname,
  "../../../example .html",
);
const html = fs.readFileSync(fixturePath, "utf-8");
const parsed = parsePoliticianHtml(html, "P000197");

console.log("Profile:", parsed.profile.displayName, parsed.profile.party);
console.log("Trades:", parsed.trades.length);
console.log("Total count/pages:", parsed.totalCount, parsed.totalPages);
console.log("Stats:", parsed.stats?.tradeCount, parsed.stats?.filingCount);
console.log("Articles:", parsed.articles.length);

if (parsed.trades.length < 10) {
  console.error("FAIL: expected at least 10 trades from fixture");
  process.exit(1);
}

if (parsed.profile.displayName !== "Nancy Pelosi") {
  console.error("FAIL: unexpected display name");
  process.exit(1);
}

console.log("OK");
