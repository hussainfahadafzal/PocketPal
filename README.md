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

*Works in any browser · Installable on your phone (no Play Store needed)*

</div>

---

## 📖 What is PocketPal?

Most students get a fixed budget — pocket money or an allowance — and by the 20th it's gone with no idea where it went. Every finance app out there is built for adults: too complex, too boring to open twice.

**PocketPal** flips that. Tell it your budget and when you'll get money next, and it gives you **one number every morning** — *"Today you can spend ₹340."* Not this week. Not this month. **Today.** That single number turns the abstract ("I have ₹8000") into something concrete you can act on.

Then it makes saving a game: streaks for staying disciplined, a round-up jar that saves your spare change, and a PocketScore that grows with good habits.

> 💡 PocketPal tracks spending intent — real payments happen in your own UPI app (PhonePe / Google Pay / Paytm). **No money is ever stored or moved by PocketPal.**

---

## 📲 How to Download & Install

PocketPal is a **Progressive Web App (PWA)** — it runs in your browser *and* installs like a real app, without any app store.

### On Android (Chrome)
1. Open **[pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)** in Chrome.
2. Tap the **⋮ menu** (top-right) → **"Add to Home screen"** / **"Install app"**.
3. Confirm → the PocketPal icon appears on your home screen.
4. Open it → it runs full-screen, just like a native app.

### On iPhone (Safari)
1. Open **[pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)** in Safari.
2. Tap the **Share** button → **"Add to Home Screen"**.
3. Tap **Add** → the icon appears on your home screen.

### On Desktop
Just open **[pocketpal4u.vercel.app](https://pocketpal4u.vercel.app)** in any browser — or click the **install icon** in the address bar (Chrome/Edge) to install it as a desktop app.

> First load after inactivity may take ~30–50 seconds (free hosting wakes the server up). After that it's instant.

---

## 🚀 How to Use

1. **Sign up** — create an account with your name, email, and password. You stay logged in for 7 days.
2. **Onboard** — enter your current balance and choose your cycle: a *refill date* (when you'll get money) **or** *"make this last X days"* (great for irregular pocket money). Set a savings goal if you want.
3. **Add categories** — on first login, add a few starter categories (Food, Travel, Shopping, Bills) with one tap, or create your own with spending caps.
4. **Log an expense** — enter the amount, pick a category, add a note.
5. **Pay via UPI** — tap *Pay*, enter the payee's UPI ID or phone number, and choose **PhonePe / Google Pay / Paytm** — the amount is prefilled in your UPI app. The expense is logged automatically.
6. **Watch your day update** — your daily spend limit recalculates instantly, your streak grows, and spare change drops into your savings jar.
7. **Check Analysis & PocketScore** — see where your money goes and how your financial discipline is trending.

---

## ✨ Features

**🎯 Daily Spend Limit** — the core. One number every morning:
```
Daily Limit = (Balance − Savings Goal) ÷ Days Left in Cycle
```
Cycles aren't tied to calendar months — set a refill date or a day count. Works for students with irregular income, freelancers, anyone. Reset with one tap when money comes in.

**🔥 Streak Calendar** — a heatmap of every day you stayed under your limit. The streak counter animates up; miss a day and it resets. Makes you think before that third chai.

**🪙 Savings Jar (Round-up)** — every expense rounds up to the nearest ₹10 and the spare lands in your jar automatically. Set a named goal (Goa trip, new phone) and watch the progress bar fill. A 7-day streak **doubles** your round-ups. *(Virtual tracker — shows what you could save; PocketPal never holds funds.)*

**💳 UPI Payment** — log an expense and pay through **PhonePe, Google Pay, or Paytm** with the amount prefilled. PocketPal only tracks; the payment happens in your own app.

**🤖 Pal Nudges** — pattern-based insights from your real spending ("You spend most on Saturdays", "Over budget on Food"), surfaced as a Financial Personality card.

**💜 PocketScore** — a 0–850 score from budget discipline, saving rate, and streaks, with tips to improve. *(Display-only in MVP; credit/lending is future scope.)*

**📊 Spending Analysis** — category donut chart + daily spend trend, for any month.

**🔐 Secure Auth** — JWT-based login, 7-day sessions, fully isolated per-user data.

---

## 📱 App Structure

| Tab | What's there |
|---|---|
| **Dashboard** | Daily spend limit, streak badge, Pal nudge, quick stats, streak calendar, jar summary |
| **History** | Full expense log, filterable by month and category |
| **Budgets** | Create and manage spending categories with caps |
| **Jar** | Savings jar total, goal progress, round-up toggle |
| **Analysis** | Category donut + daily spend chart, per month |
| **PocketScore** | Your financial score with improvement tips |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, React Router |
| **Backend** | FastAPI, SQLAlchemy, Pydantic v2, JWT (python-jose) |
| **Database** | PostgreSQL (Neon) · SQLite (local dev) |
| **PWA** | vite-plugin-pwa + Workbox |
| **Hosting** | Vercel (frontend) · Render (backend) · Neon (database) |

```
React PWA (Vercel)  ──── REST / JWT ────▶  FastAPI (Render)  ────▶  PostgreSQL (Neon)
```

---

## 💻 Running Locally

Requires **Python 3.12+** and **Node 18+**.

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
Generate a secret: `python -c "import secrets; print(secrets.token_hex(32))"`
```bash
uvicorn app.main:app --reload      # docs at http://localhost:8000/docs
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
npm run dev      # http://localhost:5173
```
Run both in separate terminals.

---

## ☁️ Deployment

| Component | Platform | Notes |
|---|---|---|
| Database | **Neon** | Free PostgreSQL, permanent (doesn't expire) |
| Backend | **Render** | Root `backend`, start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Frontend | **Vercel** | Root `frontend`, set `VITE_API_URL` to the Render URL |

Render env vars: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `FRONTEND_URL` (for CORS).

> Backend uses Python 3.12 (`runtime.txt`) with `bcrypt==4.1.2` pinned for compatibility.

---

## 🗺️ Roadmap

- ✅ **Phase 1 (live)** — Daily limit, UPI payment, budgets, streaks, round-up jar, Pal nudges, PocketScore, PWA
- 🔜 **Phase 2** — Social layer: split expenses with friends, anonymous savings feed, squad challenges, shareable streaks
- 🔮 **Phase 3** — Intelligence + credit: ML spend forecasting, PocketScore as a real reputation layer, micro-lending

---

<div align="center">

**Built with ❤️ by Fahad Afzal Hussain**

[**Try PocketPal →**](https://pocketpal4u.vercel.app) &nbsp;·&nbsp; *Spend Smart. Save Sharp.*

</div>