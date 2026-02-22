# AI Genie

AI Genie is a web-based guessing game platform where users interact with an AI to identify hidden personalities based on hints and DTMF-style navigation.

## 🚀 Quick Start

The fastest way to get the project running is to start the database using Docker and then run the backend and frontend development servers.

### 1. Database Setup
Ensure you have Docker installed and running.
```bash
docker-compose up -d
```
This starts a PostgreSQL instance on `localhost:5432`.

### 2. Backend Setup
```bash
cd backend
npm install
# Ensure .env is configured (see Backend Details below)
npx prisma db push
npm run start:dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠 Tech Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** NestJS (TypeScript)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **AI Integration:** Azure OpenAI / Google Gemini

---

## 📖 Detailed Configuration

### Backend
The backend requires environment variables for DB connection and AI providers.
Create/Edit `/backend/.env`:

```env
DATABASE_URL="postgresql://aigenie:aigenie_pass@localhost:5432/aigenie_db?schema=public"

AI_PROVIDER=azure # or google
AZURE_OPENAI_URL=...
AZURE_OPENAI_KEY=...
AI_QUESTION_MODEL=gpt-4.1-mini
```

**Key Scripts:**
- `npm run start:dev`: Starts the NestJS server in watch mode.
- `npx prisma db push`: Syncs the Prisma schema with the database.
- `npx prisma studio`: Opens a GUI to view and edit database data.

### Frontend
The frontend connects to the backend API (defaulting to `http://localhost:3000`).

**Key Scripts:**
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the production-ready app.

---

## 📂 Project Structure

- `/backend`: NestJS source code, Prisma schema, and API logic.
- `/frontend`: React components, UI logic, and asset management.
- `/docs`: System Design Documents (SDD) and architecture diagrams.
- `docker-compose.yml`: Local infrastructure definition.

## 🧪 Documentation
For detailed system architecture and API flows, refer to [docs/SDD-HLD.md](file:///Users/jangalaramsaichaitanya/ai-genie/docs/SDD-HLD.md).
For deployment steps, refer to `/Users/jangalaramsaichaitanya/ai-genie/docs/DEPLOYMENT.md`.
CI/CD pipeline definition is in `/Users/jangalaramsaichaitanya/ai-genie/Jenkinsfile`.
