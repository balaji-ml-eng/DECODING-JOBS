# DECODING JOBS

A map-based job search command center for tech students. Explore companies across South India on an interactive map, filter by sector/stage/city, search roles, and apply with one click.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL+PostGIS-16-336791)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

---

## Features

- **Interactive Map** — MapLibre GL with company pins, hiring glow animations, and zoom-level detail
- **Spatial Search** — Companies loaded by viewport bounding box via PostGIS
- **Smart Filters** — Sector, stage, area, city, and hiring status
- **Job Search** — Full-text search with autocomplete suggestions
- **Company Panel** — Salary, work mode, sentiment (pros/cons), culture score
- **1-Click Apply** — Submit applications with resume selection
- **Logo Proxy** — Server-side favicon caching for company logos

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Map | MapLibre GL, react-map-gl, Supercluster |
| State | Zustand, TanStack React Query |
| UI | Radix UI, Lucide Icons, class-variance-authority |
| Backend | FastAPI, SQLAlchemy 2 (async), Pydantic v2 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Infrastructure | Docker Compose |

---

## Project Structure

```
DECODING-JOBS/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router (pages + API routes)
│       │   ├── api/logo/       # Favicon proxy with LRU cache
│       │   ├── layout.tsx      # Root layout with providers
│       │   ├── page.tsx        # Home page (map + side panel)
│       │   └── providers.tsx   # React Query provider
│       ├── components/
│       │   ├── MapWorkspace.tsx    # Main map with pins, filters, search
│       │   ├── CompanySidePanel.tsx # Company detail + apply flow
│       │   ├── TopNav.tsx          # Navigation bar
│       │   └── ui/                 # Reusable UI primitives
│       └── lib/
│           ├── api.ts          # Typed API client for core-api
│           ├── store.ts        # Zustand store (selectedCompanyId)
│           └── utils.ts        # Utility functions (cn, etc.)
├── services/
│   └── core-api/               # FastAPI backend
│       ├── app/
│       │   ├── api/
│       │   │   ├── companies.py    # Spatial search + filters
│       │   │   ├── jobs.py         # Job search + suggestions
│       │   │   └── applications.py # Application submission
│       │   ├── core/config.py      # Pydantic settings
│       │   ├── db/session.py       # Async SQLAlchemy engine
│       │   ├── models/domain.py    # ORM models (Company, Job, Application)
│       │   ├── schemas.py          # Pydantic request/response schemas
│       │   └── main.py             # FastAPI app + middleware
│       ├── Dockerfile          # Multi-stage (builder → dev → prod)
│       └── requirements.txt
├── infra/
│   ├── docker-compose.yml      # PostGIS + core-api services
│   └── init-db/                # SQL migrations + seed data (9 files)
├── scripts/                    # Scraper & utility scripts
└── .gitignore
```

---

## Prerequisites

- **Docker** & **Docker Compose** (v2+) — [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js** 18+ & **npm** — [Install Node](https://nodejs.org/)
- **Git**

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Davidbala2004/DECODING-JOBS.git
cd DECODING-JOBS
```

### 2. Start the backend (Docker)

```bash
cd infra
docker compose up -d --build
```

This starts:
- **PostGIS** on `localhost:5432` — with schema migrations + seed data (auto-runs on first start)
- **core-api** on `localhost:8000` — FastAPI with hot reload

Wait ~30 seconds for the database to initialize. Verify:

```bash
curl http://localhost:8000/health
# → {"status":"ok","service":"DECODING JOBS Core API"}

curl http://localhost:8000/health/db
# → {"status":"ok","database":"reachable"}
```

### 3. Start the frontend

```bash
cd ../apps/web
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/health/db` | Database readiness probe |
| GET | `/api/v1/companies/search` | Spatial search by bounding box + filters |
| GET | `/api/v1/companies/{id}` | Single company detail |
| GET | `/api/v1/companies/sectors` | Distinct sectors |
| GET | `/api/v1/companies/stages` | Distinct stages |
| GET | `/api/v1/companies/areas` | Distinct areas |
| GET | `/api/v1/companies/types` | Company type categories |
| GET | `/api/v1/companies/cities` | Distinct cities |
| POST | `/api/v1/companies/seed` | Seed company from scraper |
| GET | `/api/v1/jobs` | List active jobs |
| GET | `/api/v1/jobs/search` | Full-text job search |
| GET | `/api/v1/jobs/suggestions` | Autocomplete suggestions |
| GET | `/api/v1/jobs/{id}` | Single job detail |
| POST | `/api/v1/jobs/seed` | Seed job from scraper |
| POST | `/api/v1/applications/submit` | Submit job application |

---

## Environment Variables

### Backend (`services/core-api/.env`)

```env
PROJECT_NAME="DECODING JOBS Core API"
ENVIRONMENT=development
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+asyncpg://decoding_admin:decoding_pass_dev@postgis:5432/decoding_jobs
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> `.env.local` is optional — defaults to `http://localhost:8000` if not set.

---

## Development

### Hot Reload

- **Backend**: Source is bind-mounted — edits to `services/core-api/app/` auto-reload
- **Frontend**: Next.js dev server auto-reloads on file changes

### Useful Commands

```bash
# Backend logs
cd infra && docker compose logs -f core-api

# Restart backend
cd infra && docker compose restart core-api

# Full rebuild
cd infra && docker compose up -d --build

# Frontend lint
cd apps/web && npm run lint

# Frontend build check
cd apps/web && npm run build

# Stop everything
cd infra && docker compose down

# Stop and wipe database
cd infra && docker compose down -v
```

---

## Database

### Schema

Tables are created via SQL scripts in `infra/init-db/` (run once on first container start):

| Script | Purpose |
|--------|---------|
| `01-init-postgis.sql` | Enable PostGIS extension + create `companies` table with geometry |
| `02-init-jobs-users.sql` | Create `jobs` and `users` tables |
| `03-add-sentiment-and-work-mode.sql` | Add sentiment_summary, culture_score, work_mode columns |
| `04-init-applications.sql` | Create `applications` table |
| `05-add-real-company-fields.sql` | Add sector, stage, area, city, funding, etc. |
| `06-09` | Seed data — companies across Bengaluru, Chennai, Hyderabad, Kochi |

### Reset Database

```bash
cd infra
docker compose down -v    # Remove volume
docker compose up -d --build   # Recreate from scratch
```

---

## Real Data Ingestion

Company/job data is populated via `scripts/fetch-real-jobs.mjs`, which pulls **real** postings from legitimate, ToS-safe sources (no LinkedIn/Naukri scraping):

- **Adzuna Jobs API** — free-tier, real India listings with real apply links.
- **Greenhouse / Lever public job-board JSON** — no auth needed, real postings from companies using those ATSs.

```bash
cd scripts
npm install
cp .env.example .env
# Fill in ADZUNA_APP_ID / ADZUNA_APP_KEY — free signup at https://developer.adzuna.com/

npm run fetch:jobs            # both sources, all cities
npm run fetch:jobs:adzuna     # Adzuna only
npm run fetch:jobs:boards     # Greenhouse/Lever only

node fetch-real-jobs.mjs --city=Mumbai --source=all   # a single city
```

Covers all major India tech hubs: Bengaluru, Chennai, Hyderabad, Kochi, Mumbai, Pune, Delhi NCR, Kolkata, Ahmedabad. The script upserts companies by name and skips jobs it has already seeded, so it's safe to re-run.

To keep listings fresh automatically, start the optional refresher container:

```bash
cd infra
docker compose --profile refresh up -d
```

This re-runs the fetcher on a 6-hour loop against the running core-api.

---

## Deployment

### Backend (Production)

The Dockerfile has a `production` target:

```bash
docker build --target production -t decoding-jobs-api ./services/core-api
```

### Frontend (Vercel / Any Host)

```bash
cd apps/web
npm run build
npm start
```

Set `NEXT_PUBLIC_API_URL` to your production API URL.

---

## License

MIT

---

Built with care for tech students exploring the South Indian startup ecosystem.
