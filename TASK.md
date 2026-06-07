# InvestWhat — Technical Screening

## Context

You're joining the InvestWhat engineering team. This is a simplified version of our portfolio management feature — users can view their stock holdings and add transactions (buy, sell, dividend).

**The feature is broken across multiple layers.** Users are reporting a range of issues — from hard errors to silent wrong numbers to stale UI. Your job is to find and fix all of them.

---

## Setup

```bash
npm run setup     # installs all dependencies (run once)
npm run dev       # starts backend on :3001 and frontend on :5173
```

Open your browser at **http://localhost:5173**

---

## Your Task

Use the **AI CLI** to investigate and fix all issues end-to-end.

Work through the following scenarios and make sure each one behaves correctly:

1. **Add a BUY for a stock you already hold** (e.g. AAPL) — does it work without errors?
2. **Add a BUY with a non-zero fee** — does the average cost update correctly?
3. **Add a SELL transaction** — does the portfolio reflect the correct position after?
4. **After adding any transaction** — does the holdings table update without a full page refresh?
5. **When errors occur** — is what's shown to the user appropriate?

You should be able to add multiple transactions across all types and always see accurate holdings with correct cost calculations.

---

## Rules

- You **must** use the AI CLI to assist your work
- Do not just ask the AI to "find all bugs" — trace each issue from the symptom to the root cause before accepting a fix
- The fix for each issue is **small** — you won't need to rewrite anything
- Be ready to explain every change you make to the interviewer

---

## Files to focus on

```
backend/src/
  db/database.ts               ← database layer
  services/transactionService.ts    ← business logic & calculations
frontend/src/
  App.tsx                      ← main layout and data fetching
  components/AddTransactionForm.tsx  ← transaction form
```

Good luck.
