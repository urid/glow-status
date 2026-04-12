# Glow Fashion Idol — Cross-Project Dashboard Design

**Date:** 2026-03-22
**Status:** Approved
**Project:** D:/Github/glow-status

---

## Overview

A local web dashboard that tracks three JIRA projects (GGS, CLPLG, SST2) and six Slack channels for the Glow Fashion Idol multiplayer services team. Replaces a prototype (`dashboard.jsx`) that had hardcoded data, no persistence, and required running inside a Claude chat window for MCP auth.

---

## Architecture

TypeScript monorepo, no Docker. Two packages started with `npm run dev` via `concurrently`.

```
glow-status/
  backend/   — Node.js + Express + TypeScript (port 3001)
  frontend/  — React + Vite + TypeScript + Tailwind CSS (port 5173)
  data/      — SQLite database (glow.db)
  .env       — credentials (never committed)
```

### Data Flow

- **Frontend** talks only to the backend. No external API calls from the browser.
- **On page load**: `GET /api/data` returns the last SQLite snapshot — instant render, no external calls.
- **On refresh**: `POST /api/refresh` triggers parallel fetch of JIRA (3 JQL queries) + Slack (6 channels), passes Slack messages to Claude for classification, writes snapshot to SQLite, returns full data.

### External Integrations

| Service | Auth | Used for |
|---|---|---|
| Atlassian REST API | JIRA API token + email | Fetch issues, create links, create issues |
| Slack Web API | Slack Bot token | Read channel messages |
| Anthropic API | API key | Classify Slack messages into structured items |

---

## Backend

### API Routes

```
GET  /api/data              — last snapshot + dismissed suggestions + link results
POST /api/refresh           — fetch JIRA + Slack, classify, persist, return data
POST /api/links             — create a JIRA "Relates" link
POST /api/issues            — create a counterpart issue and link it
POST /api/dismissed         — save a dismissed link suggestion
DELETE /api/dismissed/:id   — remove a dismissed suggestion
```

### Services

- **jira.service.ts** — executes 3 JQL queries against the Atlassian REST API. Deduplicates SST2 results (assignee/watcher query returns duplicates). Post-processing excludes Epics. Filters issue links to only include keys starting with GGS, CLPLG, or SST2.
- **slack.service.ts** — reads last 24h of messages from 6 channels via Slack Web API.
- **ai.service.ts** — sends Slack messages to Claude (claude-opus-4-6) for classification into structured items with: channel, severity, title, description, reporter, JIRA key, action owner, action item, done status, resolution.
- **db.service.ts** — SQLite read/write for snapshots, dismissed suggestions, link results.

### SQLite Schema

```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY DEFAULT 1,
  jira_data TEXT,       -- JSON: { GGS: [...], CLPLG: [...], SST2: [...] }
  slack_data TEXT,      -- JSON: { channels: [...], items: [...] }
  refreshed_at TEXT     -- ISO timestamp, null until first successful refresh
);
-- Always upsert with: INSERT OR REPLACE INTO snapshots (id, ...) VALUES (1, ...)
-- Stale issuelinks: the Atlassian REST API is used directly (not MCP), so phantom
-- link issues are less likely. No individual-issue verification pass is needed.

CREATE TABLE dismissed_suggestions (
  pair_key TEXT PRIMARY KEY  -- e.g. "GGS-173-CLPLG-56"
);

CREATE TABLE link_results (
  pair_key TEXT PRIMARY KEY,
  status TEXT  -- "ok" | "err"
);
```

### JIRA Queries

```
GGS:   project = GGS AND issuetype != Epic AND (status != Done OR (status = Done AND resolved >= -7d))
CLPLG: project = CLPLG AND issuetype != Epic AND (status != Done OR (status = Done AND resolved >= -7d))
SST2:  project = SST2 AND issuetype != Epic
       AND (assignee = 557058:0b20c326-8d11-41ef-8e7d-6651e435f006
            OR watcher = 557058:0b20c326-8d11-41ef-8e7d-6651e435f006)
       AND (status != Done OR (status = Done AND resolved >= -7d))
```

Fields: `summary,status,issuetype,priority,assignee,issuelinks`

### Data Quality Rules (from prototype learnings)

- **SST2 deduplication**: assignee/watcher JQL returns same issue twice — deduplicate by key.
- **Epic exclusion**: enforce both in JQL (`issuetype != Epic`) and post-processing.
- **Issue link filtering**: only include links where linked key starts with GGS, CLPLG, or SST2.
- **Stale issuelinks**: Atlassian bulk JQL `issuelinks` expansion can return phantom links. For cross-project links, consider individual `getJiraIssue` verification calls if link accuracy is critical.

---

## Frontend

### Component Structure

```
src/
  components/
    Header.tsx            — title, refresh button + spinner, timestamp, project counts
    SummaryCards.tsx      — 5 clickable status group cards, toggle filter on click
    Filters.tsx           — project dropdown, feature area dropdown, search input, active chips
    IssueList.tsx         — sorted/filtered list of all issues
    IssueCard.tsx         — single issue row: priority emoji, key link, project badge,
                            summary, status badge, assignee, links, counterpart buttons
    LinkSuggestions.tsx   — collapsible amber section with suggested links + confirm/dismiss
    SlackSection.tsx      — unified Slack items list with severity, done state, actions
    CreateIssueModal.tsx  — modal for creating counterpart issues in target project
  hooks/
    useData.ts            — React Query: GET /api/data
    useRefresh.ts         — mutation: POST /api/refresh
  store/
    filters.ts            — Zustand: project filter, feature area filter, status chips, search
```

### Feature Area Detection

Scan the issue summary (lowercase) for the first matching keyword. Each keyword maps to its title-cased label. If no keyword matches, the area is `Other`.

Keywords in priority order: `runway` → Runway, `matchmaking` → Matchmaking, `bot` → Bot, `friend` → Friend, `gift` → Gift, `auth` → Auth, `score` → Score, `dashboard` → Dashboard, `notification` → Notification, `push` → Push, `profile` → Profile, `coupon` → Coupon. No match → `Other`.

Stopwords for link suggestion keyword overlap (excluded from comparison): `the, a, an, is, in, for, to, of, and, or, from, with, should, be, not, it, when, if, can, need, this`

### Status Groups & Sort Order

| Group | Statuses | Sort |
|---|---|---|
| BLOCKED | BLOCKED | 1 |
| IN DEV | in DEV, In Progress, In progress, Code Review, Ready For Review | 2 |
| IN QA | In QA, Pending QA | 3 |
| TODO | To Do, TO DO, BACKLOG, Ready For Dev | 4 |
| DONE | Done, pending deployment | 5 |

### Counterpart Button Rules

- SST2 cards → `+ Server` and/or `+ Plugin` (unless already linked to those projects)
- CLPLG cards → `+ Server` (unless already linked to GGS)
- GGS cards → `+ Plugin` (unless already linked to CLPLG)
- No card ever shows `+ Game`

### Link Suggestion Algorithm

For issues with no cross-project links: compare summaries using keyword overlap (≥2 shared meaningful words, excluding stopwords). Show suggestions in a collapsible amber section. Confirmed suggestions call `POST /api/links`. Dismissed suggestions are stored in SQLite.

### Refresh Behavior

- Timestamp only updates after successful fetch + parse. Error keeps old timestamp.
- No timestamp shown on initial load (null state).
- Refresh button shows spinner during fetch.
- JIRA and Slack fetches run in parallel (`Promise.all` on the backend).

---

## Visual Design

Matches `dashboard.jsx` exactly:
- Background: `#f8f9fb`
- Header gradient with purple accent `#7c3aed`
- Project badges: Server (teal), Plugin (purple), Game (pink)
- Status badges with colored dots per status group
- `JetBrains Mono` for issue keys, `DM Sans` for body text
- Cards with hover states, left border accent for cross-linked issues
- Done Slack items visually faded

---

## Out of Scope

- No user authentication
- No real-time websocket updates (manual refresh only)
- No issue editing beyond creating links and counterpart issues
- No full JIRA board replication

---

## Environment Variables

```
JIRA_BASE_URL=https://tabtale.atlassian.net
JIRA_USER_EMAIL=
JIRA_API_TOKEN=
SLACK_BOT_TOKEN=
ANTHROPIC_API_KEY=
ATLASSIAN_CLOUD_ID=e12af754-9c9b-433f-9c88-41117d73202d
PORT=3001
```
