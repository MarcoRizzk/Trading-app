import path from "path";
import "../db/database";
import {
  getFixturePath,
  loadFixtureHtml,
  syncFromFixture,
} from "../services/capitolTradesSync";

const fixturePath =
  process.env.FIXTURE_PATH ?? getFixturePath();

console.log(`[seed] Loading fixture: ${fixturePath}`);
const html = loadFixtureHtml(path.resolve(fixturePath));
const result = syncFromFixture("P000197", html);
console.log(`[seed] Imported ${result.tradesFound} trades for P000197`);
