# Deployment (Render)

This project is prepared for a simple production deployment on Render:
- Backend: Docker web service (`backend/Dockerfile`)
- Frontend: static site (`frontend`)
- Database: managed PostgreSQL

## 1) Deploy from Blueprint

1. Open Render dashboard.
2. Click `New` -> `Blueprint`.
3. Connect GitHub repo: `j-ram1/AI-genie`.
4. Confirm `render.yaml` is detected and create resources.

Resources created:
- `ai-genie-postgres` (managed Postgres)
- `ai-genie-backend` (Docker web service)
- `ai-genie-frontend` (static site)

## 2) Configure required backend secrets

In Render -> `ai-genie-backend` -> `Environment`, set:
- `AI_PROVIDER`
- `AZURE_OPENAI_URL`
- `AZURE_OPENAI_KEY`
- `AI_QUESTION_MODEL`

Notes:
- `DATABASE_URL` is wired automatically from the managed database.
- `ENABLE_DEBUG_ROUTES` is set to `false` in `render.yaml`.

## 3) Update CORS/frontend URL after first deploy

After the frontend gets its final Render URL:
1. Copy frontend URL.
2. Set backend `CORS_ORIGINS` to that URL.
3. Set frontend `VITE_API_URL` to backend URL.
4. Redeploy both services.

## 4) Post-deploy verification

Run these checks:
- Backend health: `GET /health` returns `status: ok` or `degraded`.
- Frontend loads and can call backend API.
- Backend logs appear in Render log stream.
- Prisma migrations are applied on boot (`npx prisma migrate deploy` in container start command).

## 5) CI/CD behavior

- CI/CD runs via Jenkins using `/Users/jangalaramsaichaitanya/ai-genie/Jenkinsfile`.
- On `main`, Jenkins triggers Render deploy hooks for backend and frontend.

## 6) Jenkins setup

1. Create a Jenkins Pipeline job pointed to this repository.
2. Ensure Jenkins agent has Node.js 22, npm, and curl installed.
3. Add Jenkins credentials (type: Secret text):
- `RENDER_DEPLOY_HOOK_BACKEND` = backend Render deploy hook URL
- `RENDER_DEPLOY_HOOK_FRONTEND` = frontend Render deploy hook URL
4. Configure webhook from GitHub repo to Jenkins (or use SCM polling).
5. Keep Render service auto-deploy from Git disabled to avoid duplicate deployments.

## 7) Recommended next hardening

- Rotate AI/database secrets if they were ever exposed.
- Restrict `/metrics` to private network or add protection.
- Add custom domains + TLS (Render managed certs).
- Add DB backup/restore runbook.
