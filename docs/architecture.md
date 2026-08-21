# Smart Classroom Architecture

## Overview

AIoT-based real-time classroom attendance and communication system.
Camera pipeline processes faces, verifies identity, records attendance with time-window classification, and provides real-time classroom display.

## Backend Layering

```
API Layer (FastAPI routes)
    → Service Layer (business logic, validation)
    → Repository Layer (data access, queries)
    → Database (PostgreSQL / SQLite)
```

API routes contain NO business logic — they parse requests, call services, return responses.

## Camera Pipeline

```
Camera Frame
    → Face Detection (OpenCV/InsightFace)
    → Quality Gate (size, blur, single-face check)
    → Entry-Zone Gate (2D bounding-box centroid)
    → Embedding Generation
    → Similarity/Distance vs Enrolled Embeddings
    → Threshold Decision
    → Liveness Check (blink detection; experimental)
    → Identity Assignment
    → Time-Window Classification (PRESENT / LATE)
    → Duplicate Check (DB-level unique constraint)
    → DB Write → Confirmation Event → WebSocket → Classroom Display
```

## Database Entities

- **users** — auth and role management
- **students** — enrolled participants
- **face_embeddings** — biometric embeddings (no raw photos)
- **classrooms** — physical rooms with configurable entry zones
- **subjects** — academic subjects
- **attendance_sessions** — scheduled class sessions
- **attendance_records** — per-student per-session (unique constraint)
- **corrections** — audit trail for manual corrections
- **notices** — classroom display messages with auto-expiry
- **attendance_configurations** — per-classroom overrides
- **audit_logs** — all state-changing actions
- **system_events** — camera status, service health
- **experiments / experiment_results** — persistent experiment data

## Security

- Password hashing (bcrypt)
- JWT authentication
- Role-based access (super_admin, hod, coordinator, faculty)
- No raw biometric images stored (embeddings only)
- Audit logging for all corrections
- `.env` for secrets (never committed)

## Research Protocol

Every experiment persists to `experiments` / `experiment_results` tables.
All metrics carry: point estimate, 95% CI (Wilson score), sample size.
Threshold is evidence-selected on validation set, stored in config.
Train/validation/test sets kept strictly separate.
Ablation study evaluates component contribution.
Baseline comparison vs manual and fingerprint.

## Milestones

1. ✅ Foundation — DB schema, auth, architecture
2. 🔄 Data & Enrollment — Face enrollment with quality gating
3. ❌ Recognition Core — Detection → embedding → threshold selection
4. ❌ Attendance Engine — Session logic, multi-face, duplicate prevention
5. ❌ Admin, Display, Reporting — Dashboard, WebSocket, Excel
6. ❌ Experiments & Analytics — Full evaluation suite
7. ❌ Hardening & Documentation — Error handling, review