# Counseller

Conversational AI college-admission counselor for Indian engineering students. Captures exam results (JEE Main, JEE Advanced, MHT-CET, BITSAT, VITEEE, KCET, AP-EAMCET, WBJEE), branch/location/fees/tier preferences, and recommends colleges the student is realistically eligible for, all via Telegram.

Counseller has two operating modes that share the same Neon Postgres DB and the same recommender:

- **Plugin mode** (primary): installed into a [`tele`](https://github.com/piyush-mantri/tele) host. Tele owns Telegram delivery and invokes Counseller's `getContext` / `handleSlashCommand` hook entrypoints on every turn.
- **Standalone bot mode**: Counseller's own Fastify server runs a Telegram long-poll loop, routing updates to the same hook plus a small Gemini reply path for free-text turns. Useful when running Counseller against a group/channel without a tele host.

A small React web dashboard ships with the standalone mode for inspecting students, browsing seeded colleges, and configuring the standalone bot.

## Install into tele (plugin mode)

1. Copy or symlink this repository into the tele server's applications directory:
   ```bash
   cp -r ~/spaps/counseller ~/spaps/tele/apps/server/applications/counseller
   ```
   (Symlinking is fine for dev: `ln -s ~/spaps/counseller ~/spaps/tele/apps/server/applications/counseller`.)
2. In the tele dashboard, open the new `counseller` application and set its **database URL** field to your Neon connection string. Tele injects this URL into every hook call via `ctx.databaseUrl`. On first turn, Counseller runs its migrations and seeds ~30 colleges across 8 exams (idempotent).
3. Start chatting with the bot. The five slash commands (`/add-exam`, `/set-preferences`, `/recommend`, `/list-exams`, `/clear`) work directly; the AI is also instructed to invoke `/add-exam` and `/set-preferences` automatically when the user provides data in free text.

### Tele-side prerequisite (one-time)

Counseller's hook receives the database URL via `ctx.databaseUrl`. This field is part of tele's `CodeAppHookContext` interface and is populated by tele's application runtime in `apps/server/src/ai/applications.ts` and `apps/server/src/ai/applicationSlash.ts`. If you are running an older tele build that does not pass `databaseUrl`, the hook will return a "Counseller is not configured" message and refuse to write. Update tele first; both edits are small and backward-compatible with other code-type plugins.

## Standalone mode

Standalone mode runs Counseller as its own Fastify server (port `8788` by default) with a Telegram polling bot and a React dashboard. It does not require tele.

### Setup

```bash
cd ~/spaps/counseller
npm install

# Required: Neon-compatible connection string. The DB schema is migrated
# automatically on first boot; you can point at the same DB tele uses for
# plugin mode, or a fresh DB just for standalone testing.
export DATABASE_URL='postgresql://<user>:<password>@<host>/<db>?sslmode=require'

# Optional: enables the LLM reply path for free-text Telegram messages.
# Without it, the bot still answers slash commands; free-text messages get a
# static "use slash commands" reply.
export GEMINI_API_KEY='<your-key>'

# Boot the server + bot (if a token is configured) + dev React app.
npm run dev
```

`dev:server` runs `tsx watch server/src/index.ts`. `dev:web` runs the Vite dev server with a `/api` proxy to port 8788. The production build (`npm run build && npm start`) compiles the React app to `web/dist` and serves it statically from the same Fastify process.

### Configure the standalone bot

1. Open the dashboard at <http://localhost:5173> (dev) or <http://localhost:8788> (prod build) and navigate to **Bot Config** in the left sidebar.
2. In Telegram, message `@BotFather` and run `/newbot` to create a bot. Copy the token it returns.
3. Paste the token into the **Bot Token** field. Optional: set **Target Chat ID** (e.g. `-1001234567890` for a group, or a positive integer for a 1:1 chat) to scope the bot to a single chat — messages from other chats are silently dropped.
4. Click **Save**. The server immediately starts the long-poll loop. Click **Test Connection** to verify the token via Telegram's `getMe`; `last_connected_at` and the bot's `@username` should appear in the Status panel.
5. Send a message to the bot from the target chat. Slash commands round-trip through the hook directly; free-text messages go through Gemini (if `GEMINI_API_KEY` is set) using the same persona/profile/methodology system prompt the plugin mode produces.

The bot token is stored plaintext in `bot_config.bot_token`. The `GET /api/config/bot` response only returns the last 4 characters (`bot_token_masked: "•••1234"`) — the full token is never sent back. Treat the Neon DB as sensitive.

## Slash commands

| Command | Args | Effect |
| --- | --- | --- |
| `/add-exam` | JSON: `{exam_name, year, marks?, rank?, percentile?, category?}` | Record an exam attempt. At least one of `marks` / `rank` / `percentile` is required. |
| `/set-preferences` | Partial JSON: `{preferred_branches?, preferred_locations?, max_fees_lakhs?, tier_preference_max?, home_state?}` | Create or update preferences. Absent keys keep existing values; explicit `null` clears (e.g. `{"max_fees_lakhs": null}` removes the fee cap). |
| `/recommend` | none | Compute and return top recommendations using stored exams + preferences. |
| `/list-exams` | none | Show all stored attempts for this chat. |
| `/clear` | none | Delete this chat's exams + preferences (start over). |

Supported `exam_name` values: `JEE_MAIN`, `JEE_ADVANCED`, `MHT_CET`, `BITSAT`, `VITEEE`, `KCET`, `AP_EAMCET`, `WBJEE`. (`NEET` is reserved in the enum but has no V1 cutoff seed data.)

Supported `category` values: `GEN`, `OBC`, `SC`, `ST`, `EWS`.

## Caveats

### Cutoff data

The seed in `src/db/migrations/0002_seed_colleges.sql` is a **2023 + 2024 public snapshot** spanning ~30 colleges and ~456 cutoff rows across the 8 supported exams. It is intentionally tiny relative to real Indian admissions (thousands of colleges, multiple rounds per exam, dozens of category permutations) and is provided for demonstration only. **Do not use Counseller as a primary source for admission decisions.** To refresh the data, write a **new** migration file (`000N_seed_update.sql`) — do not edit `0002_seed_colleges.sql` in place, since the migration runner skips already-applied files.

### Recommender is heuristic, not predictive

Recommendations are based on `student_value >= cutoff_value` (rank-family inverted) per exam unit, plus a closed set of fit-reasons (`within_cutoff_comfortable`, `matches_preferred_branch`, `in_home_state`, etc.). It does **not** model:

- Real-world counseling round dynamics (most cutoffs shown are last-round; first-round cutoffs are stricter).
- State quota / home-state reservation gating beyond the `home_state_advantage` flag on individual cutoffs.
- Multi-exam dependencies — notably, **JEE Advanced eligibility requires being in the top ~2.5 lakh JEE Main candidates.** A student who has only a JEE Advanced rank (and no JEE Main result) would not, in reality, be allowed to sit for JEE Advanced. The recommender does not enforce this; it will happily return IIT recommendations based on the stored JEE Advanced rank alone.
- Anything other than the seeded categories (`GEN`, `OBC`). `SC` / `ST` / `EWS` students will see only `GEN` cutoffs applied to them.

Treat the output as a **starting list to explore**, not a prediction.

### Mode isolation

Do not run **plugin mode and standalone bot mode simultaneously for the same Telegram chat.** Both will reply, and both will write to the same Neon DB — students get duplicate messages, and `/set-preferences` invocations race. There is no technical interlock in V1; the dashboard's Bot Config page shows a warning, and the recommendation is "pick one mode per chat."

`/add-exam` is idempotent in practice (retakes are a first-class scenario, so duplicate rows are not constraint-blocked), but `/set-preferences` is keyed PK-on-`chat_id` and the race resolves to last-writer-wins.

## Architecture

- `src/hook.ts` — tele's dynamic-import target. Exports `getContext(chatId, ctx?)` and `handleSlashCommand(cmd, args, chatId, ctx?)`. Self-contained: only `node:*`, `@neondatabase/serverless`, `nanoid`, and relative imports.
- `src/db/` — Neon client cache, migration runner (split-on-`;`, idempotent), repos for students/exams/preferences/colleges, and SQL migrations.
- `src/engine/` — pure recommender + persona/methodology prompt strings.
- `server/` — standalone Fastify server: REST API (`/api/students`, `/api/colleges`, `/api/config/bot`, …), bot poller (`bot/poller.ts` + `bot/dispatch.ts`), Gemini reply path (`bot/llm.ts`).
- `web/` — React + Vite + Tailwind dashboard. Pages: Students, StudentDetail, Colleges, CollegeDetail, BotConfig.

The plugin and the standalone server import the same `src/hook.ts` — there is exactly one set of business logic.
