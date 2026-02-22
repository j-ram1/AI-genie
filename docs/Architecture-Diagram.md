# Architecture Diagram

## 1. Deployment/Infrastructure View
```mermaid
flowchart TB
  subgraph Client["Client Layer"]
    FE["React + Vite SPA"]
  end

  subgraph Server["Application Layer"]
    API["NestJS API"]
    AUTH["Auth Module"]
    LOBBY["Lobby Module"]
    GAME["Game Module"]
    AI["AI Module"]
    LEAD["Leaderboard Module"]
    PRISMA["Prisma Service"]
  end

  subgraph Data["Data Layer"]
    PG["PostgreSQL"]
  end

  subgraph External["External AI Services"]
    AZ["Azure OpenAI (optional)"]
    GM["Gemini API (optional)"]
  end

  FE -->|HTTP JSON| API
  API --> AUTH
  API --> LOBBY
  API --> GAME
  API --> LEAD
  GAME --> AI
  AI --> AZ
  AI --> GM
  AUTH --> PRISMA
  LOBBY --> PRISMA
  GAME --> PRISMA
  LEAD --> PRISMA
  PRISMA --> PG
```

## 2. Component Interaction View (Main Gameplay)
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as NestJS API
  participant DB as PostgreSQL
  participant AI as AI Providers

  U->>FE: Login(phone)
  FE->>BE: POST /auth/login
  BE->>DB: upsert User
  DB-->>BE: user_id
  BE-->>FE: login response

  U->>FE: Open lobby
  FE->>BE: POST /lobby/menu
  BE->>DB: create/update LobbySession + fetch themes
  DB-->>BE: lobby + themes
  BE-->>FE: prompt + digit map

  U->>FE: Select theme, start
  FE->>BE: POST /lobby/input/dtmf
  BE->>DB: end lobby + create GameSession
  BE->>AI: frame START prompt (optional)
  AI-->>BE: persona prompt
  BE-->>FE: active game session

  U->>FE: Request hints / submit guess
  FE->>BE: /game/input/dtmf or /game/guess
  BE->>DB: read/update GameSession, attributes, results
  BE->>AI: question/prompt framing (optional)
  AI-->>BE: generated text
  BE-->>FE: next state

  U->>FE: View leaderboard
  FE->>BE: ended menu -> leaderboard action
  BE->>DB: aggregate/rank GameResult
  DB-->>BE: top10 + user rank
  BE-->>FE: leaderboard payload
```

## 3. Backend Package Dependencies
```mermaid
flowchart LR
  App["AppModule"]
  Auth["AuthModule"]
  Lobby["LobbyModule"]
  Game["GameModule"]
  AI["AiModule"]
  Lead["LeaderboardModule"]
  Prisma["PrismaModule"]

  App --> Auth
  App --> Lobby
  App --> Game
  App --> Lead
  App --> Prisma

  Game --> AI
  Game --> Lead
  Game --> Prisma
  Game <-->|forwardRef| Lobby
  Lobby --> Prisma
  Lobby <-->|forwardRef| Game
  Auth --> Prisma
  Lead --> Prisma
  AI --> Prisma
```

## 4. Operational Notes
- Backend exposes REST on `PORT` (default `3000`).
- Frontend uses `VITE_API_URL` fallback `http://localhost:3000`.
- Database dependency provided via Docker Compose (`postgres:16`).
- AI service calls are optional and fail-safe to deterministic fallback text.

