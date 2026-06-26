<div align="center">

# 💸 PocketPal

### Spend Smart. Save Sharp.

**A student-first expense tracker that makes saving money feel addictive — like scrolling Instagram, not using a bank app.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

### 🔗 **[Live App → pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)**

*Works in any browser · Installs on your phone in 2 taps · No app store needed*

</div>

---

## 📖 What is PocketPal?

Most students get a fixed budget — pocket money or an allowance — and by the 20th it's gone with no idea where it went. Every finance app out there is built for adults: too complex, too boring to open twice.

**PocketPal** flips that. Tell it your budget and when you'll get money next, and it gives you **one number every morning** — *"Today you can spend ₹340."* Not this week. Not this month. **Today.** That single number turns the abstract ("I have ₹8000") into something concrete you can act on.

Then it makes saving a game: streaks for staying disciplined, a round-up jar that saves your spare change, and a PocketScore that grows with good habits.

> 💡 PocketPal tracks spending intent — real payments happen in your own UPI app (PhonePe / Google Pay / Paytm). **No money is ever stored or moved by PocketPal.**

---

## 📲 Install on Your Phone (No App Store)

PocketPal is a **Progressive Web App (PWA)** — it runs in your browser and installs like a native app in 2 taps.

### Android (Chrome / Samsung Internet)

1. Open **[pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)** in Chrome
2. Tap the **⋮ menu** (top-right corner) → **"Add to Home screen"** or **"Install app"**
3. Tap **Install** → the PocketPal icon appears on your home screen
4. Open it from the home screen → runs full-screen, no browser bar

> If you don't see the prompt, look for a small **install icon (⊕)** in the address bar.

### iPhone / iPad (Safari only)

1. Open **[pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)** in **Safari** (must be Safari — Chrome on iOS doesn't support PWA install)
2. Tap the **Share button** (box with arrow pointing up, bottom of screen)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add** (top-right) → icon appears on your home screen

### Desktop (Chrome / Edge / Brave)

1. Open **[pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)**
2. Click the **install icon** in the address bar (looks like a monitor with a download arrow)
3. Click **Install** → PocketPal opens as a standalone desktop app

Or just use it directly in the browser — no install needed.

> **First load note:** The backend is on Render's free tier and sleeps after 15 minutes of inactivity. The very first open after a break may take **30–50 seconds** to wake up. After that it's instant.

---

## 🚀 How to Use

1. **Sign up** — create an account with your name, email, and password. You stay logged in for 7 days.
2. **Set your budget** — enter your current balance and choose your cycle:
   - *Refill date* — when you'll get money next (salary, pocket money, etc.)
   - *"Make this last X days"* — great for irregular or one-time amounts
   - Optionally set a savings goal to reserve from your balance
3. **Add categories** — create spending categories (Food, Travel, Shopping, Bills) with optional caps, or make your own
4. **Log an expense** — enter the amount, pick a category, add a note
5. **Pay via UPI** — tap *Pay*, enter the payee's UPI ID or phone number, then pick **PhonePe / Google Pay / Paytm** — the amount is prefilled in your UPI app
6. **Watch your limit update** — your daily spend limit recalculates instantly, your streak grows, spare change auto-drops into your savings jar
7. **Check Analysis & PocketScore** — see where your money goes and how your financial discipline is trending

---

## ✨ Features

**🎯 Daily Spend Limit** — the core feature. One number every morning:
```
Daily Limit = (Balance − Savings Goal) ÷ Days Left in Cycle
```
Cycles aren't tied to calendar months — set a refill date or a day count. Works for students with irregular income, freelancers, anyone. Reset with one tap when money comes in.

**🔥 Streak Calendar** — a heatmap of every day you stayed under your limit. The streak counter animates up; miss a day and it resets. Makes you think before that third chai.

**🪙 Savings Jar (Round-up)** — every expense rounds up to the nearest ₹10 and the spare change lands in your jar automatically. Set a named goal (Goa trip, new phone) and watch the progress bar fill. A 7-day streak **doubles** your round-ups.

**💳 UPI Payment** — log an expense and pay through **PhonePe, Google Pay, or Paytm** with the amount prefilled. Enter any UPI ID or phone number — PocketPal normalizes it automatically. Payments happen in your own UPI app; PocketPal only tracks.

**🤖 Pal Nudges** — pattern-based insights from your real spending ("You spend most on Saturdays", "Over budget on Food this week"), surfaced as a Financial Personality card on the dashboard.

**💜 PocketScore** — a 0–850 score computed from budget discipline, saving rate, and streaks, with actionable tips to improve.

**📊 Spending Analysis** — category donut chart + daily spend bar chart for any month.

**🔒 Split Expenses** — split bills with friends by email. Supports equal splits or custom amounts, with settle-up tracking.

**🔐 Secure Auth** — JWT-based login, 7-day sessions, bcrypt-hashed passwords, fully isolated per-user data.

---

## 📱 App Screens

| Tab | What's there |
|---|---|
| **Dashboard** | Daily spend limit, streak badge, Pal nudge, quick stats, streak calendar, jar summary |
| **+ Add** | Log an expense with amount, category, note, and UPI pay button |
| **History** | Full expense log, filterable by month and category, delete with confirmation |
| **Split** | Split bills with friends, track who owes what, mark as settled |
| **Budgets** | Create and manage spending categories with monthly caps |
| **Jar** | Savings jar total, named goal progress, round-up toggle |
| **Analysis** | Category donut + daily spend chart, per month |
| **PocketScore** | Financial score breakdown with improvement tips |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, React Router v6 |
| **Backend** | FastAPI, SQLAlchemy, Pydantic v2, JWT (python-jose), bcrypt |
| **Database** | PostgreSQL (Neon serverless) · SQLite (local dev) |
| **PWA** | vite-plugin-pwa + Workbox (offline support, auto-update) |
| **Hosting** | Vercel (frontend) · Render (backend) · Neon (database) |

```
React PWA (Vercel)  ──── REST / JWT ────▶  FastAPI (Render)  ────▶  PostgreSQL (Neon)
```

---

## 💻 Running Locally

### Prerequisites

- **Python 3.12+** — [python.org](https://python.org)
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)

### 1. Clone the repo

```bash
git clone https://github.com/hussainfahadafzal/pocketpal.git
cd pocketpal
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/app/.env`:

```env
DATABASE_URL=sqlite:///./pocketpal.db
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
FRONTEND_URL=http://localhost:5173
```

Generate a secure JWT secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Start the backend:
```bash
uvicorn app.main:app --reload
```

API runs at **http://localhost:8000** · Interactive docs at **http://localhost:8000/docs**

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the dev server:
```bash
npm run dev
```

App runs at **http://localhost:5173**

### Project structure

```
pocketpal/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # JWT helpers
│   │   ├── database.py      # DB connection + session
│   │   ├── config.py        # Settings (reads .env)
│   │   ├── utils.py         # Business logic helpers
│   │   └── routers/         # Route handlers per feature
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/           # One file per screen
    │   ├── components/      # Shared UI (TopBar, BottomNav, Button, Input)
    │   ├── context/         # AuthContext (JWT + user state)
    │   └── main.jsx         # Entry point + SW registration
    ├── public/icons/        # PWA icons (192px, 512px, maskable)
    ├── index.html
    └── vite.config.js       # Vite + PWA config
```

---

## ☁️ Deploying Your Own Instance

### Database — Neon (free, permanent)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **connection string** (starts with `postgresql://`)
3. Use this as your `DATABASE_URL`

### Backend — Render (free tier)

1. Connect your GitHub repo at [render.com](https://render.com)
2. New **Web Service** → select the repo
3. Set **Root Directory** to `backend`
4. **Runtime:** Python 3
5. **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET_KEY` | Random 64-char hex string |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
| `FRONTEND_URL` | Your Vercel URL (for CORS) |

> Add a `runtime.txt` file in `backend/` containing `python-3.12.0` to pin the Python version.

### Frontend — Vercel (free)

1. Import your GitHub repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite** (auto-detected)
4. Add environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL (e.g. `https://pocketpal-api.onrender.com`) |

5. Deploy → every `git push` to `main` auto-deploys both frontend and backend.

---

## 🗺️ Roadmap

- ✅ **Phase 1 (live)** — Daily limit, UPI payment, budgets, streaks, round-up jar, Pal nudges, PocketScore, split expenses, PWA
- 🔜 **Phase 2** — Social layer: anonymous savings feed, squad challenges, shareable streaks, recurring expense templates
- 🔮 **Phase 3** — Intelligence + credit: ML spend forecasting, PocketScore as a real reputation layer, micro-lending

---

<div align="center">

**Built with ❤️ by Fahad Afzal Hussain**

[**Try PocketPal →**](https://pocketpal4u.vercel.app) &nbsp;·&nbsp; *Spend Smart. Save Sharp.*

</div>
