# process-platform (processOS)

A **Next.js** app for defining workflows as JSON **templates**, running **process instances** with audited step context, and driving them through a mix of human input, branching logic, background jobs, and external integrations.

---

## Architecture

| Layer | Role |
|--------|------|
| **UI** | Next.js App Router (`src/app`), React 18, Tailwind. Client calls REST with `Authorization: Bearer …` (token from login). |
| **API** | Route handlers under `src/app/api/**`. Enforce Auth0 JWT + RBAC permissions before touching services. |
| **Services** | `execution-service` (lifecycle + step execution), `expression-service` (safe JS expressions), `storage` (templates + process state), `agent-service`, Slack helpers, auth. |
| **Storage** | Resolved at startup via Inversify: **MongoDB** when `MONGO_URL` is set, otherwise **local file** persistence (`src/services/storage`). |
| **Jobs** | `npm run job:step` runs `src/jobs/run-step-job.ts`, which polls running processes and invokes `executionService.executeStep` for steps that advance without direct user “Complete” (see [Process engine](#process-engine)). Production `start` runs Next and this job together (`concurrently`). |

Data model in short: a **template** holds `firstStepKey` and `steps[]`. A **process** embeds the template snapshot, maintains `steps[]` as a stack of step *instances* (each with a unique `id`), `context` keyed by template step `key`, optional `result` for completion UI, and `stepContextAudit` for changes.

Additional notes live under `docs/` (e.g. data model sketches); treat them as supplementary—the TypeScript entities in `src/entities` are the source of truth.

---

## UI

- **Shell**: `AuthGuard` + `AppShell` sidebar (`src/app/layout.tsx`, `app-shell.tsx`): Dashboard, Templates (if `templates:read`), Active Processes, user card, sign-out.
- **Routes** (non-exhaustive): `/` dashboard, `/login`, `/templates` and `/templates/editor/[key]` (visual editor with `@xyflow/react`), `/processes`, `/process/[processId]` (run / complete steps), `/start/[templateKey]`, `/docs` (Swagger UI for the OpenAPI spec in `src/lib/openapi.ts`).
- **Client API access**: `authFetch` / `authHeaders` (`src/lib/auth-client.ts`) attach the stored JWT. On `401`, the token is cleared and the user is sent back to `/login`.

---

## API

All **`/api/*`** routes except `/api/auth/login` and `/api/auth/callback` expect a **Bearer** session token (`src/middleware.ts`). Handlers then check **RBAC permissions** (see below).

Typical endpoints:

| Method | Path | Permission (typical) | Purpose |
|--------|------|----------------------|---------|
| `GET` | `/api/me` | *(valid JWT)* | Current principal: `userId`, `permissions`, optional `email`. |
| `GET` | `/api/process-templates` | `processes:read` | List templates available to start a run. |
| `GET`/`POST` | `/api/process` | `processes:read` / `processes:write` | List processes; **start** with `{ "templateKey": "…" }`. |
| `GET`/`DELETE` | `/api/process/{id}` | `processes:read` / `processes:delete` | Load state (includes `canActOnCurrentStep`, `canCompleteCurrentStep`); hard-delete. |
| `PUT` | `/api/process/{id}/steps/{stepId}` | *(route-specific)* | Merge JSON into `context[stepKey]`; audit trail. |
| `POST` | `/api/process/{id}/steps/{stepId}/complete` | *(route-specific)* | Optional body merge, then advance to `nextStepKey` (or complete process). |
| `POST` | `/api/process/{id}/abandon` | *(route-specific)* | Mark running process completed. |
| `GET`/`PUT` | `/api/templates` and `/api/templates/{key}` | `templates:read` / `templates:write` | Read/write full template documents. |

Interactive reference: **`/docs`** (Swagger UI). The embedded OpenAPI object may lag slightly behind the live route bodies (e.g. `POST /api/process` is `templateKey`-only in code); use the route implementations as the final word.

---

## Auth

- **Provider**: **Auth0** OAuth2 authorization code flow. After callback, the app stores the **API access token** (audience = `AUTH0_AUDIENCE`) so the JWT includes Auth0 **RBAC `permissions`**—not the ID token (`src/services/auth/authentication.ts`).
- **Verification**: Edge **`middleware`** validates Bearer tokens with Auth0 JWKS (issuer + audience).
- **Principal**: `sub` → user id; `permissions` array for API checks; optional email from a configurable claim (`AUTH0_EMAIL_CLAIM` / `NEXT_PUBLIC_AUTH0_EMAIL_CLAIM`).
- **Client**: Token in `localStorage` under `process-platform-token`. Login flow hits `/api/auth/login` → Auth0 → `/api/auth/callback` → handoff page that sets storage and redirects.
- **Permissions** (`src/lib/permissions.ts`): `templates:read`, `templates:write`, `processes:read`, `processes:write`, `processes:delete`. These must exist on your Auth0 API. **Input steps** also declare per-step `permissions[]`; `authorizationService` decides who may edit or complete a step, including optional `completeExpression` on input steps.

For scripts or local testing without the full OAuth UI, the repo includes `npm run mint-long-lived-jwt` (see `scripts/mint-long-lived-jwt.ts`).

---

## Process engine

1. **Start**: `startProcess(templateKey)` loads the template from storage, creates a `running` process, pushes the first template step onto `process.steps`, persists.
2. **Human steps (`input`)**: User edits context via UI + `PUT …/steps/{stepId}`; **`complete`** runs `completeStep`, which resolves the next step with `getNextStepKey` (handles `condition` branching) and pushes the next step instance—or marks the process **completed** if there is no next step.
3. **Background tick** (`step-execution-job.ts`, ~1s): For each running process whose **current** template step is `automatic`, `condition`, `slack_notify`, or `request`, calls `executeStep` so work proceeds without a manual complete:
   - **`automatic`**: Evaluates `expression`, writes result under `contextKey` into `context[stepKey]`, advances via `nextStepKey`.
   - **`condition`**: Evaluates `expression`, follows `thenStepKey` / `elseStepKey`, else falls back to `nextStepKey` / completion (same branching rules as `getNextStepKey`).
   - **`slack_notify`**: Posts to Slack using `channelId`, `mentionUsers`, `messageExpression`; stores outcome under the step key; advances.
   - **`request`** (`requestType: "agent"`): Runs the configured agent with template `prompt` and current context; stores `response`; advances.

Overlapping ticks are guarded so a slow step is not executed twice.

---

## Process template syntax

A **template** is a JSON-shaped object (`src/entities/template/template.ts`):

| Field | Description |
|--------|-------------|
| `key` | Unique id (start process, URLs, storage). |
| `name`, `description` | Optional metadata. |
| `status` | Optional: `active` \| `draft` \| `archived`. |
| `firstStepKey` | Must match a `steps[].key`. |
| `steps` | Discriminated union of step types (below). |
| `permissions` | Template-level permission strings (authorization hooks). |
| `resultViewControls` | Optional read-only completion UI snippets (`TemplateStepViewControl`: `title`, `data` with `${context…}` and `{{ expression }}` patterns; optional `plainText` to render as monospace text with copy instead of HTML). |
| `updatedAt` | Optional ISO string. |

Every **step** shares (`template-step.ts`): `key`, `title`, `type`, `nextStepKey` (`null` if terminal), optional `confirmationMessage`, optional `editorProperties` (e.g. flow editor X/Y).

### `input`

- `inputs`: array of fields (`template-step-input.ts`):

  `key`, `title`, `type`: `bool` \| `string` \| `string-multiline` \| `number` \| `datetime` \| `dropdown` (`values` when dropdown). Optional `visibleExpression`, `readOnly`, `defaultValue` (templating for defaults / read-only text).

- `permissions`: who may act on this step.
- Optional **`completeExpression`**: JS expression (same safety rules as elsewhere) must be truthy before the API allows completing the step; may use `hasPermission("…")`.

### `condition`

- `expression`: evaluated for truthiness.
- `thenStepKey`, `elseStepKey`: branch targets; if expression fails to pick a valid branch, **`nextStepKey`** is used when present.

### `request`

- `requestType`: currently **`"agent"`** only.
- Optional `prompt`: system prompt; context is passed to the agent implementation.

### `automatic`

- `expression`: evaluated; result stored at `context[stepKey][contextKey]`.
- `nextStepKey`: where to go after (or complete if absent / invalid).

### `slack_notify`

- `channelId`, `mentionUsers` (emails / Slack user ids, per template semantics).
- `messageExpression`: evaluated to string body (mentions resolved server-side).

---

## Running locally

```bash
npm install
npm run dev
```

`dev` runs **Next.js** and the **step job** together. Configure Auth0 and optional `MONGO_URL` (see `src/instrumentation.ts` for env names referenced at startup). Set `NEXT_PUBLIC_APP_BASE_URL` / `APP_BASE_URL` so links such as `currentProcess.url` in expressions resolve correctly.

---

## License

Private package (`"private": true` in `package.json`).
