# Finora — Personal Finance Management & Forecasting Platform

A full-stack personal finance management platform featuring automated fiscal receipt scanning via PaddleOCR & OpenCV, multi-currency ledger management, time-series expenditure forecasting with Meta Prophet & ARIMA, and privacy-preserving financial insights powered by a local Llama 3 LLM via Ollama.

---

## Project Structure

```text
├── backend/                  # FastAPI Backend (Python 3.12 managed via Astral uv)
│   ├── alembic/              # Database migration scripts & configuration
│   ├── alembic.ini           # Alembic configuration
│   ├── app/
│   │   ├── api/              # API endpoints and dependency injection
│   │   │   ├── deps.py       # Database session and JWT authentication dependencies
│   │   │   └── v1/           # REST API v1 routes (auth, accounts, categories, transactions, receipts, analytics, assistant)
│   │   ├── core/             # Configuration, security & database session lifecycle
│   │   │   ├── config.py     # Pydantic Settings (.env management)
│   │   │   ├── database.py   # Async SQLAlchemy 2.0 Engine & session factory
│   │   │   └── security.py   # Bcrypt password hashing & JWT token utilities
│   │   ├── models/           # SQLAlchemy 2.0 ORM models (User, Account, Category, Transaction, Receipt)
│   │   ├── schemas/          # Pydantic v2 validation & serialization schemas
│   │   ├── services/         # Domain logic (Ledger, Currency, OCR, Forecasting, AI Assistant)
│   │   └── main.py           # FastAPI application entrypoint & lifespan manager
│   ├── Dockerfile            # Production multi-stage Dockerfile with Astral uv
│   ├── pyproject.toml        # Python dependencies & project metadata
│   └── .env.example          # Sample environment variables
│
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS + Recharts
│   ├── src/
│   │   ├── api/              # Axios HTTP client with silent JWT refresh & typed API modules
│   │   ├── components/       # Dashboard UI, Transaction Modal, Receipt Scanner, Analytics & AI Assistant
│   │   ├── utils/            # Multi-currency conversion & formatting utilities
│   │   ├── App.tsx           # Application state & view router
│   │   └── index.css         # Tailwind CSS entrypoint
│   ├── Dockerfile            # Multi-stage build with unprivileged Nginx runtime
│   ├── nginx.conf.template   # Reverse proxy & SPA routing configuration
│   ├── vite.config.ts        # Vite configuration with /api reverse proxy
│   └── package.json          # Node dependencies
│
├── docker-compose.yml        # Full-stack orchestration (Frontend, Backend, PostgreSQL 16, pgAdmin 4, Ollama)
└── README.md                 # Project documentation and setup instructions
```

---

## Key Features

- **Unified Multi-Currency Ledger**: Manage spending, cash, card, and dedicated savings accounts with automatic base-currency normalization (`EUR`) and dynamic conversion across supported currencies (`EUR`, `RSD`, `USD`, `GBP`, `CHF`, `CAD`, `AUD`, `JPY`).
- **Hierarchical Categories & Batch Operations**: Organize income and expenses across parent categories and subcategories, filter by account or tag, mass-edit transactions, and import/export ledgers in CSV and JSON formats.
- **Automated Fiscal Receipt Scanner**: Preprocess thermal receipt photos using OpenCV (bilateral filtering & CLAHE adaptive contrast enhancement) and extract merchant line items, dates, currencies, and totals with PaddleOCR.
- **Financial Analytics & Time-Series Forecasting**: Visualize category breakdowns, monthly cashflow trends, and savings rates with interactive Recharts dashboards, plus next-month expenditure projections combining Meta Prophet and ARIMA models.
- **Local AI Financial Advisor**: Generate executive financial summaries and interactive chat recommendations grounded in deterministic ledger metrics using local `llama3:8b` inference via Ollama, with a built-in rule-based fallback engine.

---

## Quickstart Guide

### 1. Run via Docker Compose (Full Stack + PostgreSQL + Ollama)

Launch the complete stack (Frontend Nginx, FastAPI Backend with automatic Alembic migrations, PostgreSQL 16, pgAdmin 4, and GPU-accelerated Ollama with `llama3:8b`):

```bash
docker compose up --build -d
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API & Swagger Docs**: `http://localhost:8000` (`/docs`)
- **PostgreSQL 16**: `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `finance_tracker`)
- **pgAdmin 4**: `http://localhost:5050` (Email: `admin@admin.com`, Password: `admin`, pre-configured with `Finora PostgreSQL`)
- **Ollama (Local LLM)**: `http://localhost:11434` (Model: `llama3:8b`, pulled automatically on startup)

---

### 2. Local Backend Development (`uv` Astral)

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

- **API Base**: `http://127.0.0.1:8000`
- **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/health`

---

### 3. Local Frontend Development (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The development server starts at `http://localhost:5173` and proxies `/api/*` requests to `http://127.0.0.1:8000`.
