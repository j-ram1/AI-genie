# System Design Document (SDD) / High-Level Design (HLD)

## 1. Purpose
This document describes the high-level system design for the AI Genie project, including architecture, core modules, integration points, data ownership boundaries, and non-functional design choices.

## 2. System Scope
AI Genie is a web-based guessing game platform where:
- Users log in with phone number.
- Users select a theme from a lobby.
- System starts a game session with a hidden personality.
- Users request hints (DTMF digits) and submit guesses.
- System computes outcomes and stores game results.
- Users can view leaderboard for a theme.

## 3. High-Level Architecture
The system follows a client-server architecture:
- Frontend: React + Vite SPA
- Backend: NestJS REST API
- Database: PostgreSQL via Prisma ORM
- AI Providers:
- Azure OpenAI (persona framing, optional)
- Gemini (question text generation, optional)

## 4. Component View
### 4.1 Frontend Components
- `App`: Root state coordinator and screen router.
- `Login`: User login by phone.
- `Lobby`: Theme selection and lobby DTMF navigation.
- `GameBoard`: Main gameplay interaction (hints, guess input, DTMF).
- `GameFinished`: End-state actions.
- `Leaderboard`: Top-10 + user rank display.
- `services/api.ts`: API client wrapper around `fetch`.

### 4.2 Backend Modules
- `AuthModule`
- Endpoint: `POST /auth/login`
- Responsibility: user upsert and login response.

- `LobbyModule`
- Endpoints: `POST /lobby/menu`, `POST /lobby/input/dtmf`
- Responsibility: theme menu lifecycle, selection, session timeout, transition to game.

- `GameModule`
- Endpoints: `GET /game/themes`, `POST /game/start`, `POST /game/input/dtmf`, `POST /game/guess`, `POST /game/debug/reveal`
- Responsibility: game session state machine, hint selection, answer reveal, guess evaluation, result persistence.

- `LeaderboardModule`
- Responsibility: compute ranked leaderboard from `GameResult`.

- `AiModule`
- `AiGenieService`: persona-style prompt framing for game narration.
- `AiQuestionService`: AI-assisted question text generation with DB cache.

- `PrismaModule`
- Responsibility: DB connection and Prisma client lifecycle.

### 4.3 External Services
- PostgreSQL for persistent state.
- Azure OpenAI API for persona rewriting of prompts.
- Google Gemini API for question text generation.

## 5. Key Runtime Flows
### 5.1 Login Flow
1. Frontend calls `POST /auth/login`.
2. Backend upserts user by unique phone.
3. Backend returns `{ user_id, phone }`.

### 5.2 Lobby Theme Selection Flow
1. Frontend calls `POST /lobby/menu`.
2. Backend ends active lobby sessions for user.
3. Backend creates/updates one active lobby session.
4. Backend returns digit map for themes (1..8, 9 exit).
5. Frontend sends selected digit via `POST /lobby/input/dtmf`.
6. On confirm start (digit 1 in `THEME_SELECTED`), backend ends lobby and starts game.

### 5.3 Game Play Flow
1. Backend starts active game session with random personality in selected theme.
2. In `QUESTION_SET`, user can:
- Press `1`: request hint options.
- Press `2`: enter guess mode.
- Press `9`: exit.
3. In `HINT_SELECTION`, user chooses one hint digit.
4. Backend resolves attribute value against hidden personality and appends Q/A history.
5. User transitions back to question menu until hints exhausted.
6. User guesses text in `GUESS_INPUT`; backend runs fuzzy matching + confirmation.
7. Backend marks session as `WON` or failure states and persists `GameResult` as applicable.

### 5.4 Leaderboard Flow
1. Frontend requests leaderboard through game ended menu action.
2. Backend aggregates `GameResult` by user for selected theme.
3. Backend returns top-10 plus current user row.

## 6. API Design (Current Surface)
- `POST /auth/login`
- `POST /lobby/menu`
- `POST /lobby/input/dtmf`
- `GET /game/themes`
- `POST /game/start`
- `POST /game/input/dtmf`
- `POST /game/guess`
- `POST /game/debug/reveal` (dev utility)

## 7. Data and State Ownership
- Frontend owns UI mode derived from last backend response.
- Backend owns authoritative game/lobby state in DB.
- Game/lobby timeouts are enforced in backend.
- DB stores long-lived entities (users, themes, personalities, results).

## 8. Cross-Cutting Design Notes
- Session replacement strategy:
- New active lobby/game replaces previous active session for same user.

- Deterministic theme ordering:
- Themes are sorted ascending by name to keep DTMF mapping stable.

- AI fallback strategy:
- If AI provider unavailable, system returns deterministic fallback prompts/text.

- Caching:
- AI-generated question text is cached in `AiQuestionText` by `(themeId, attrKey, answerType)`.

## 9. Non-Functional Considerations
- Availability:
- Core gameplay still functions without AI providers due to fallbacks.

- Performance:
- Main gameplay operations are DB-bound, low-latency expected.

- Security:
- No JWT/session auth currently; `user_id` is trusted from client.
- Phone numbers are masked in leaderboard output.

- Observability:
- Minimal console logging only; no full monitoring stack yet.

## 10. Known Constraints
- Theme must contain at least 10 personalities to start game.
- Max 8 themes exposed via DTMF menu.
- Timeout configured as 10 minutes inactivity for lobby/game.

