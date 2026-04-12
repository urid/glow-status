# Glow Fashion Idol — Cross-Project JIRA + Slack Dashboard

## Requirements for Claude Code

### Overview

Build a web dashboard that tracks three JIRA projects (GGS server, CLPLG plugin, SST2 game) for the Glow Fashion Idol multiplayer services team. The dashboard merges JIRA issue data with Slack channel intelligence to give the team a single view of what's happening across all three projects.

The current prototype is a single React artifact (`dashboard.jsx`, attached). It works but has limitations: data is hardcoded and must be manually refreshed via chat, no persistence between sessions, and the MCP connector auth only works inside a Claude chat window. This rebuild should solve those problems.

---

### Data Sources

**JIRA (Atlassian)**
- Atlassian Cloud ID: `e12af754-9c9b-433f-9c88-41117d73202d`
- Three projects tracked:
  - **GGS** (Glow Game Server) — all non-Epic issues
  - **CLPLG** (Client Plugin) — all non-Epic issues
  - **SST2** (Glow Game) — only issues where assignee OR watcher = `557058:0b20c326-8d11-41ef-8e7d-6651e435f006` (Uri Danan's account ID)
- JQL queries use `issuetype != Epic` to exclude Epics at the query level
- Fields needed: key, summary, status, issuetype, priority, assignee, issuelinks
- Issue links should only include links where the linked issue key starts with GGS, CLPLG, or SST2 (ignore links to other projects like TAC)
- SST2 results may contain duplicates (same issue matched as both assignee and watcher) — deduplicate by key

**Slack**
- Six channels monitored:
  - `C08FDAPECKE` — #glow-server (usually active)
  - `C0972DJ5BMY` — #glow-runway (usually quiet)
  - `C08HU8AR3T8` — #glow-game-server-devlopers (usually active)
  - `C09S3QH0ZQA` — #glow-social (usually active)
  - `C08GZ7W5BV4` — #glow-client-server (usually quiet)
  - `C09GVKW6HH6` — #glow-runway-client-server (usually quiet)
- Read last 72h of messages from each channel
- Extract and classify into unified items with: channel, severity (critical/high/medium/info), title, description, reporter, JIRA key if mentioned, action owner, action item, done status, resolution

**Known data quality issues (learned the hard way)**
- Atlassian MCP's `issuelinks` expansion via bulk JQL can return stale/phantom links that no longer exist. The `getJiraIssue` call on individual issues is the reliable verification method. Consider a verification pass for cross-project links.
- SST2 deduplication is required — the assignee/watcher JQL pattern returns duplicates.
- Epic exclusion must happen both in JQL (`issuetype != Epic`) and in post-processing (double-check).

---

### Features

#### 1. Issue List (main view)

Display all issues from all three projects in a single sortable, filterable list.

Each issue card shows:
- Priority emoji (🔴 Blocker, 🟠 Critical, 🟡 Major, 🟢 Medium, 🔵 Minor, ⚪ Trivial)
- Issue key as clickable link to JIRA (e.g., `GGS-173`)
- Project badge — color-coded: Server (teal), Plugin (purple), Game (pink)
- Summary text
- Status badge — color-coded by status group
- Second line: assignee, issue type, linked issues (with their current status shown), counterpart buttons

**Status grouping:**
- BLOCKED: `BLOCKED`
- IN DEV: `in DEV`, `In Progress`, `In progress`, `Code Review`, `Ready For Review`
- IN QA: `In QA`, `Pending QA`
- TODO: `To Do`, `TO DO`, `BACKLOG`, `Ready For Dev`
- DONE: `Done`, `pending deployment`

Default sort order: BLOCKED → IN DEV → IN QA → TODO → DONE

#### 2. Summary Cards (header)

Five clickable cards showing count per status group (BLOCKED, IN DEV, IN QA, TODO, DONE). Clicking a card toggles filtering by that status group. Multiple can be selected.

#### 3. Filters

- **Project dropdown** (single-select): All Projects / Server (GGS) / Plugin (CLPLG) / Game (SST2)
- **Feature area dropdown** (multi-select): Detected from issue summaries by keyword matching — Runway, Matchmaking, Bot, Friend, Gift, Auth, Score, Dashboard, Notification, Push, Profile, Coupon, Other
- **Status chips**: Show active status group filters as dismissible chips
- **Search**: Free text search across key, summary, and assignee

#### 4. Cross-Project Links

Each issue card displays its JIRA links as clickable badges showing the linked issue's key, link type, and current status.

**Link suggestions**: For unlinked issues, use keyword overlap (≥2 shared meaningful words between summaries) to suggest possible links. Show these in a collapsible amber section with "Link in JIRA" (calls Atlassian MCP to create the link) and "Dismiss" buttons. Successfully linked suggestions are auto-removed.

**Counterpart buttons**: Inline `+ Server`, `+ Plugin` buttons on cards where a counterpart issue is expected but doesn't exist. Rules:
- SST2 cards → show `+ Server` and/or `+ Plugin` buttons (unless already linked to those projects)
- CLPLG cards → show `+ Server` button (unless already linked to GGS)
- GGS cards → show `+ Plugin` button (unless already linked to CLPLG)
- No card ever shows `+ Game` — game issues come from product, not mirrored from server/plugin

Clicking a counterpart button opens a modal to create the issue in the target project and auto-link it.

#### 5. Slack Intelligence

A single unified list below the issue list. Each item shows:
- Done/open indicator (green checkmark if done, colored severity dot if open)
- Title + Done/Open badge
- Description
- Metadata: channel, reporter, JIRA link if any
- For open items: `→ Owner: action item` in blue
- For done items: `✓ resolution` in green
- Severity badge (critical/high/medium/info)
- Done items are visually faded

Active channels shown as green badges, quiet channel count shown.

#### 6. Refresh

A refresh button in the header that fetches fresh data from both JIRA and Slack.

**Critical requirements:**
- The refresh timestamp must only update after data is successfully retrieved and parsed. If the fetch fails or parsing fails, show an error and keep the old timestamp.
- On initial page load, no timestamp should be shown (null until first successful refresh).
- The JIRA and Slack fetches should run in parallel (`Promise.all`) for speed.
- Fetching uses the Anthropic API with MCP servers:
  - Atlassian: `https://mcp.atlassian.com/v1/mcp`
  - Slack: `https://mcp.slack.com/mcp`
- The two fetches must be separate API calls (not combined into one prompt — that reliably fails to parse). Running them via `Promise.all` means the user only sees one connector approval prompt rather than two sequential ones.

#### 7. JIRA Actions

- **Confirm link suggestion**: Creates a "Relates" link between two issues via Atlassian MCP
- **Create counterpart issue**: Creates a new Task in the target project, pre-filled with source issue details, then links it to the source issue

---

### Persistence

This is the main improvement over the prototype. The current version loses all data on page refresh and requires a manual refresh every time.

**What to persist:**
- Last fetched JIRA data (all three projects)
- Last fetched Slack data (channels + items)
- Refresh timestamp
- Dismissed link suggestions
- Applied link results
- Filter state (nice to have)

**Storage options to consider:**
- Local file-based storage (SQLite, JSON files) if running as a local tool
- Or a lightweight cloud store if meant to be shared

The goal is: open the dashboard → see the last known state immediately → click Refresh to update.

---

### Tech Stack Recommendations

The prototype uses React (JSX) with inline Tailwind classes and calls the Anthropic API directly from the browser. For a Claude Code rebuild, consider:

- **Backend**: Node.js/Express or similar — handles JIRA and Slack fetching server-side (solves the MCP auth problem since the server can hold credentials)
- **Frontend**: React (keep the existing UI design — it works well)
- **Database**: SQLite for local persistence, or PostgreSQL if shared
- **Auth**: The Anthropic API key and MCP connector tokens should be server-side, not exposed in browser JS

This architecture solves the main pain point: the artifact-based version only works inside a Claude chat window because MCP auth is scoped to the chat session. A server-side fetcher with stored credentials works anywhere.

---

### Visual Design

Keep the current design. It's clean and functional:
- Light background (`#f8f9fb`)
- Gradient header with purple accent (`#7c3aed`)
- Color-coded project badges (teal/purple/pink)
- Color-coded status badges with dots
- JetBrains Mono for issue keys and code
- DM Sans for body text
- Cards with hover states, left border accent for cross-linked issues

---

### What NOT to Build

- No user authentication system (single-user tool)
- No real-time websocket updates (polling/manual refresh is fine)
- No issue editing beyond creating links and counterpart issues
- No full JIRA board replication — this is a cross-project overview, not a replacement for JIRA boards

---

### Reference

The current working prototype is `dashboard.jsx` in this project. It contains:
- The complete data model (status mappings, priority icons, project colors, status groups)
- The full UI layout and component structure
- The JQL queries and Slack channel configuration
- The refresh logic (Anthropic API + MCP)
- The link suggestion algorithm (keyword overlap)
- The counterpart rules (which projects need counterparts in which other projects)

Use it as the source of truth for behavior and design. The rebuild should produce the same user experience but with a proper backend and persistence layer.
