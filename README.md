<div align="center">

# Attendly

### AI-Powered Attendance Manager

<br/>

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

<br/>

A modern, full-stack web app for tracking student attendance with **Excel import/export**, **multi-section management**, and **AI-powered analytics**.

[Live Demo](#-live-demo) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Quick Start](#-quick-start) · [Deploy](#-deploy-on-vercel--aiven)

<br/>

![Attendly Banner](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Attendly+-+AI+Attendance+Manager)

</div>

---

## Live Demo

| | |
|---|---|
| **Login** | `admin` / `admin123` |
| **Frontend** | [your-frontend.vercel.app](https://your-frontend.vercel.app) |
| **Backend API** | [your-backend.vercel.app/api/health](https://your-backend.vercel.app/api/health) |

---

## Features

<details>
<summary><b> Student Data Import</b></summary>
<br/>

- Drag-and-drop upload for `.xlsx`, `.xls`, `.csv`
- Auto-detect columns (Name, Roll No, Email)
- Manual column mapping override
- Validation with duplicate detection
- Preview first 10 rows before importing

</details>

<details>
<summary><b> Daily Attendance Marking</b></summary>
<br/>

- Calendar picker with "Today" default
- Section/Subject filter in header
- **Quick mode:** Click to toggle Present/Absent/Late/Excused
- **Bulk mode:** "Mark All Present" then uncheck absentees
- **Keyboard shortcuts:** `P` `A` `L` `E` keys
- Real-time save indicator

</details>

<details>
<summary><b> Excel Export with Analytics</b></summary>
<br/>

- **Raw Data sheet** — one row per attendance record
- **Summary sheet** — COUNTIF formulas per student
- Attendance % with conditional formatting:
  - <75% **Red** · 75-85% **Yellow** · >85% **Green**
- Custom date range export
- Professional formatting with headers and borders

</details>

<details>
<summary><b> Multi-Section/Subject Management</b></summary>
<br/>

- Hierarchy: Academic Year → Section → Subject
- Tree-view management interface
- CRUD for all entities
- Teacher assignment mapping
- Quick context switching via header dropdowns

</details>

<details>
<summary><b> AI Assistant</b></summary>
<br/>

- **Provider agnostic:** OpenAI, Anthropic, Gemini, Ollama, Custom
- Pre-built prompt templates:
  - Generate attendance report summary
  - Identify at-risk students (<75%)
  - Draft parent notification email
  - Predict end-term attendance
- Auto-injects attendance context into prompts
- Response history with local storage

</details>

<details>
<summary><b> Dashboard & Analytics</b></summary>
<br/>

- Stats cards (students, sections, subjects, attendance rate)
- 30-day attendance trend line chart
- Section-wise attendance bar chart
- At-risk students table
- Heatmap data endpoint

</details>

<details>
<summary><b> Admin Tools</b></summary>
<br/>

- Role-based access (Admin, Teacher, TA, Viewer)
- Full audit log with filters
- JWT authentication
- Persistent PostgreSQL database

</details>

<details>
<summary><b> PWA & Offline Support</b></summary>
<br/>

- Service worker with offline caching
- Background sync for queued data
- Installable on mobile/desktop
- Responsive design

</details>

---

## Tech Stack

<table>
<tr>
<td><b>Frontend</b></td>
<td>React 18, TypeScript, Vite, TailwindCSS, Recharts, Zustand, TanStack Query, SheetJS</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>Python, FastAPI, SQLAlchemy (async), Pydantic v2</td>
</tr>
<tr>
<td><b>Database</b></td>
<td>PostgreSQL (Aiven free tier) / SQLite (local dev)</td>
</tr>
<tr>
<td><b>Auth</b></td>
<td>JWT (python-jose + bcrypt)</td>
</tr>
<tr>
<td><b>AI</b></td>
<td>OpenAI, Anthropic, Gemini, Ollama, Custom endpoints</td>
</tr>
<tr>
<td><b>Deploy</b></td>
<td>Vercel (frontend + backend), Aiven (database)</td>
</tr>
</table>

---

## Project Structure

```
attendly/
├── backend/                  # FastAPI API
│   ├── app/
│   │   ├── main.py          # App entry, CORS, lifespan
│   │   ├── database.py      # Async SQLAlchemy + SQLite/PostgreSQL
│   │   ├── models.py        # 10 database models
│   │   ├── schemas.py       # Pydantic v2 schemas
│   │   ├── utils.py         # JWT auth, password hashing
│   │   └── routers/
│   │       ├── auth.py      # Login / register / me
│   │       ├── students.py  # CRUD + Excel/CSV import
│   │       ├── attendance.py # Single + bulk marking
│   │       ├── sections.py  # Years, sections, subjects
│   │       ├── export.py    # Excel export with formulas
│   │       ├── ai.py        # Multi-provider AI chat
│   │       ├── dashboard.py # Stats, trends, at-risk
│   │       └── audit.py     # Audit log viewer
│   ├── api/index.py         # Vercel serverless entry
│   ├── vercel.json          # Vercel config
│   └── requirements.txt
│
├── frontend/                 # React SPA
│   └── src/
│       ├── pages/           # 9 pages
│       ├── components/      # UI + Layout components
│       ├── store/           # Zustand stores
│       ├── hooks/           # useApi with auth
│       ├── types/           # TypeScript types
│       └── lib/             # Utilities
│   ├── vercel.json          # SPA rewrites
│   └── package.json
│
├── Dockerfile               # Docker deployment
├── render.yaml              # Render auto-deploy
└── .gitignore
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Python](https://python.org/) 3.10+

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/attendly.git
cd attendly

# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Seed Database

```bash
cd backend
python -m app.main seed
```

This creates:
- Admin user: `admin` / `admin123`
- 1 Academic Year, 1 Section, 3 Subjects
- 8 sample students
- 672 attendance records

### 3. Run Locally

```bash
# Terminal 1 — Backend
cd backend
python -m app.main
# Runs on http://localhost:8000

# Terminal 2 — Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 4. Open

Visit [http://localhost:5173](http://localhost:5173) and login with `admin` / `admin123`.

---

## Deploy on Vercel + Aiven

### Database (Aiven)

1. Sign up at [console.aiven.io](https://console.aiven.io) (no credit card)
2. Create **PostgreSQL** service → Free plan
3. Copy connection string:
   ```
   postgresql+asyncpg://avnadmin:PASSWORD@HOST:19110/defaultdb?ssl=require
   ```

### Backend (Vercel)

1. Import repo on [vercel.com](https://vercel.com)
2. Settings:
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
3. Environment Variables:
   ```
   DATABASE_URL = postgresql+asyncpg://avnadmin:PASSWORD@HOST:19110/defaultdb?ssl=require
   CORS_ORIGINS = https://your-frontend.vercel.app
   ```

### Frontend (Vercel)

1. Import **same repo** again
2. Settings:
   - Root Directory: `frontend`
   - Build: `npm run build`
   - Output: `dist`
3. Environment Variables:
   ```
   VITE_API_URL = https://your-backend.vercel.app
   ```

### Seed Production DB

Visit: `https://your-backend.vercel.app/api/seed`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login → JWT token |
| `POST` | `/api/auth/register` | Register new user |
| `GET` | `/api/auth/me` | Current user info |
| `GET` | `/api/students` | List students |
| `POST` | `/api/students` | Create student |
| `POST` | `/api/students/import` | Bulk import from Excel/CSV |
| `POST` | `/api/attendance/mark` | Mark single attendance |
| `POST` | `/api/attendance/bulk` | Bulk mark attendance |
| `GET` | `/api/attendance/summary/{s}/{sub}` | Student attendance summary |
| `GET` | `/api/export/excel` | Export Excel with formulas |
| `GET` | `/api/sections/years` | List academic years |
| `GET` | `/api/sections` | List sections |
| `GET` | `/api/sections/subjects` | List subjects |
| `POST` | `/api/ai` | AI chat with context |
| `GET` | `/api/dashboard/stats` | Dashboard statistics |
| `GET` | `/api/dashboard/by-date` | Attendance trend data |
| `GET` | `/api/dashboard/at-risk` | At-risk students |
| `GET` | `/api/audit` | Audit log |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `P` | Mark next student **Present** |
| `A` | Mark next student **Absent** |
| `L` | Mark next student **Late** |
| `E` | Mark next student **Excused** |

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | PostgreSQL connection string (defaults to SQLite) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `*`) |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API URL (default: empty = same origin) |

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using React, FastAPI & PostgreSQL**

If this helped you, consider giving it a ⭐

</div>
