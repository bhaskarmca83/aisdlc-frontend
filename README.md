# aisdlc-frontend

React 18 operator console for the AI SDLC Orchestration Platform. Provides project registration, pipeline monitoring, real-time event streaming, human approval gates, and state inspection — all wired to the orchestrator's REST and WebSocket APIs.

---

## Platform Context

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI SDLC Platform                          │
│                                                                  │
│  ┌──────────────────────────┐   REST/WS   ┌─────────────────┐  │
│  │  aisdlc-frontend         │────────────▶│  aisdlc-        │  │
│  │  React 18 + Vite         │◀────────────│  orchestrator   │  │
│  │  ★ THIS REPO  :3000      │  events     │  FastAPI :8001  │  │
│  └──────────────────────────┘             └─────────────────┘  │
│                                                                  │
│  aisdlc-backend  (Spring Boot :8080)  — target app; not called  │
│  aisdlc-infra    (Terraform + Helm)   — deploys this to S3/CF   │
└──────────────────────────────────────────────────────────────────┘

Backend base URL:  http://localhost:8001       (local dev)
WebSocket:         ws://localhost:8001/ws/events/{execution_id}
Production:        CloudFront → S3 (static build)
```

---

## Pages and Features

| Page / Component | Route | Purpose |
|---|---|---|
| **ProjectSelector** | `/` | Lists all registered team projects; entry point to start a pipeline run or register a new project |
| **RegisterProject** | `/register` | 5-step wizard: project type → name/team → Jira/Confluence keys → repo + profile assignment → review |
| **PipelineStages** | `/pipeline/:id` | Live stage tracker; shows 8 agent nodes and their current status with colour-coded dots |
| **LogStream** | `/pipeline/:id` | Real-time WebSocket event log; renders each pipeline event as it arrives from Redis Streams |
| **ApprovalGate** | `/pipeline/:id` | Human gate UI; shows stories (PO gate) or TSD link (Arch gate) with Approve/Reject + reason field |
| **MemoryViewer** | `/pipeline/:id` | Reads `/api/pipeline/{id}/state`; renders every SDLCState field live so operators can inspect agent output |
| **ToolCallInspector** | `/pipeline/:id` | Displays MCP tool calls — agent name, tool name, arguments, and result — as they occur |
| **RepoPanel** | `/pipeline/:id` | Shows repo assignment per story, feature branch names, and file change count from state |

---

## Registration Wizard (Step Detail)

```
Step 1 — Project type       new | existing
Step 2 — Name & team        project name, team name, description
Step 3 — Atlassian          Jira project key + Confluence space key
                            Validate button checks keys against orchestrator API
                            Auth errors show orange ⚠ with credential fix hint
Step 4 — Repos & profiles   Add repos; assign role + tech profile per repo
                            Profile dropdown shows 19 built-in + custom profiles
                            Child profiles annotated [↑ parent-id]
                            Inline "Create custom profile" form (collapsible)
                            Profile metadata badges: language, framework, e2e_strategy
Step 5 — Review & save      Full summary before POST /api/projects
```

---

## Tech Profile Integration

The wizard calls `/api/profiles/categories` to populate the profile dropdown in Step 4. Each profile carries enough metadata to display useful context without a separate lookup:

- `language` / `framework` shown as badges after selection
- `extends` shown as lineage annotation on child profiles
- `e2e_strategy` shown so the team knows which E2E runner will run
- Custom profiles created inline are immediately available in the dropdown (POST `/api/profiles/custom`)

---

## Contracts Consumed

All calls go to `http://localhost:8001` (configurable via `VITE_API_BASE` if needed).

| Endpoint | Used by |
|---|---|
| `GET /api/projects` | ProjectSelector — list registered projects |
| `POST /api/projects` | RegisterProject Step 5 — save |
| `DELETE /api/projects/{id}` | ProjectSelector — delete |
| `GET /api/profiles/categories` | RegisterProject Step 4 — profile dropdown |
| `POST /api/profiles/custom` | RegisterProject Step 4 — inline custom profile |
| `GET /api/validate/jira/{key}` | RegisterProject Step 3 — validate Jira key |
| `GET /api/validate/confluence/{key}` | RegisterProject Step 3 — validate Confluence key |
| `POST /api/validate/confluence/create-space` | RegisterProject save — create space for new projects |
| `POST /api/pipeline/run` | ProjectSelector — start run |
| `GET /api/pipeline/{id}/status` | PipelineStages — poll status |
| `GET /api/pipeline/{id}/state` | MemoryViewer — full state snapshot |
| `POST /api/gate/{id}/approve` | ApprovalGate — submit decision |
| `WS /ws/events/{id}` | LogStream, PipelineStages — real-time events |

---

## Local Setup

**Prerequisites:** Node 20+, orchestrator running on `:8001`

```bash
npm install
npm run dev
# App at http://localhost:3000
```

The Vite dev server proxies nothing — all API calls go directly to `http://localhost:8001`. Start the orchestrator first.

---

## Build for Production

```bash
npm run build
# Output in dist/
```

`dist/` is a static SPA. Deploy to S3 and serve via CloudFront (see `aisdlc-infra`). The `index.html` must be set as both the root document and the error document so client-side routing works.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | React 18 | Concurrent rendering for live state updates |
| Build tool | Vite | Fast HMR; no CRA overhead |
| Routing | React Router v7 | File-based route structure |
| Styling | Tailwind CSS | Utility-first; dark theme via `dark-700/600/500` custom scale |
| Real-time | Native WebSocket | No library needed; orchestrator streams one event per Redis Streams message |

---

## Key Architectural Decisions

**Why no state management library?** Pipeline state lives in the orchestrator (Redis). The frontend reads it on demand via polling and WebSocket. Local React state is sufficient for wizard form state and per-page UI state — adding Redux or Zustand would duplicate what Redis already owns.

**Why Validate is informational, not a gate?** The `canAdvance()` guard for Step 3 only requires the key fields to be non-empty. The Validate button confirms the key exists but the wizard does not block on it — useful when API credentials are temporarily invalid but the team knows the project exists.

**Why inline custom profile creation?** Requiring a separate admin UI for custom profiles would break the registration flow. Embedding the form as a collapsible panel in Step 4 keeps the operator in context and immediately refreshes the dropdown on creation.

---

## Confluence / Jira Reference

- Platform TSD: `https://bhaskarwork.atlassian.net/wiki/spaces/SD`
- Orchestrator API docs: `http://localhost:8001/docs`
