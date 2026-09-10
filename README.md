# AIoT Smart Classroom — Real-Time Attendance & Communication System

**Research project:** Design and Experimental Evaluation of an AIoT-Based Real-Time Smart Classroom Infrastructure for Automated Attendance and Intelligent Classroom Communication

---

## System Architecture

```
Admin/Faculty Portal (React)
        │
        ▼
   FastAPI Backend  ──── PostgreSQL / SQLite
        │
   ┌────┴──────────────────────┐
   │                           │
Face Recognition Pipeline   WebSocket Manager
   │                           │
   ▼                           ▼
InsightFace buffalo_l     Classroom Display
(512-d embeddings)         (kiosk mode)
```

### Camera pipeline

```
Frame → Face Detection → Quality Gate → Entry-Zone Gate
  → Embedding → Cosine Similarity → Threshold Decision
  → Liveness Check (experimental) → Identity
  → Time-Window Classification → Duplicate Check (DB constraint)
  → DB Write → WebSocket Broadcast → LED Event (simulated)
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- A webcam (for enrollment and live recognition)

### 1 — Backend

```bash
cd backend

# Copy and edit environment config
cp .env.example .env
# Edit .env: set SECRET_KEY to a long random string
# python -c "import secrets; print(secrets.token_hex(32))"

# Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
python -m app.main
# Or:
uvicorn app.main:app --reload --port 8000
```

The backend starts on **http://localhost:8000**.  
API docs: **http://localhost:8000/docs**  
Default admin login: `admin` / `admin123` ← **change this immediately**

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**.

### 3 — First time setup

1. Log in as `admin` / `admin123`
2. Go to **Users** and create faculty/coordinator accounts; deactivate the default admin or change its password via the Users page
3. Go to **Classrooms** → create a classroom (e.g. "Lab 101", code "LAB101")
4. Go to **Sessions** → **Subjects** → create a subject
5. Go to **Students** → register students → click **📷 Enroll Face** for each (5–10 captures each)
6. Go to **Classrooms** → **Enrollments** → link students to classrooms/subjects
7. Create a session, **Activate** it, then open **Live** to start recognition

---

## Research Protocol (Milestone requirements)

### Milestone 3 — Evidence-based threshold selection

**Do not deploy with the default threshold (0.40).**  
Run the threshold sweep with your own validation data:

```bash
# Collect validation frames (separate from test set)
# Each frame paired with the true student_id
# Submit via the API:
POST /api/experiments/threshold-sweep
{
  "validation_frames": [
    {"image_data": "<base64 JPEG>", "true_student_id": 12},
    {"image_data": "<base64 JPEG>", "true_student_id": null},  # impostor
    ...
  ],
  "classroom_id": 1,
  "update_config": true   # writes selected threshold to classroom config
}
```

The selected threshold is the point that minimises |FAR - FRR|.  
All per-threshold metrics (accuracy, precision, recall, F1, FAR, FRR, Wilson 95% CI) are persisted to `experiment_results` and visible in the Analytics page.

### Milestone 6 — Running experiments

All experiment runners are in `backend/app/services/experiment_runner.py`.  
They require you to supply real numpy frames — they never fabricate results.

| Experiment | Method | API trigger |
|---|---|---|
| Recognition accuracy | `run_recognition_experiment` | Call directly via Python |
| Lighting robustness | `run_robustness_experiment("lighting")` | Call directly |
| Distance robustness | `run_robustness_experiment("distance")` | Call directly |
| Angle robustness | `run_robustness_experiment("angle")` | Call directly |
| Multi-face | `run_multi_face_experiment` | Call directly |
| Latency | `run_latency_experiment` | Call directly |
| Liveness | `run_liveness_experiment` | Call directly |
| Ablation study | `run_ablation_experiment` | Call directly |
| Baseline comparison | `run_baseline_experiment` | Call directly |

Results appear in the **Analytics** page as soon as they're written to `experiment_results`.

### Statistical requirements (§3 of master spec)

Every reported metric **must** include:
- Sample size n  
- 95% Wilson score CI for proportions  
- P50 and P95 for latency

The system enforces this: `wilson_ci()` is called on every proportion result, and every row in `experiment_results` carries `sample_size`, `ci_lower`, `ci_upper`.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/            ← FastAPI route handlers (thin — no logic here)
│   │   │   ├── auth.py
│   │   │   ├── audit.py
│   │   │   ├── classrooms.py
│   │   │   ├── dashboard.py
│   │   │   ├── enrollment.py
│   │   │   ├── experiments.py
│   │   │   ├── notices.py
│   │   │   ├── realtime.py
│   │   │   ├── reports.py
│   │   │   ├── sessions.py
│   │   │   └── students.py
│   │   ├── models/         ← SQLAlchemy ORM models (15 tables)
│   │   ├── repositories/   ← Data access layer (no business logic)
│   │   ├── schemas/        ← Pydantic request/response models
│   │   ├── services/       ← All business logic lives here
│   │   │   ├── auth_service.py
│   │   │   ├── attendance_service.py
│   │   │   ├── camera_pipeline.py     ← Full recognition pipeline
│   │   │   ├── entry_zone.py
│   │   │   ├── experiment_runner.py   ← All 9 experiment types
│   │   │   ├── face_detector.py       ← 4-level fallback detector
│   │   │   ├── led_service.py         ← Software-simulated LED
│   │   │   ├── liveness_service.py    ← Experimental blink detection
│   │   │   ├── notice_service.py
│   │   │   ├── quality_gate.py
│   │   │   ├── recognition_service.py ← Embeddings + threshold sweep
│   │   │   ├── reporting_service.py   ← Excel reports
│   │   │   ├── session_service.py
│   │   │   └── websocket_manager.py
│   │   ├── utils/          ← Logging, auth dependencies, security
│   │   ├── config.py       ← All settings via Pydantic BaseSettings
│   │   ├── database.py     ← Engine, SessionLocal, Base, get_db
│   │   └── main.py         ← App entry point, middleware, router registration
│   ├── .env.example        ← Copy to .env and fill in secrets
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── contexts/       ← AuthContext, WebSocketContext
        ├── components/     ← Layout, ProtectedRoute
        └── pages/          ← 11 pages
            ├── DashboardPage.jsx
            ├── StudentsPage.jsx       ← webcam enrollment
            ├── SessionsPage.jsx       ← correction, download
            ├── ClassroomsPage.jsx     ← enrollment management
            ├── NoticesPage.jsx
            ├── UsersPage.jsx
            ├── LiveRecognitionPage.jsx ← real-time camera
            ├── AnalyticsPage.jsx      ← DB-backed experiment results
            ├── AuditLogPage.jsx
            ├── ClassroomDisplay.jsx   ← kiosk mode
            └── LoginPage.jsx
```

---

## Database Schema (15 tables)

| Table | Purpose |
|---|---|
| `users` | System users (faculty, coordinator, HOD, super_admin) |
| `students` | Enrolled students |
| `face_embeddings` | 512-d float32 InsightFace embeddings (not raw images) |
| `classroom_enrollments` | Student ↔ classroom+subject mapping |
| `classrooms` | Physical rooms with entry-zone config |
| `subjects` | Course subjects |
| `attendance_sessions` | Scheduled sessions with time-window config |
| `attendance_records` | One record per student per session (DB unique constraint) |
| `corrections` | Full audit trail for every manual correction |
| `notices` | Classroom notices with expiry |
| `attendance_configurations` | Per-classroom threshold/quality overrides |
| `audit_logs` | All state-changing actions (who, what, when, IP) |
| `system_events` | Pipeline-level events (session start/end, LED, errors) |
| `experiments` | Experiment run metadata |
| `experiment_results` | Per-metric results with n, CI bounds |

---

## Security Notes

- Passwords hashed with bcrypt — never stored plaintext
- JWT tokens (HS256, 8h expiry) — stored in localStorage
- Auth endpoints rate-limited: 10 failures / 60s per IP
- Face embeddings stored as binary blobs — no raw image library
- All state changes logged to `audit_logs` with user ID and IP
- Role-based access enforced at both API and UI level
- **Never commit `.env`** — only `.env.example` is in the repo
- **Change `SECRET_KEY`** before any deployment

---

## Limitations (§13 — reported honestly)

1. **Sample size** — a solo/small-team project with limited participants produces wide CIs. All results must be reported with n and CI; no result should be presented as conclusive without n ≥ 30.

2. **Liveness check** — blink detection (EAR) is experimental and requires 68-point landmarks. InsightFace provides 5-point landmarks, so the liveness check returns "uncertain" in most real-world runs. This is documented, not hidden.

3. **Threshold dependence** — the 0.40 default is a placeholder. Results are only valid after an evidence-based threshold sweep on your specific enrollment set.

4. **Single-classroom, single-process** — the embedding cache is in-process memory. Multi-process deployment requires a shared cache (Redis).

5. **LED is simulated** — physical ESP32 integration is future work. The system broadcasts a WebSocket `led_event` message that the display reacts to, but no physical LED is driven unless `LED_ENABLED=true` and paho-mqtt is installed and an ESP32 is connected.

6. **No Alembic migrations** — schema changes in development use `Base.metadata.create_all()`. For any production use, generate proper Alembic migrations.

---

## API Reference

Full interactive docs at **http://localhost:8000/docs** (Swagger UI).

Key endpoints:

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate, get JWT |
| GET | `/api/dashboard/stats` | Aggregated dashboard stats |
| GET/POST | `/api/students` | Student CRUD |
| POST | `/api/enrollment/capture` | Enroll a face sample |
| GET/POST | `/api/sessions` | Session CRUD |
| POST | `/api/sessions/{id}/activate` | Start a session |
| POST | `/api/sessions/{id}/complete` | Finalize + write absent records |
| POST | `/api/sessions/attendance/correct` | Manual correction + audit |
| POST | `/api/ws/recognize/{classroom_id}` | Submit frame for recognition |
| WS | `/ws/classroom/{classroom_id}` | Real-time classroom display |
| GET | `/api/reports/session/{id}` | Download Excel report |
| POST | `/api/experiments/threshold-sweep` | Evidence-based threshold selection |
| GET | `/api/audit/logs` | Paginated audit trail |

---

*Generated for the AIoT Smart Classroom research project. All experiment results must trace to rows in `experiment_results`. Every proportion must carry a Wilson 95% CI and sample size. No fabricated numbers.*