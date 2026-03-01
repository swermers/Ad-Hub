# Ad-Hub

AI-powered content & ad automation platform. Ingest your product's website and docs, then generate marketing content across channels using Claude AI.

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # Add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000. API docs at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000.

## Architecture

```
Frontend (Next.js)  -->  Backend (FastAPI)  -->  Claude API
                              |
                     SQLite + ChromaDB
```

- **Products**: Create products with website URL, description, audience info
- **Ingestion**: Crawl websites with Playwright, store in vector DB (ChromaDB)
- **Generation**: RAG-powered content creation via Claude API
- **Review**: Approve, reject, or edit generated content

## Tech Stack

- Frontend: Next.js 16 + React + Tailwind CSS
- Backend: Python + FastAPI + SQLAlchemy
- Database: SQLite (dev) + ChromaDB (vectors)
- AI: Claude API (Anthropic)
- Web Scraping: Playwright + BeautifulSoup
