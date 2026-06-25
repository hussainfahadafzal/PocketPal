<div align="center">

# 💸 PocketPal

### Spend Smart. Save Sharp.

**A student-first expense tracker that makes saving money feel addictive — like scrolling Instagram, not using a bank app.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**🔗 Live Demo: [pocketpal.vercel.app](https://<your-vercel-url>.vercel.app)** &nbsp;•&nbsp; 📱 Installable as an app (Add to Home Screen)

</div>

---

## 📖 Overview

Most students get a fixed budget from parents — and by the 20th, the money's gone with no idea where it went. Existing finance apps are built for adults and feel like spreadsheets.

**PocketPal** flips this. It gives students **one number every morning** — *"Today you can spend ₹340"* — and turns saving into a game with streaks, a round-up savings jar, and a personal financial score. Built as a **Progressive Web App (PWA)**, it installs on any phone without the Play Store.

> 💡 PocketPal tracks spending intent — real payments happen on PhonePe / Google Pay / Paytm. **No money is stored or moved by PocketPal.**

---

## ✨ Features

### 🎯 Daily Spend Limit (core)
One personalized number every day, recalculated automatically:
```
Daily Limit = (Balance − Savings Goal) ÷ Days Left in Cycle
```
- **Flexible budget cycle** — works for any income pattern. Set a refill date *or* just "make this last X days" (perfect for irregular student income).
- Recalculates after every expense.

### 🔥 Savings Streaks + Calendar
Stay under your daily limit → build a streak. A monthly calendar lights up 🔥 for every disciplined day — same habit-loop psychology as Duolingo.

### 🪙 Round-up Savings Jar
Every expense rounds up to the next ₹10, and the spare is stashed in a virtual **Savings Jar** with a goal (e.g. *"Goa Fund ₹2000"*) and progress bar.
- **Combo reward:** a 7-day streak unlocks **2× round-up**.
- *(Virtual tracker — shows what you could save; PocketPal never holds funds.)*

### 🤖 Pal — Rule-based Nudges
Proactive, friendly insights from your spending: *"You spend most on Saturdays"*, *"You're over budget on Food"*, *"Nice — under your limit today 🔥"*, plus a **Financial Personality** card.

### 💜 PocketScore
A 0–850 financial score built from budget discipline, saving rate, streak strength, and category adherence — with tips on how to level up. *(Display-only in MVP; credit/lending is future scope.)*

### 📊 Spending Analysis
Category-wise donut chart, daily spend trend, and full expense history with month + category filters.

### 📱 Installable PWA
Add to Home Screen → full-screen, app-like experience on any phone. No Play Store needed.

### 🔐 Secure Auth
JWT-based registration and login. Every user's data is fully isolated.

---

## 📸 Screenshots

<!-- Apne app ke screenshots yahan daal. Dashboard hero zaroor. -->
<div align="center">

| Dashboard (Daily Limit) | Streak Calendar | Savings Jar |
|:--:|:--:|:--:|
| <img src="screenshots/dashboard.png" width="220"/> | <img src="screenshots/streak.png" width="220"/> | <img src="screenshots/jar.png" width="220"/> |

| Spending Analysis | PocketScore | Add Expense |
|:--:|:--:|:--:|
| <img src="screenshots/analysis.png" width="220"/> | <img src="screenshots/score.png" width="220"/> | <img src="screenshots/add.png" width="220"/> |

</div>

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Tailwind CSS, React Router, Recharts, Framer Motion |
| **Backend** | FastAPI (Python), SQLAlchemy |
| **Database** | PostgreSQL (production) / SQLite (local dev) |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |
| **App** | PWA (vite-plugin-pwa) — installable, offline shell |
| **Hosting** | Vercel (frontend) · Render (backend) · Neon (PostgreSQL) |

### Architecture

```
┌─────────────────┐      REST API (JWT)      ┌──────────────────┐      SQLAlchemy      ┌──────────────┐
│   React (PWA)    │ ───────────────────────► │   FastAPI         │ ───────────────────► │  PostgreSQL  │
│   Vercel         │ ◄─────────────────────── │   Render          │ ◄─────────────────── │  Neon        │
└─────────────────┘        JSON               └──────────────────┘                      └──────────────┘
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone
```bash
git clone https://github.com/<your-username>/pocketpal.git
cd pocketpal
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
```
Create `backend/.env`:
```env
DATABASE_URL=sqlite:///./pocketpal.db
JWT_SECRET_KEY=your-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```
> Generate a secret: `python -c "import secrets; print(secrets.token_hex(32))"`

Run:
```bash
uvicorn app.main:app --reload
```
API docs → `http://localhost:8000/docs`

### 3. Frontend
```bash
cd frontend
npm install
```
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```
Run:
```bash
npm run dev
```
App → `http://localhost:5173`

> Run backend and frontend in **two separate terminals**.

---

## ☁️ Deployment

| Component | Platform | Notes |
|---|---|---|
| Database | **Neon** | Free PostgreSQL — copy the connection string |
| Backend | **Render** | Root dir `backend`, start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Frontend | **Vercel** | Root dir `frontend`, set `VITE_API_URL` to the backend URL |

Backend env vars on Render: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `FRONTEND_URL` (for CORS).

---

## 🗺️ Roadmap

**✅ Phase 1 — MVP (current)**
Daily Spend Limit · Expense logging + UPI redirect · Budget categories · History + filters · Streaks · Round-up jar · Rule-based Pal nudges · PocketScore v0 · PWA · JWT auth

**🔜 Phase 2 — Social Layer**
FinFeed (anonymous savings feed) · Squad goals & challenges · Shareable streaks · Push notifications · CSV/PDF export

**🔮 Phase 3 — Intelligence & Credit**
ML-based spend predictions · PocketScore v2 + micro-lending (NBFC partners) · Brand challenge marketplace · Campus partnerships · Bank statement auto-import

---

## 👥 Team BrainFuel

B.Tech IT students building India's social fintech platform.

| Name | Role |
|---|---|
| **Fahad Afzal Hussain** | Full Stack + Product Lead |
| **Sameer Ahmad** | Backend Developer |
| **Kunal Bansal** | Frontend Developer |
| **Ujjwal Manocha** | Data & Analytics |

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by Team BrainFuel**

*Spend Smart. Save Sharp.*

</div>