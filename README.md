# Smart Classroom Communication System

**Design and Experimental Evaluation of an AIoT-Based Real-Time Smart Classroom Infrastructure for Automated Attendance and Intelligent Classroom Communication**

## System Architecture

```
Admin Portal → FastAPI Backend → PostgreSQL/SQLite
                    ├── Face Service (OpenCV/InsightFace)
                    ├── WebSocket (Real-time Display)
                    └── REST API
```

Camera Pipeline:
```
Frame → Face Detection → Quality Gate → Entry-Zone Gate → Embedding
→ Similarity → Threshold Decision → Liveness Check → Identity
→ Time-Window Classification → DB Write → WebSocket → Display
```

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 1 | ✅ **Foundation** — DB schema, auth, architecture | **DONE** |
| 2 | ❌ Data & Enrollment — Face enrollment with quality gating | Pending |
| 3 | ❌ Recognition Core — Detection → threshold selection | Pending |
| 4 | ❌ Attendance Engine — Session logic, multi-face handling | Pending |
| 5 | ❌ Admin, Display, Reporting | Pending |
| 6 | ❌ Experiments & Analytics | Pending |
| 7 | ❌ Hardening & Documentation | Pending |

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
cp .env.example .env   # Edit .env with your settings
venv\Scripts\uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Technology Stack

- **CV/AI:** Python, OpenCV, InsightFace
- **Backend:** FastAPI, SQLAlchemy, Pydantic, WebSockets, JWT
- **Frontend:** React + Tailwind CSS, Vite, Recharts
- **Database:** PostgreSQL (SQLite for development)
- **Reporting:** pandas + openpyxl
- **IoT:** ESP32 + LED (or simulated)

## Research Protocol

- **Statistical ground rules:** Every metric reports n and 95% CI
- **Threshold selection:** Evidence-based on validation set
- **Dataset splits:** Enrollment / Validation / Test kept strictly separate
- **Experiments:** All results persist to `experiments`/`experiment_results` tables
- **Ablation study:** Component contribution analysis
- **Baseline comparison:** Manual vs. fingerprint vs. proposed

## Security

- Password hashing (bcrypt)
- JWT authentication
- Role-based access control
- Face embeddings only — no raw biometric image storage
- Audit logging for all corrections
- `.env` for secrets — never committed

## License

Academic research project.