# AEGIS-X Deployment Guide

## Architecture
- **Backend**: Render (Python/FastAPI + WebSocket)
- **Frontend**: Firebase Hosting (React/Vite static build)
- **Database**: Render PostgreSQL (free tier)
- **Cache**: In-memory fallback (no Redis needed for demo)

---

## Step 1: Deploy Backend on Render

1. Go to https://render.com and sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `KaranGupta2005/AEGIS_X`
4. Configure:
   - **Name**: `aegisx-backend`
   - **Root Directory**: (leave empty — repo root)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements/base.txt && python scripts/train_cognitive_model.py`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. Add Environment Variables:
   - `PYTHON_VERSION` = `3.11.9`
   - `AEGISX_DEMO_MODE` = `true`
   - `POSTGRES_HOST` = (from Render PostgreSQL, see step below)
   - `POSTGRES_PORT` = `5432`
   - `POSTGRES_USER` = `aegisx`
   - `POSTGRES_PASSWORD` = (from Render PostgreSQL)
   - `POSTGRES_DB` = `aegisx`
   - `REDIS_HOST` = (leave empty — uses in-memory fallback)
6. Click **Create Web Service**

### Optional: Add PostgreSQL
1. In Render dashboard → **New** → **PostgreSQL**
2. Name: `aegisx-db`, Plan: Free
3. Copy the Internal Database URL credentials into the backend env vars above

> **Note**: The backend works without PostgreSQL for the demo — it uses in-memory state.

Your backend URL will be: `https://aegisx-backend.onrender.com`

---

## Step 2: Deploy Frontend on Firebase

### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

### Setup & Deploy
```bash
cd dashboard

# Create Firebase project (first time only)
firebase projects:create aegis-x-dashboard
firebase init hosting
# Select: Use existing project → aegis-x-dashboard
# Public directory: dist
# Single-page app: Yes
# GitHub auto-deploys: No

# Update backend URL in .env.production
# Edit .env.production → set VITE_BACKEND_URL to your Render URL

# Build
npm ci
npm run build

# Deploy
firebase deploy --only hosting
```

Your frontend URL will be: `https://aegis-x-dashboard.web.app`

---

## Step 3: Update CORS (if needed)

The backend already allows all origins (`*`). No changes needed.

---

## Step 4: Verify

1. Open `https://aegis-x-dashboard.web.app`
2. Register/Login
3. Go to Live Demo
4. Start a scenario — you should see real-time trust updates from the backend

---

## Environment Variables Summary

### Backend (Render)
| Variable | Value |
|----------|-------|
| PYTHON_VERSION | 3.11.9 |
| AEGISX_DEMO_MODE | true |
| POSTGRES_HOST | (from Render DB or leave empty) |
| REDIS_HOST | (leave empty) |

### Frontend (Firebase)
| Variable | Value |
|----------|-------|
| VITE_BACKEND_URL | https://aegisx-backend.onrender.com |

---

## Troubleshooting

- **WebSocket not connecting**: Render free tier spins down after 15 min inactivity. First connection may take 30-60s.
- **Build fails on sentence-transformers**: Render free tier has 512MB RAM limit. The MiniLM model is small (~90MB) and should fit.
- **Frontend shows no data**: Check browser console → Network tab → WebSocket connection. Verify VITE_BACKEND_URL is correct.
