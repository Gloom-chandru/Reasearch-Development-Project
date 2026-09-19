# ── Stage 1: Build frontend ────────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
# Use npm ci when lock file exists, otherwise npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python backend + built frontend ──────────────────────
FROM python:3.11-slim

# System deps for OpenCV / dlib / InsightFace
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libgl1 \
        libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user (uid 1000, required by HF Spaces)
RUN useradd -m -u 1000 appuser

WORKDIR /app/backend

# Install Python dependencies (as root, then switch)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend into backend/static (served by FastAPI catch-all)
COPY --from=frontend-build /build/dist ./static

# Ensure non-root user owns the app directory (for logs, sqlite fallback, etc.)
RUN chown -R appuser:appuser /app

# Switch to non-root user BEFORE model download so cache lands in /home/appuser
USER appuser

# Pre-download InsightFace buffalo_l model at build time
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])"

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
