# Pakistan LegalAI — Production Deployment Guide

## Option A: Railway (Recommended — Free tier available)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Pakistan LegalAI v5"
git remote add origin https://github.com/YOUR_USERNAME/pakistan-legalai.git
git push -u origin main
```

### 2. Deploy on Railway (railway.app)
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Add services:
   - **PostgreSQL** (Railway add-on, auto-provisions DATABASE_URL)
   - **Backend** (select `backend/` folder, Dockerfile detected)
   - **Frontend** (select `react-frontend/` folder, Dockerfile detected)

4. Set environment variables for backend service:
```
GROQ_API_KEY=gsk_your_key_here
JWT_SECRET_KEY=your_32_char_random_string
CORS_ORIGINS=https://your-frontend.up.railway.app
DATABASE_URL=<auto-set by Railway PostgreSQL>
```

5. After deploy, seed the database:
```bash
railway run python scripts/seed_db.py
```

---

## Option B: Render (render.com)

### Backend
1. New → Web Service → Connect GitHub repo
2. Root Directory: `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add PostgreSQL add-on
6. Set env vars (same as Railway above)

### Frontend
1. New → Static Site → Connect same GitHub repo
2. Root Directory: `react-frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `build`
5. Set: `REACT_APP_API_URL=https://your-backend.onrender.com`

---

## Option C: Docker on VPS (DigitalOcean/Hostinger/AWS EC2)

```bash
# On your server
git clone https://github.com/YOUR_USERNAME/pakistan-legalai.git
cd pakistan-legalai

# Copy and fill env
cp .env.example .env
nano .env  # add GROQ_API_KEY, JWT_SECRET_KEY

# Build and run
docker compose up -d --build

# Seed database
docker exec legalai-backend python scripts/seed_db.py

# Build RAG index (after adding law PDFs)
docker exec legalai-backend python scripts/ingest_laws.py
```

Access:
- Frontend: http://YOUR_SERVER_IP:3000
- API: http://YOUR_SERVER_IP:8000
- API Docs: http://YOUR_SERVER_IP:8000/docs

---

## Local Development (No Docker)

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env  # add GROQ_API_KEY
uvicorn main:app --reload --port 8000

# 2. Seed database (first time)
python scripts/seed_db.py

# 3. React frontend (new terminal)
cd react-frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start

# 4. (Optional) Build RAG index
cd backend
python scripts/ingest_laws.py
```

---

## Security Checklist for Production

- [ ] Set strong `JWT_SECRET_KEY` (32+ random chars)
- [ ] Set specific `CORS_ORIGINS` (not `*`)
- [ ] Use PostgreSQL (not SQLite)
- [ ] Set `APP_ENV=production`
- [ ] Enable HTTPS (Nginx + Certbot, or use Railway/Render built-in)
- [ ] Set `LOG_LEVEL=warning` in production
- [ ] Rotate GROQ_API_KEY periodically
- [ ] Back up PostgreSQL data regularly

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | From console.groq.com (free) |
| `JWT_SECRET_KEY` | ✅ | Random 32+ char string |
| `DATABASE_URL` | ✅ | PostgreSQL or SQLite URL |
| `CORS_ORIGINS` | ✅ | Frontend URL(s) comma-separated |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default: 60 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Default: 30 |

---

## URLs After Deployment

| Service | URL |
|---|---|
| React Frontend | http://your-domain.com |
| API | http://your-domain.com/api |
| Swagger Docs | http://your-domain.com:8000/docs |
| Health Check | http://your-domain.com:8000/health |
