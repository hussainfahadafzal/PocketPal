<div align="center">

# PocketPal

**Spend Smart. Save Sharp.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

[Live Demo](https://pocketpal.vercel.app) &nbsp;·&nbsp; [Report a Bug](https://github.com/hussainfahadafzal/pocketpal/issues)

</div>

---

## What is this?

I built PocketPal because I kept running out of money before the month ended and had no idea where it went. Every finance app I tried was either too complex or too boring to open twice.

The idea is simple: tell it your budget and when you'll get paid next, and it figures out exactly how much you can spend today. Not this week. Not this month. **Today.** That one number changes everything — it makes the abstract ("I have ₹8000") concrete ("I can spend ₹340 today").

The streak calendar, savings jar, and score came later. Turns out making saving feel like a game is not a gimmick — it actually works.

> PocketPal tracks spending intent. Real payments happen on PhonePe / GPay / Paytm. No money is stored or moved.

---

## Screenshots

| Dashboard | Savings Jar | Streak Calendar |
|:--:|:--:|:--:|
| <img src="screenshots/dashboard.png" width="220"/> | <img src="screenshots/jar.png" width="220"/> | <img src="screenshots/streak.png" width="220"/> |

| Budgets | Spending Analysis | Add Expense |
|:--:|:--:|:--:|
| <img src="screenshots/budgets.png" width="220"/> | <img src="screenshots/analysis.png" width="220"/> | <img src="screenshots/add.png" width="220"/> |

---

## Features

**Daily Spend Limit**

The core of the app. Every morning it calculates:

```
Daily Limit = (Balance − Savings Goal) ÷ Days Left in Cycle
```

Budget cycles aren't tied to a calendar month — you set a refill date or just say "make this last 30 days." Works for students who get pocket money at random, freelancers waiting on invoices, anyone with irregular income. When your money refills, you reset the cycle with one tap.

**Streak Calendar**

A heatmap of every day you stayed under your limit. Green day = under budget, red day = over. The streak counter animates when it goes up. Missing a day resets it to zero. It sounds harsh but that's the point — you actually stop and think before the third chai.

**Savings Jar**

Has its own page. Every expense you log rounds up to the nearest ₹10 and the spare lands in the jar automatically — no action needed. Log ₹47, ₹3 goes to the jar. Small enough that you don't feel it, meaningful enough that it adds up over a month.

Set a named goal (Goa trip, new phone, whatever) and watch the progress bar fill. Keep a 7-day streak and every round-up doubles.

**Budgets**

Category management. Create spending categories, set a monthly cap per category, and see a progress bar showing how much of that cap you've used. Goes red when you're over. That's it — clean and focused.

**Pal Nudges**

Pattern-based observations from your actual spending. When you tend to overspend, which categories are eating your budget, whether you're on track. Surfaces in the Analysis tab as a Financial Personality card.

**Spending Analysis**

Category breakdown (donut chart) and daily spend trend (bar chart), for any month you pick.

**Split Expenses**

Split any bill with friends and track who owes whom — built into the same budget you already use.

Add friends by email or a `PKT-XXXXX` invite code (no open name search — privacy first). Create a split, choose equal or custom shares, and PocketPal auto-records each person's share as an expense in their own budget so it counts against their daily limit without any manual entry.

The Balances tab runs a **Min Cash Flow** simplification algorithm on the full debt graph. If Alice pays dinner (B and C owe her), then Bob pays taxi (Alice and C owe him), PocketPal collapses the four gross debts into the minimum number of payments — B drops out because his net position is zero, leaving just `C → Alice ₹X`. You always see the smallest number of payments you need to make, not a wall of individual debts.

Settling is one tap: confirm → checkmark animation → the row slides out live. When your last outstanding balance clears, a confetti burst fires. Settlement marks the underlying DB records as settled; the simplified view auto-updates on the next re-fetch.

**PWA**

Add to Home Screen on Android or iOS. Opens full-screen, no browser chrome, no app store.

---

## App Structure

Six tabs in the bottom nav:

| Tab | What's there |
|---|---|
| **Home** | Daily spend limit, streak badge, Pal nudge, quick stats, streak calendar, savings jar summary |
| **History** | Full expense log, filterable by month and category |
| **Split** | Simplified balance hero, friends management, new split form, split history |
| **Budgets** | Create and manage spending categories with optional caps |
| **Jar** | Savings jar total, goal progress, round-up toggle, set/edit goal |
| **Analysis** | Donut chart by category + daily bar chart, per month |

---

## Tech Stack

| | |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Framer Motion, Recharts, React Router |
| **Backend** | FastAPI, SQLAlchemy, Pydantic v2, python-jose (JWT) |
| **Database** | PostgreSQL (production) · SQLite (local dev) |
| **PWA** | vite-plugin-pwa + Workbox |
| **Hosting** | Vercel (frontend) · Render (backend) · Neon (PostgreSQL) |

```
React PWA (Vercel)  ──── REST/JWT ────▶  FastAPI (Render)  ────▶  PostgreSQL (Neon)
```

---

## Running locally

You need Python 3.10+ and Node 18+.

**Backend**

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./pocketpal.db
JWT_SECRET_KEY=your-secret-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

Generate a secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

```bash
uvicorn app.main:app --reload
# docs at http://localhost:8000/docs
```

**Frontend**

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
# at http://localhost:5173
```

Run both in separate terminals.

---

## Deployment

| Component | Platform |
|---|---|
| Database | Neon (free PostgreSQL tier) |
| Backend | Render — root dir `backend`, start cmd: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Frontend | Vercel — root dir `frontend`, set `VITE_API_URL` to your Render backend URL |

Set `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, and `FRONTEND_URL` (for CORS) in Render's environment variables.

---

## Roadmap

The MVP is live. Here's what comes next:

- **Phase 2** ✅ — social layer: split expenses, friends via invite code, debt simplification, settlement animations
- **Phase 3** — community: anonymous savings feed, squad challenges, shareable streak cards, push notifications
- **Phase 4** — intelligence: ML-based spend forecasting, smarter Pal nudges, bank statement import
- **Phase 5** — credit: PocketScore as a real financial reputation layer, micro-lending through NBFC partners

---

## About

Built by **Fahad Afzal Hussain** — Founder & CEO, PocketPal.
