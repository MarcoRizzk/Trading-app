# Pre-Interview Setup — Please complete before your interview

Estimated setup time: **10–15 minutes**

---

## Required Software

### 1. Node.js v20 or later
```bash
node --version   # should print v20.x.x or higher
```
Download from: https://nodejs.org (choose LTS)

### 2. npm v9 or later (comes with Node)
```bash
npm --version    # should print 9.x.x or higher
```

### 3. Claude Code CLI
This is the primary AI tool you will use throughout the interview.

Install:
```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
```

Authenticate before the interview day:
```bash
claude   # follow the login prompt
```

> You need an Anthropic account. Sign up at https://claude.ai — a free account is sufficient.

### 4. Git
```bash
git --version
```

### 5. A code editor
VS Code is recommended. The Claude Code extension gives you inline AI assistance directly in the editor.

Install VS Code: https://code.visualstudio.com
Install the Claude Code extension: search "Claude Code" in the VS Code extensions panel.

---

## System Requirements

| Requirement | Minimum |
|---|---|
| OS | macOS, Linux, or Windows (WSL2) |
| RAM | 8 GB |
| Disk | 1 GB free |
| Internet | Required (Claude Code needs API access) |

---

## What You'll Be Working On

A full-stack TypeScript application with:
- **Frontend:** React + Vite + TanStack Query + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite (file-based, zero setup)

You do not need to know these tools in depth — the AI CLI is there to help you navigate unfamiliar code. What matters is how you use it.

---

## Pre-Interview Checklist

Run through this the day before your interview:

- [ ] `node --version` prints v20+
- [ ] `npm --version` prints 9+
- [ ] `claude --version` works
- [ ] You can open `claude` in a terminal and get a response
- [ ] VS Code is open and the Claude Code extension is installed
- [ ] You have a stable internet connection

---

## On the Day

You will receive a repository link at the start of the interview. Setup is two commands:

```bash
npm run setup   # installs all dependencies (~1 min)
npm run dev     # starts the app
```

The app opens at **http://localhost:5173**

- No database setup required
- No environment variables required
- No external services required

---

## Questions?

If you hit any setup issues before the interview, reach out to your interviewer so we can resolve them in advance — not during the session.
