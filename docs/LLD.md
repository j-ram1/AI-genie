# Low-Level Design (LLD)

## 1. Module-Level Design

### 1.1 `AuthService`
File: `/Users/jangalaramsaichaitanya/ai-genie/backend/src/auth/auth.service.ts`
- `login(dto)`
- Validates non-empty phone.
- Upserts `User` by unique phone.
- Returns `user_id` and `phone`.

### 1.2 `LobbyService`
File: `/Users/jangalaramsaichaitanya/ai-genie/backend/src/lobby/lobby.service.ts`
- `menu(dto)`
- Validates user existence.
- Ends any active lobby for user as `ENDED_REPLACED`.
- Upserts user-level `LobbySession` in `THEME_MENU`.
- Builds deterministic digit map from sorted themes.

- `input(dto)`
- Validates user and active lobby.
- Expires session on inactivity (10 min).
- Handles state-specific digit transitions:
- `THEME_MENU`: `1..8` select theme.
- `THEME_SELECTED`: `1` start game, `0` back, `9` exit.
- Ends lobby as `ENDED_STARTED` before game start.

### 1.3 `GameService`
File: `/Users/jangalaramsaichaitanya/ai-genie/backend/src/game/game.service.ts`

Key methods:
- `start(dto)`
- Resolves user (`user_id` or `user_phone`).
- Ends active sessions as `ENDED_REPLACED`.
- Enforces minimum 10 personalities in theme.
- Picks random target personality.
- Creates `GameSession` with mode `QUESTION_SET`, status `ACTIVE`.

- `inputDtmf(dto)`
- Loads session and validates activity/timeout.
- Dispatches by mode:
- `QUESTION_SET` -> `handleQuestionSet`
- `HINT_SELECTION` -> `handleHintSelection`
- `GUESS_INPUT` -> `handleGuessInput`
- `GUESS_CONFIRM` -> `handleGuessConfirm`
- `ENDED` -> `handleEnded`

- `guess(dto)`
- Allowed only in `GUESS_INPUT`.
- Normalizes text and scores against personality names + aliases.
- Threshold logic:
- `< 50`: wrong guess path.
- `100`: direct evaluate.
- `50..99`: enters `GUESS_CONFIRM`.

- `evaluateGuess(sessionId, candidateId)`
- Compares candidate with `selectedPersonalityId`.
- Success: status `WON`, persist result, return reveal.
- Failure: delegate to wrong guess handling.

- `handleWrongGuess(sessionId)`
- Increments `wrongGuesses`.
- If `wrongGuesses >= maxGuesses`: end as `FAILED_GUESSES`, reveal.
- Else transition back to `QUESTION_SET` or keep `GUESS_INPUT` if hints exhausted.

- `endSession(sessionId, status)`
- Updates status + ended timestamp + mode `ENDED`.
- Calls `createGameResultIfNeeded`.

- `createGameResultIfNeeded(ended)`
- Persists `GameResult` for terminal statuses:
- `WON`, `FAILED_HINTS`, `FAILED_GUESSES`, `FAILED_TIMEOUT`.

- `computeScore(...)`
- Score for wins only:
- `1000 + (remainingHints*50) + (remainingGuesses*30) - floor(durationSec/2)`.

### 1.4 `AiQuestionService`
File: `/Users/jangalaramsaichaitanya/ai-genie/backend/src/ai/ai.question.service.ts`
- Caches question text per `(themeId, attrKey, answerType)`.
- Provider selection:
- `AI_PROVIDER=azure` -> Azure OpenAI API.
- Else Gemini when `GEMINI_API_KEY` exists.
- On failure returns fallback text.
- Parses expected JSON `{ "text": "..." }` from model output.

### 1.5 `AiGenieService`
File: `/Users/jangalaramsaichaitanya/ai-genie/backend/src/ai/ai.genie.service.ts`
- Builds base prompts for contexts:
- `START`, `HINT`, `WRONG_GUESS`, `WRONG_GUESS_NO_HINTS`, `WIN`, `LOSS`
- Rewrites through Azure for persona style if configured.
- Fallback returns deterministic base prompt.

### 1.6 `LeaderboardService`
File: `/Users/jangalaramsaichaitanya/ai-genie/backend/src/leaderboard/leaderboard.service.ts`
- `getThemeLeaderboard({ themeId, userId })`
- Uses SQL CTE + `DENSE_RANK` over aggregated user scores.
- Includes status filter (`WON`, `FAILED_GUESSES`).
- Returns masked phone numbers.

## 2. State Machines

### 2.1 Lobby Session States
- `THEME_MENU`
- Input: `1..8` select theme -> `THEME_SELECTED`
- Input: `9` -> end (`ENDED_EXIT`)

- `THEME_SELECTED`
- Input: `1` -> start game + end lobby (`ENDED_STARTED`)
- Input: `0` -> back to `THEME_MENU`
- Input: `9` -> end (`ENDED_EXIT`)

### 2.2 Game Session States
- `QUESTION_SET`
- `1` -> produce hint options -> `HINT_SELECTION`
- `2` -> `GUESS_INPUT`
- `9` -> `ENDED_EXIT`

- `HINT_SELECTION`
- `digit in pendingQuestionSet` -> reveal answer, update history
- if hints exhausted -> `GUESS_INPUT`
- else -> `QUESTION_SET`

- `GUESS_INPUT`
- text guess via `/game/guess` -> `GUESS_CONFIRM` or terminal/wrong flow
- `9` -> `ENDED_EXIT`

- `GUESS_CONFIRM`
- `1` confirm candidate -> evaluate guess
- `2` retry -> `GUESS_INPUT`
- `9` -> `ENDED_EXIT`

- `ENDED`
- `1` replay same theme
- `2` leaderboard
- `3` theme change (lobby)
- `9` logical exit

## 3. Validation Rules
- `phone` required on login.
- `user_id` must exist for lobby/game operations.
- `theme_id` must have >= 10 personalities on game start.
- DTMF digits are validated by current mode.
- Guess text must be non-empty normalized input.

## 4. Timeout and Lifecycle
- Inactivity timeout: 10 minutes for lobby and game.
- On timeout:
- Lobby -> `EXPIRED`
- Game -> `FAILED_TIMEOUT` and terminal menu

## 5. Data Access Patterns
- Prisma ORM for most reads/writes.
- Raw SQL for leaderboard ranking query.
- JSON columns used in `GameSession` for flexible evolving state:
- `usedAttrKeys`, `disabledGroupIds`, `pendingQuestionSet`, `qaHistory`.

## 6. Frontend LLD Notes
Files:
- `/Users/jangalaramsaichaitanya/ai-genie/frontend/src/App.tsx`
- `/Users/jangalaramsaichaitanya/ai-genie/frontend/src/services/api.ts`

Behavior:
- Screen mode derived from latest backend response.
- `lastEndedState` cached for leaderboard back-navigation.
- DTMF action routed to game or lobby endpoint based on presence of `session_id`.

