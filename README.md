# IELTS Agents

## Overview

**IELTS Agents** — an IELTS study platform powered by AI agents. Currently supports a **Reading agent** that generates IELTS Academic Reading passages and comprehension questions (True/False/Not Given, multiple choice, fill-in-the-blank, matching headings) calibrated to a target band score (5.0–9.0).

Subscription-based with a credits system: Free (200 credits/month), Basic, Elite, Ultimate plans via Stripe.

## Monorepo Structure

```
apps/
  ielts-agents-api/      # Hono API server (tRPC, AI agents, auth, billing)
  ielts-agents-app/      # React frontend (React Router 7, Vite, Tailwind CSS 4)
  ielts-agents-e2e/      # Playwright E2E tests
libs/
  ielts-agents-internal-nx/    # Custom Nx plugin (targets, Docker, CI)
  ielts-agents-internal-util/  # Shared utilities (plan definitions, env, errors, dates)
  eslint-config-base/
  eslint-config-react/
  eslint-config-tailwindcss/
```

**Package manager**: pnpm 10.26 — **Monorepo tool**: Nx 22.5

## Tech Stack

| Layer          | Technologies                                                          |
| -------------- | --------------------------------------------------------------------- |
| API            | Hono 4, tRPC 11, Better Auth, Zod 4                                   |
| AI             | Vercel AI SDK 6 (`ai`), `@ai-sdk/openai`, resumable-stream            |
| Database       | PostgreSQL 17 (pgvector), Drizzle ORM                                 |
| Cache/Sessions | Redis 8                                                               |
| Frontend       | React 19, React Router 7, Vite 7, Tailwind CSS 4, shadcn/ui, Radix UI |
| State          | Jotai, TanStack Query (React Query), `@ai-sdk/react`                  |
| Forms          | `@mantine/form`                                                       |
| Payments       | Stripe                                                                |
| Monitoring     | Sentry                                                                |
| Testing        | Playwright                                                            |
| Build          | TypeScript 5.8, ES2024, strict mode, `verbatimModuleSyntax`           |

## API Architecture (`ielts-agents-api`)

### Routes

| Endpoint                 | Method   | Auth      | Purpose                                    |
| ------------------------ | -------- | --------- | ------------------------------------------ |
| `/v1/health`             | GET      | No        | Health check (database, app, website)      |
| `/v1/auth/*`             | GET/POST | No        | Better Auth (email/password, Google OAuth) |
| `/v1/trpc/*`             | GET/POST | Session   | tRPC procedures                            |
| `/v1/ai/chat/:id/stream` | POST     | Session   | Start AI agent stream                      |
| `/v1/ai/chat/:id/stream` | GET      | Session   | Resume existing stream                     |
| `/v1/cron/daily`         | POST     | Bearer    | Daily cron (credits reset)                 |
| `/v1/webhook/stripe`     | POST     | Signature | Stripe subscription webhooks               |

### tRPC Procedures

- `chat` — list, get, delete, getAgentConfig, getSuggestions, updateChatName, getChatConfig
- `reading` — createReading, getReadingData, getReadingConfig, updateConfig
- `workspace` — sync (credits, plans)
- `billing` — manage (portal), update (plan changes)

Uses `superjson` for serialization. Two procedure types: `authProcedure` (auth only) and `workspaceProcedure` (auth + synced workspace).

### tRPC Frontend Usage Pattern

The frontend uses `trpcOptions` (from `lib/trpc-options.ts`) — a typed proxy created via `createTRPCOptionsProxy`. All query/mutation defaults are registered in `lib/defaults.ts`.

**When adding a new tRPC query:**

1. Register query defaults in `lib/defaults.ts` using `queryDefaults()`:

```typescript
queryDefaults(trpcOptions.chat.newQuery.queryOptions(queryInput()));

// With custom options:
queryDefaults(
  trpcOptions.chat.newQuery.queryOptions(queryInput(), {
    staleTime: Infinity,
  }),
);
```

2. Use it in components via `trpcOptions`:

```typescript
const { data, isError, isPending, refetch } = useQuery(
  trpcOptions.chat.newQuery.queryOptions({ id }),
);
```

**When adding a new tRPC mutation:**

1. Register mutation defaults in `lib/defaults.ts` using `mutationDefaults()` — always define `onSuccess` and `onError`:

```typescript
mutationDefaults(
  trpcOptions.chat.newMutation.mutationOptions({
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(trpcOptions.chat.list.queryOptions());
      toast.success("Success message");
    },
    onError: (error) => {
      toast.error("Failed to do something", {
        description: getErrorMessage(error),
      });
    },
  }),
);
```

2. Use it in components via `trpcOptions` (no need to re-define callbacks — they come from defaults):

```typescript
const mutation = useMutation(trpcOptions.chat.newMutation.mutationOptions());
mutation.mutate({ ... });
```

### Agent System

- `CustomAgent` extends AI SDK `ToolLoopAgent` with `metadataSchema`, `dataSchemas`, and custom `prepareCall`
- Agents registered in `lib/agents.ts` — currently only `reading`
- `AgentId` type derived from `keyof Agents`
- Reading agent tools: `generate-passage`, `generate-questions`, `suggestions` (plus shared `chatTools`)
- AI streaming uses `resumable-stream` backed by Redis for reconnection support

### Credits System

- Workspace tracks `aggregatedCredits` and `usedCredits`
- AI calls consume credits via `creditsUsage` context passed to agents
- Credits reset monthly via `/v1/cron/daily` endpoint
- Plan changes tracked in `changedPlans` JSONB array on workspace

## Database Schema (Drizzle)

### Tables

- **`user`**, **`account`**, **`verification`** — Better Auth managed
- **`workspace`** — per-user workspace with Stripe customer ID, plan history (`changedPlans`), credit counters
- **`chat`** — conversations with messages (JSONB `UIMessage[]`), stream ID, suggestions
- **`chat_reading`** — reading agent config per chat (band score)
- **`reading_passage`** — generated IELTS reading passages (title, content, topic, difficulty) linked to `chat_reading`
- **`reading_question`** — generated comprehension questions (type, text, options, correct answer, explanation) linked to `chat_reading`
- **`reading_default`** — per-workspace default reading settings (band score)

### Key Constraints

- `changedPlans` must have at least one entry
- `usedCredits` and `aggregatedCredits` must be non-negative
- `usedCredits` must not exceed `aggregatedCredits`

### Migrations

Only update schema files (`lib/schema/app.ts`). Never create migration SQL files directly.

```
npx drizzle-kit generate    # Generate migration from schema changes
npx drizzle-kit migrate     # Run pending migrations
npx drizzle-kit generate --custom  # Create empty migration for custom SQL
```

### Resetting the Database

When a migration needs to be redone from scratch (e.g. schema change was wrong, migration is broken):

1. Revert the schema file (`lib/schema/app.ts`) to its previous state
2. Run `bash local-down.sh` to tear down Docker containers and remove all data
3. Run `bash local-up.sh` to recreate Docker containers and a fresh database (this also runs existing migrations)
4. Apply the new schema changes to `lib/schema/app.ts`
5. Generate and migrate: `pnpm exec nx run ielts-agents-api:drizzle-kit-generate && pnpm exec nx run ielts-agents-api:drizzle-kit-migrate`

## Frontend Architecture (`ielts-agents-app`)

### Routing (React Router 7)

**Main layout** (sidebar):

- `/` — index
- `/reading` — reading agent
- `/chat/:id` — chat view
- `/account/settings`, `/account/security`, `/account/billing`, `/account/display`

**Alternate layout** (auth, close):

- `/auth/:path`, `/auth-callback`, `/continue`, `/close`

### Key Patterns

- `useChat` from `@ai-sdk/react` with resume support for AI streaming
- Per-agent configs define `onData`, `Project`, `renderToolPart`, `PromptInput`
- SSR disabled — SPA mode with Vercel deployment preset

### useQuery Rules

Every component that uses `useQuery` **must** follow these rules:

1. **One `useQuery` per component** — if a component needs two queries, split it into two components. Never put multiple `useQuery` calls in the same component.

2. **Render all three states in order**: `isPending` → `isError` → data. Always check states in this exact order:

```typescript
export function MyComponent({ id }: { id: number }) {
  const { data, isPending, isError, error, isRefetching, refetch } = useQuery(
    trpcOptions.something.queryOptions({ id }),
  );

  if (isPending)
    return <Skeleton />;

  if (isError) {
    return (
      <RetryErrorAlert
        error={error}
        isRefetching={isRefetching}
        refetch={refetch}
        title="Failed to load data"
      />
    );
  }

  return <MyContent data={data} />;
}
```

3. **Always show error text and a retry button on `isError`** — use `RetryErrorAlert` for full-page errors or inline `getErrorMessage(error)` + `<Button onClick={() => void refetch()}>Retry</Button>` for smaller contexts.

4. **Separate data rendering into its own component** — the component with `useQuery` handles loading/error states and passes `data` to a child content component:

```typescript
// ✅ Good — query component handles states, content component receives data
function MyFeature({ id }: { id: number }) {
  const { data, isPending, isError, ... } = useQuery(...);
  if (isPending) return <Skeleton />;
  if (isError) return <RetryErrorAlert ... />;
  return <MyFeatureContent data={data} />;
}

function MyFeatureContent({ data }: { data: Data }) {
  // No useQuery here — just render data
}
```

### Data Flow Pattern (ChatAcademia Pattern)

When an AI agent needs to update the UI project panel in real-time, follow this data flow:

1. **Agent tools write to separate DB tables** (e.g., `readingPassage`, `readingQuestion`)
2. **Tools call `ctx.onReadingUpdate()`** after DB writes
3. **Agent sends data notification** via `writer.write({ type: "data-...", data: { updated: true }, transient: true })`
4. **Frontend `onData` callback** receives the notification and calls `queryClient.invalidateQueries(...)` for the relevant tRPC query
5. **Project panel re-fetches** via its `useQuery` and re-renders with new data

```typescript
// API: Tool writes to DB, then notifies
ctx.onReadingUpdate(); // triggers writer.write(...)

// App: onData handler invalidates cache
onData: ({ id }) => {
  void queryClient.invalidateQueries(
    trpcOptions.reading.getReadingData.queryOptions({ chatId: id }),
  );
},

// App: Project panel re-fetches automatically
const { data } = useQuery(
  trpcOptions.reading.getReadingData.queryOptions({ chatId }),
);
```

### Tool Render Pattern

Each agent's tools are rendered in the conversation UI using a type-safe render function. Follow this pattern:

1. **Shared components** in `lib/`:
   - `task.tsx` — Collapsible wrapper with auto-close on completion, spinner while loading
   - `tool-container.tsx` — Bordered container for tool content
   - `tool-icon.tsx` — Shows spinner while loading, icon when complete
   - `tool-error-content.tsx` — Error/validation alert display
   - `is-tool-complete.ts` — Helper to check tool state
   - `tool-settings.ts` — Tool visibility config (e.g., hide `suggestions` tool)
   - `dynamic-tool.tsx` — Fallback renderer for unknown tool types

2. **Per-agent tool renderers** in `lib/<agent>-tools/`:
   - `index.tsx` — Main switch that routes `toolPart.type` to specific components
   - One file per tool (e.g., `generate-passage-tool.tsx`, `generate-questions-tool.tsx`)

3. **Each tool component handles three states**:
   - Loading: skeleton/spinner while `toolPart.state` is streaming/running
   - Error: `ToolErrorContent` when `toolPart.state === "output-error"`
   - Complete: show result summary when `toolPart.state === "output-available"`

4. **Hidden tools** (like `suggestions`) are configured in `tool-settings.ts` and skipped in the renderer

## File Organization

**Priority: one file per function/type/hook/component in the `lib/` folder. Do not create subfolders unless grouping tightly coupled multi-file features.**

### API (`ielts-agents-api/lib/`)

Flat structure — each file exports a single function, type, schema, or class:

```
lib/
  database.ts              # database instance
  redis.ts                 # redis client
  stripe.ts                # stripe client
  reading-agent.ts         # reading agent definition
  custom-agent.ts          # CustomAgent class
  credits-usage.ts         # credits usage type
  insert-chat.ts           # insertChat function
  band-score-schema.ts     # bandScoreSchema zod schema
  ...
```

Subfolders only for grouped concerns:

- `schema/` — Drizzle database schema (`app.ts`, `auth.ts`, `relations.ts`)
- `router/routes/` — tRPC route handlers (`chat.ts`, `billing.ts`, `workspace.ts`, `reading.ts`)
- `emails/` — React Email templates

### App (`ielts-agents-app/lib/`)

Same flat convention — one file per component, hook, atom, or utility:

```
lib/
  use-chat.ts              # useChat hook
  use-session.ts           # useSession hook
  trpc-options.ts          # trpcOptions proxy
  defaults.ts              # query/mutation defaults
  navigate-atom.ts         # navigateAtom
  theme-atom.ts            # themeAtom
  conversation.tsx         # Conversation component
  suggestions.tsx          # Suggestions component
  ...
```

Subfolders only for multi-file UI features:

- `main-layout/` — sidebar, history, credits (multiple related components)
- `subscription-card/` — subscription management UI
- `reading-tools/` — reading tool part renderers
- `reading-project/` — reading project panel

## Path Aliases

- `#./*` — project root imports (both API and app)
- `#react-router/*` — React Router generated types (app only)
- `~/` — app components (convention in frontend)

## Shared Utilities (`ielts-agents-internal-util`)

Exports: `date`, `env`, `error` (`captureError`, `getErrorMessage`), `flag`, `is-live`, `misc`, `plan` (definitions, keys, formatting), `zod`

## Local Development

**Service ports**: API — `42310`, App — `42312`, Email preview — `42313`

**Docker services** (`compose.yaml`): `pgvector/pgvector:pg17`, `redis:8`

## Common Commands

All Nx targets are auto-inferred by the custom plugin (`ielts-agents-internal-nx`). Use `pnpm exec nx` or `npx nx` to run them.

### Setup & Teardown

```bash
pnpm local:up      # Docker Compose up, generate .local/.secrets (PG_URL, REDIS_URL), nx reset, configure services
pnpm local:down    # Teardown local services, remove .local, Docker Compose down
```

### Dev Servers

```bash
# Run both API and app dev servers (app depends on API, starts API first)
pnpm exec nx run-many --projects=ielts-agents-api,ielts-agents-app --targets=dev

# Run API only (tsx watch, port 42310)
pnpm exec nx run ielts-agents-api:dev

# Run app only (react-router dev, port 42312)
pnpm exec nx run ielts-agents-app:dev
```

### Build

```bash
# Build all projects
pnpm exec nx run-many -t build

# Build specific project
pnpm exec nx run ielts-agents-api:build
pnpm exec nx run ielts-agents-app:build
```

### Production Start (requires build first)

```bash
# Start both API and app in production mode
pnpm exec nx run-many --projects=ielts-agents-api,ielts-agents-app --targets=start

# Start individual
pnpm exec nx run ielts-agents-api:start    # node dist/lib/index.js
pnpm exec nx run ielts-agents-app:start    # serve -s build/client
```

### Type Checking & Linting

```bash
# Typecheck all projects
pnpm exec nx run-many -t typecheck

# Lint all projects
pnpm exec nx run-many -t lint

# Typecheck or lint a specific project
pnpm exec nx run ielts-agents-api:typecheck
pnpm exec nx run ielts-agents-app:lint
```

### Database (Drizzle)

```bash
# Generate migration from schema changes
pnpm exec nx run ielts-agents-api:drizzle-kit-generate

# Run pending migrations
pnpm exec nx run ielts-agents-api:drizzle-kit-migrate
```

### Auth (Better Auth)

```bash
# Regenerate Better Auth schema (lib/schema/auth.ts)
pnpm exec nx run ielts-agents-api:better-auth-generate
```

### Email Preview

```bash
# Start react-email preview server (port 42313)
pnpm exec nx run ielts-agents-api:email
```

### Testing (Playwright)

```bash
# Run E2E tests (auto-starts API + app)
pnpm exec nx run ielts-agents-e2e:test

# Install Playwright browsers and deps
pnpm exec nx run ielts-agents-e2e:install-playwright-deps
```

### Docker

```bash
# Prepare and build Docker image for a project
pnpm exec nx run ielts-agents-api:build-docker-image
```

### Formatting

```bash
pnpm format    # Run Prettier via Husky pre-commit hook
```

### Other

```bash
pnpm prepare   # Setup Husky hooks
pnpm upgrade   # Run upgrade script
```

## Environment Variables

Required (gitignored `.env` / `.env.*` / `.secrets`):

- `PG_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` — Stripe
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `AUTOMATION_SECRET` — cron authentication
- `EMAIL_*` — Nodemailer config
- `SENTRY_*` — error tracking

Local secrets are auto-generated in `.local/.secrets` by `pnpm local:up`.

## CI & Release

- Nx version plans for releases with GitHub changelog
- Custom Nx plugin handles `prepare-docker-image`, `build-docker-image`, `prepare-github-actions`, and `configure-sentry-release` targets
- Husky pre-commit runs formatting (Prettier with `prettier-plugin-packagejson`)
- Custom `.script.ts` / `.script.tsx` files in project roots are auto-registered as Nx targets

## Documentation Lookup

When researching libraries, APIs, or frameworks:

1. **Use Context7 MCP first** — always query the Context7 MCP tools to find documentation before anything else. Context7 provides up-to-date, version-specific docs for most libraries in the tech stack.
2. **Fall back to WebSearch** — only if Context7 does not return useful results, use `WebSearch` or `WebFetch` to find documentation on the web.

## UI Design with shadcn/ui

When building or updating UI components, follow these guidelines:

1. **Research the shadcn registry first** — before designing any UI, search the [shadcn/ui registry](https://ui.shadcn.com) deeply for existing components, blocks, and templates that match the desired design. Use Context7 MCP or `WebSearch`/`WebFetch` to browse available options.
2. **Install components via `pnpm dlx shadcn@latest add`** — always use the shadcn CLI to add components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

3. **Avoid writing full custom components** — prefer composing from shadcn/ui primitives. Only add custom styling or logic on top of shadcn components, never rewrite them from scratch.
4. **Check for blocks and templates** — shadcn provides pre-built page blocks (login forms, dashboards, settings pages, etc.). Use these as starting points instead of building from zero.

## New Code Verification Workflow

After implementing any new feature or code change, follow these steps in order.

### Step 1: Fix All Lint & Type Errors

1. Run typecheck and lint on affected projects:

```bash
pnpm exec nx run-many -t typecheck,lint
```

2. **Fix every error properly** — do NOT disable ESLint rules or suppress TypeScript errors unless the line genuinely does not need type safety (e.g., third-party type mismatch).
3. When suppression is truly necessary, only disable a **single line** with an inline comment (`// eslint-disable-next-line <rule>` or `// @ts-expect-error <reason>`). Never disable an entire file or block.
4. Re-run typecheck and lint until zero errors remain.

### Step 2: Run E2E Tests

1. **Kill all running servers/ports** related to `ielts-agents` before running tests (ports 42310, 42312, 42313):

```bash
lsof -ti:42310,42312,42313 | xargs kill -9 2>/dev/null || true
```

2. Run the Playwright E2E suite:

```bash
pnpm exec nx run ielts-agents-e2e:test
```

3. All tests must pass. If any fail, fix the root cause and re-run until green.

### Step 3: Playwright MCP UI Testing

1. Start both dev servers and confirm they boot without errors:

```bash
pnpm exec nx run-many --projects=ielts-agents-api,ielts-agents-app --targets=dev
```

2. Wait until both servers are healthy (API on `localhost:42310`, App on `localhost:42312`).
3. Use the **Playwright MCP tools** to interact with the app in a real browser and verify the new feature works correctly through the UI.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
