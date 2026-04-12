# Glow Fashion Idol Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web dashboard that fetches JIRA + Slack data server-side, persists it in SQLite, and renders a cross-project issue view matching the `dashboard.jsx` prototype design.

**Architecture:** TypeScript monorepo — `backend/` (Express, port 3001) + `frontend/` (React/Vite, port 5173). Backend calls Atlassian REST API, Slack Web API, and Anthropic API directly; frontend only calls the backend. SQLite in `data/glow.db` persists snapshots, dismissed suggestions, and link results.

**Tech Stack:** Node.js 18+, TypeScript 5, Express 4, better-sqlite3, @slack/web-api, @anthropic-ai/sdk, Vitest, React 18, Vite 5, Tailwind CSS 3, @tanstack/react-query v5, Zustand v5, concurrently

**Spec:** `docs/superpowers/specs/2026-03-22-glow-dashboard-design.md`

---

## File Map

```
glow-status/
├── .env.example
├── .gitignore
├── package.json                        # root: concurrently dev script
├── data/                               # gitignored — SQLite lives here
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts                    # Express app + server start
│       ├── types.ts                    # JiraIssue, SlackItem, Snapshot, etc.
│       ├── services/
│       │   ├── db.service.ts           # SQLite CRUD (better-sqlite3, sync)
│       │   ├── jira.service.ts         # 3 JQL queries → JiraIssue[]
│       │   ├── slack.service.ts        # 6 channels → SlackMessage[]
│       │   └── ai.service.ts           # Slack messages → SlackItem[] via Claude
│       ├── routes/
│       │   ├── data.ts                 # GET /api/data
│       │   ├── refresh.ts              # POST /api/refresh
│       │   ├── links.ts                # POST /api/links
│       │   ├── issues.ts               # POST /api/issues
│       │   └── dismissed.ts            # POST + DELETE /api/dismissed/:id
│       └── tests/
│           ├── db.service.test.ts
│           ├── jira.service.test.ts
│           ├── slack.service.test.ts
│           └── ai.service.test.ts
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                  # proxy /api → localhost:3001
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx                    # React root + QueryClientProvider
        ├── App.tsx                     # Layout: Header, SummaryCards, Filters,
        │                               #   LinkSuggestions, IssueList, SlackSection
        ├── types.ts                    # mirrors backend types (copy-paste safe)
        ├── utils/
        │   ├── issue-utils.ts          # getStatusGroup, getPriorityEmoji,
        │   │                           #   getFeatureArea, getStatusStyle,
        │   │                           #   getProjectStyle, getMissingCounterparts,
        │   │                           #   generateLinkSuggestions
        │   └── issue-utils.test.ts
        ├── components/
        │   ├── Header.tsx
        │   ├── SummaryCards.tsx
        │   ├── Filters.tsx
        │   ├── IssueList.tsx
        │   ├── IssueCard.tsx
        │   ├── LinkSuggestions.tsx
        │   ├── SlackSection.tsx
        │   └── CreateIssueModal.tsx
        ├── hooks/
        │   ├── useData.ts
        │   └── useRefresh.ts
        └── store/
            └── filters.ts
```

---

## Task 1: Root + Backend Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "glow-status",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "build": "npm run build --prefix backend && npm run build --prefix frontend"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
data/
.superpowers/
```

- [ ] **Step 3: Create .env.example**

```
JIRA_BASE_URL=https://tabtale.atlassian.net
JIRA_USER_EMAIL=
JIRA_API_TOKEN=
ATLASSIAN_CLOUD_ID=e12af754-9c9b-433f-9c88-41117d73202d
SLACK_BOT_TOKEN=
ANTHROPIC_API_KEY=
PORT=3001
```

- [ ] **Step 4: Create backend/package.json**

```json
{
  "name": "glow-status-backend",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@slack/web-api": "^7.0.0",
    "better-sqlite3": "^9.4.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 5: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Create backend/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node' }
});
```

- [ ] **Step 7: Install root + backend dependencies**

```bash
npm install
cd backend && npm install
cd ..
```

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore .env.example backend/package.json backend/tsconfig.json backend/vitest.config.ts
git commit -m "chore: backend scaffolding"
```

---

## Task 2: Backend Types

**Files:**
- Create: `backend/src/types.ts`

- [ ] **Step 1: Write types**

```ts
// backend/src/types.ts

export interface JiraIssueLink {
  type: string;   // "relates to", "blocks", "action item from", etc.
  key: string;    // "GGS-173"
}

export interface JiraIssue {
  key: string;
  type: string;
  status: string;
  priority: string;
  assignee: string;
  summary: string;
  links: JiraIssueLink[];
}

export interface JiraData {
  GGS: JiraIssue[];
  CLPLG: JiraIssue[];
  SST2: JiraIssue[];
}

export interface SlackChannel {
  id: string;
  name: string;
  active: boolean;
}

export interface SlackItem {
  ch: string;       // channel name
  sev: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  desc: string;
  who: string | null;
  jira: string | null;
  owner: string | null;
  action: string | null;
  done: boolean;
  resolution: string | null;
}

export interface SlackData {
  channels: SlackChannel[];
  items: SlackItem[];
}

export interface Snapshot {
  jiraData: JiraData;
  slackData: SlackData;
  refreshedAt: string | null;
}

export interface ApiDataResponse {
  snapshot: Snapshot;
  dismissedSuggestions: string[];
  linkResults: Record<string, 'ok' | 'err'>;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/types.ts
git commit -m "feat: backend types"
```

---

## Task 3: Database Service

**Files:**
- Create: `backend/src/services/db.service.ts`
- Create: `backend/src/tests/db.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend/src/tests/db.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDbService } from '../services/db.service';

function makeDb() {
  const db = new Database(':memory:');
  return createDbService(db);
}

describe('db.service', () => {
  it('returns null snapshot when empty', () => {
    const svc = makeDb();
    expect(svc.getSnapshot()).toBeNull();
  });

  it('saves and retrieves snapshot', () => {
    const svc = makeDb();
    const jiraData = { GGS: [], CLPLG: [], SST2: [] };
    const slackData = { channels: [], items: [] };
    svc.saveSnapshot(jiraData, slackData);
    const snap = svc.getSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.jiraData.GGS).toEqual([]);
    expect(snap!.refreshedAt).toBeTruthy();
  });

  it('overwrites existing snapshot', () => {
    const svc = makeDb();
    svc.saveSnapshot({ GGS: [], CLPLG: [], SST2: [] }, { channels: [], items: [] });
    const issue = { key: 'GGS-1', type: 'Bug', status: 'In Progress', priority: 'Major', assignee: 'Alice', summary: 'Test', links: [] };
    svc.saveSnapshot({ GGS: [issue], CLPLG: [], SST2: [] }, { channels: [], items: [] });
    expect(svc.getSnapshot()!.jiraData.GGS).toHaveLength(1);
  });

  it('saves and retrieves dismissed suggestions', () => {
    const svc = makeDb();
    svc.addDismissed('GGS-1-CLPLG-2');
    expect(svc.getDismissed()).toContain('GGS-1-CLPLG-2');
  });

  it('removes dismissed suggestion', () => {
    const svc = makeDb();
    svc.addDismissed('GGS-1-CLPLG-2');
    svc.removeDismissed('GGS-1-CLPLG-2');
    expect(svc.getDismissed()).not.toContain('GGS-1-CLPLG-2');
  });

  it('saves and retrieves link results', () => {
    const svc = makeDb();
    svc.setLinkResult('GGS-1-CLPLG-2', 'ok');
    expect(svc.getLinkResults()['GGS-1-CLPLG-2']).toBe('ok');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend && npx vitest run src/tests/db.service.test.ts
```

Expected: FAIL — `createDbService` not found.

- [ ] **Step 3: Implement db.service.ts**

```ts
// backend/src/services/db.service.ts
import Database from 'better-sqlite3';
import type { JiraData, SlackData, Snapshot } from '../types';

export function createDbService(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY DEFAULT 1,
      jira_data TEXT NOT NULL,
      slack_data TEXT NOT NULL,
      refreshed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dismissed_suggestions (
      pair_key TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS link_results (
      pair_key TEXT PRIMARY KEY,
      status TEXT NOT NULL
    );
  `);

  return {
    getSnapshot(): Snapshot | null {
      const row = db.prepare('SELECT * FROM snapshots WHERE id = 1').get() as any;
      if (!row) return null;
      return {
        jiraData: JSON.parse(row.jira_data),
        slackData: JSON.parse(row.slack_data),
        refreshedAt: row.refreshed_at,
      };
    },

    saveSnapshot(jiraData: JiraData, slackData: SlackData): void {
      db.prepare(`
        INSERT OR REPLACE INTO snapshots (id, jira_data, slack_data, refreshed_at)
        VALUES (1, ?, ?, ?)
      `).run(JSON.stringify(jiraData), JSON.stringify(slackData), new Date().toISOString());
    },

    getDismissed(): string[] {
      return (db.prepare('SELECT pair_key FROM dismissed_suggestions').all() as any[])
        .map(r => r.pair_key);
    },

    addDismissed(pairKey: string): void {
      db.prepare('INSERT OR IGNORE INTO dismissed_suggestions (pair_key) VALUES (?)').run(pairKey);
    },

    removeDismissed(pairKey: string): void {
      db.prepare('DELETE FROM dismissed_suggestions WHERE pair_key = ?').run(pairKey);
    },

    getLinkResults(): Record<string, 'ok' | 'err'> {
      const rows = db.prepare('SELECT pair_key, status FROM link_results').all() as any[];
      return Object.fromEntries(rows.map(r => [r.pair_key, r.status]));
    },

    setLinkResult(pairKey: string, status: 'ok' | 'err'): void {
      db.prepare('INSERT OR REPLACE INTO link_results (pair_key, status) VALUES (?, ?)').run(pairKey, status);
    },
  };
}

export type DbService = ReturnType<typeof createDbService>;
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend && npx vitest run src/tests/db.service.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/db.service.ts backend/src/tests/db.service.test.ts
git commit -m "feat: database service with SQLite"
```

---

## Task 4: JIRA Service

**Files:**
- Create: `backend/src/services/jira.service.ts`
- Create: `backend/src/tests/jira.service.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// backend/src/tests/jira.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllJiraIssues, transformIssue, deduplicateByKey } from '../services/jira.service';

describe('transformIssue', () => {
  it('maps fields to JiraIssue shape', () => {
    const raw = {
      key: 'GGS-1',
      fields: {
        summary: 'Test issue',
        status: { name: 'In Progress' },
        issuetype: { name: 'Story' },
        priority: { name: 'Major' },
        assignee: { displayName: 'Alice' },
        issuelinks: [],
      },
    };
    const result = transformIssue(raw);
    expect(result.key).toBe('GGS-1');
    expect(result.status).toBe('In Progress');
    expect(result.assignee).toBe('Alice');
    expect(result.type).toBe('Story');
  });

  it('uses "Unassigned" when assignee is null', () => {
    const raw = {
      key: 'GGS-2',
      fields: {
        summary: 'x', status: { name: 'To Do' },
        issuetype: { name: 'Bug' }, priority: { name: 'Minor' },
        assignee: null, issuelinks: [],
      },
    };
    expect(transformIssue(raw).assignee).toBe('Unassigned');
  });

  it('filters issue links to only GGS/CLPLG/SST2 keys', () => {
    const raw = {
      key: 'GGS-3',
      fields: {
        summary: 'x', status: { name: 'To Do' },
        issuetype: { name: 'Bug' }, priority: { name: 'Minor' },
        assignee: null,
        issuelinks: [
          { type: { outward: 'relates to' }, outwardIssue: { key: 'CLPLG-5' } },
          { type: { outward: 'relates to' }, outwardIssue: { key: 'TAC-99' } },
          { type: { inward: 'is blocked by' }, inwardIssue: { key: 'SST2-10' } },
        ],
      },
    };
    const links = transformIssue(raw).links;
    expect(links).toHaveLength(2);
    expect(links.map(l => l.key)).toContain('CLPLG-5');
    expect(links.map(l => l.key)).toContain('SST2-10');
    expect(links.map(l => l.key)).not.toContain('TAC-99');
  });

  it('excludes Epic issue type', () => {
    const raw = {
      key: 'GGS-4',
      fields: {
        summary: 'An epic', status: { name: 'In Progress' },
        issuetype: { name: 'Epic' }, priority: { name: 'Major' },
        assignee: null, issuelinks: [],
      },
    };
    expect(transformIssue(raw)).toBeNull();
  });
});

describe('deduplicateByKey', () => {
  it('removes duplicate issues by key', () => {
    const issues = [
      { key: 'SST2-1', type: 'Bug', status: 'In Progress', priority: 'Major', assignee: 'A', summary: 'x', links: [] },
      { key: 'SST2-1', type: 'Bug', status: 'In Progress', priority: 'Major', assignee: 'A', summary: 'x', links: [] },
      { key: 'SST2-2', type: 'Bug', status: 'To Do', priority: 'Minor', assignee: 'B', summary: 'y', links: [] },
    ];
    expect(deduplicateByKey(issues)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend && npx vitest run src/tests/jira.service.test.ts
```

- [ ] **Step 3: Implement jira.service.ts**

```ts
// backend/src/services/jira.service.ts
import type { JiraData, JiraIssue, JiraIssueLink } from '../types';

const TRACKED_PROJECTS = ['GGS', 'CLPLG', 'SST2'];
const SST2_ACCOUNT_ID = '557058:0b20c326-8d11-41ef-8e7d-6651e435f006';

const DONE_CLAUSE = "(status != Done OR (status = Done AND resolved >= -7d))";

const QUERIES: Record<string, string> = {
  GGS: `project = GGS AND issuetype != Epic AND ${DONE_CLAUSE} ORDER BY status ASC, updated DESC`,
  CLPLG: `project = CLPLG AND issuetype != Epic AND ${DONE_CLAUSE} ORDER BY status ASC, updated DESC`,
  SST2: `project = SST2 AND issuetype != Epic AND (assignee = ${SST2_ACCOUNT_ID} OR watcher = ${SST2_ACCOUNT_ID}) AND ${DONE_CLAUSE} ORDER BY status ASC, updated DESC`,
};

export function transformIssue(raw: any): JiraIssue | null {
  const { key, fields } = raw;
  if (fields.issuetype?.name === 'Epic') return null;

  const links: JiraIssueLink[] = [];
  for (const link of (fields.issuelinks ?? [])) {
    if (link.outwardIssue) {
      const linkedKey: string = link.outwardIssue.key;
      if (TRACKED_PROJECTS.includes(linkedKey.split('-')[0])) {
        links.push({ type: link.type.outward, key: linkedKey });
      }
    }
    if (link.inwardIssue) {
      const linkedKey: string = link.inwardIssue.key;
      if (TRACKED_PROJECTS.includes(linkedKey.split('-')[0])) {
        links.push({ type: link.type.inward, key: linkedKey });
      }
    }
  }

  return {
    key,
    type: fields.issuetype?.name ?? 'Unknown',
    status: fields.status?.name ?? 'Unknown',
    priority: fields.priority?.name ?? 'Unknown',
    assignee: fields.assignee?.displayName ?? 'Unassigned',
    summary: fields.summary ?? '',
    links,
  };
}

export function deduplicateByKey(issues: JiraIssue[]): JiraIssue[] {
  const seen = new Set<string>();
  return issues.filter(i => {
    if (seen.has(i.key)) return false;
    seen.add(i.key);
    return true;
  });
}

async function searchJira(
  baseUrl: string, email: string, token: string, jql: string
): Promise<JiraIssue[]> {
  const fields = 'summary,status,issuetype,priority,assignee,issuelinks';
  const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`;
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`JIRA search failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { issues: any[] };
  return data.issues.map(transformIssue).filter((i): i is JiraIssue => i !== null);
}

export async function fetchAllJiraIssues(
  baseUrl: string, email: string, token: string
): Promise<JiraData> {
  const [ggs, clplg, sst2Raw] = await Promise.all([
    searchJira(baseUrl, email, token, QUERIES.GGS),
    searchJira(baseUrl, email, token, QUERIES.CLPLG),
    searchJira(baseUrl, email, token, QUERIES.SST2),
  ]);
  return { GGS: ggs, CLPLG: clplg, SST2: deduplicateByKey(sst2Raw) };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend && npx vitest run src/tests/jira.service.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/jira.service.ts backend/src/tests/jira.service.test.ts
git commit -m "feat: JIRA service with transform, dedup, link filtering"
```

---

## Task 5: Slack Service

**Files:**
- Create: `backend/src/services/slack.service.ts`
- Create: `backend/src/tests/slack.service.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// backend/src/tests/slack.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchSlackMessages, CHANNELS } from '../services/slack.service';

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => ({
    conversations: {
      history: vi.fn().mockResolvedValue({
        ok: true,
        messages: [
          { type: 'message', user: 'U123', text: 'Hello team', ts: '1700000000.000000' },
        ],
        has_more: false,
      }),
    },
    users: {
      info: vi.fn().mockResolvedValue({
        ok: true,
        user: { real_name: 'Alice Smith' },
      }),
    },
  })),
}));

describe('CHANNELS', () => {
  it('defines exactly 6 channels', () => {
    expect(CHANNELS).toHaveLength(6);
  });
  it('includes known channel IDs', () => {
    const ids = CHANNELS.map(c => c.id);
    expect(ids).toContain('C08FDAPECKE');
    expect(ids).toContain('C09GVKW6HH6');
  });
});

describe('fetchSlackMessages', () => {
  it('returns messages for all channels', async () => {
    const result = await fetchSlackMessages('xoxb-test-token');
    expect(result).toHaveLength(6);
    result.forEach(ch => {
      expect(ch.channelId).toBeTruthy();
      expect(ch.channelName).toBeTruthy();
      expect(Array.isArray(ch.messages)).toBe(true);
    });
  });

  it('resolves user IDs to names', async () => {
    const result = await fetchSlackMessages('xoxb-test-token');
    expect(result[0].messages[0].userName).toBe('Alice Smith');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd backend && npx vitest run src/tests/slack.service.test.ts
```

- [ ] **Step 3: Implement slack.service.ts**

```ts
// backend/src/services/slack.service.ts
import { WebClient } from '@slack/web-api';

export const CHANNELS = [
  { id: 'C08FDAPECKE', name: 'glow-server' },
  { id: 'C0972DJ5BMY', name: 'glow-runway' },
  { id: 'C08HU8AR3T8', name: 'glow-game-server-devlopers' },
  { id: 'C09S3QH0ZQA', name: 'glow-social' },
  { id: 'C08GZ7W5BV4', name: 'glow-client-server' },
  { id: 'C09GVKW6HH6', name: 'glow-runway-client-server' },
];

export interface SlackMessage {
  userId: string;
  userName: string;
  text: string;
  ts: string;
}

export interface ChannelMessages {
  channelId: string;
  channelName: string;
  messages: SlackMessage[];
  active: boolean;
}

export async function fetchSlackMessages(token: string): Promise<ChannelMessages[]> {
  const client = new WebClient(token);
  const oldest = String(Math.floor(Date.now() / 1000) - 86400);
  const userCache = new Map<string, string>();

  async function resolveUser(userId: string): Promise<string> {
    if (userCache.has(userId)) return userCache.get(userId)!;
    try {
      const info = await client.users.info({ user: userId });
      const name = (info.user as any)?.real_name ?? userId;
      userCache.set(userId, name);
      return name;
    } catch {
      return userId;
    }
  }

  async function fetchChannel(ch: { id: string; name: string }): Promise<ChannelMessages> {
    const messages: SlackMessage[] = [];
    try {
      let cursor: string | undefined;
      do {
        const resp = await client.conversations.history({
          channel: ch.id, oldest, limit: 100, cursor,
        });
        const msgs = (resp.messages ?? []) as any[];
        for (const m of msgs) {
          if (m.type === 'message' && m.text) {
            const userName = m.user ? await resolveUser(m.user) : 'Unknown';
            messages.push({ userId: m.user ?? '', userName, text: m.text, ts: m.ts ?? '' });
          }
        }
        cursor = resp.response_metadata?.next_cursor ?? undefined;
        if (!resp.has_more) break;
      } while (cursor);
    } catch {
      // channel unreadable — return empty
    }
    return { channelId: ch.id, channelName: ch.name, messages, active: messages.length > 0 };
  }

  return Promise.all(CHANNELS.map(fetchChannel));
}
```

- [ ] **Step 4: Run — expect pass**

```bash
cd backend && npx vitest run src/tests/slack.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/slack.service.ts backend/src/tests/slack.service.test.ts
git commit -m "feat: Slack service fetches 6 channels with user resolution"
```

---

## Task 6: AI Service

**Files:**
- Create: `backend/src/services/ai.service.ts`
- Create: `backend/src/tests/ai.service.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// backend/src/tests/ai.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { classifySlackMessages, buildSlackPrompt } from '../services/ai.service';
import type { ChannelMessages } from '../services/slack.service';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          channels: [{ id: 'C08FDAPECKE', name: 'glow-server', active: true }],
          items: [{
            ch: 'glow-server', sev: 'high', title: 'Bot crash', desc: 'Bot fails to submit',
            who: 'Alice', jira: 'GGS-192', owner: 'Bob', action: 'Fix bot', done: false, resolution: null
          }]
        }) }],
      }),
    },
  })),
}));

const sampleChannels: ChannelMessages[] = [
  {
    channelId: 'C08FDAPECKE', channelName: 'glow-server', active: true,
    messages: [{ userId: 'U1', userName: 'Alice', text: 'Bot crash GGS-192', ts: '1700000000.0' }],
  },
];

describe('buildSlackPrompt', () => {
  it('includes channel name and message text', () => {
    const prompt = buildSlackPrompt(sampleChannels);
    expect(prompt).toContain('glow-server');
    expect(prompt).toContain('Bot crash GGS-192');
  });
});

describe('classifySlackMessages', () => {
  it('returns SlackData with channels and items', async () => {
    const result = await classifySlackMessages(sampleChannels, 'sk-ant-test');
    expect(result.channels).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sev).toBe('high');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd backend && npx vitest run src/tests/ai.service.test.ts
```

- [ ] **Step 3: Implement ai.service.ts**

```ts
// backend/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';
import type { ChannelMessages } from './slack.service';
import type { SlackData } from '../types';

export function buildSlackPrompt(channels: ChannelMessages[]): string {
  const channelBlocks = channels.map(ch => {
    if (ch.messages.length === 0) return `## ${ch.channelName}\n(no messages in last 24h)`;
    const msgs = ch.messages
      .map(m => `[${m.userName}]: ${m.text}`)
      .join('\n');
    return `## ${ch.channelName}\n${msgs}`;
  }).join('\n\n');

  return `You are analyzing Slack messages from a game server engineering team.
Read the last 24h of messages from these channels and extract actionable items.

${channelBlocks}

Output a single JSON object (no markdown fences, no explanation) with this exact structure:
{
  "channels": [{ "id": "CHANNEL_ID", "name": "channel-name", "active": true/false }],
  "items": [{
    "ch": "channel-name",
    "sev": "critical|high|medium|info",
    "title": "short title (max 60 chars)",
    "desc": "1-2 sentence description",
    "who": "person who reported it or null",
    "jira": "KEY-123 or null",
    "owner": "person responsible for action or null",
    "action": "concrete action item or null",
    "done": true/false,
    "resolution": "how it was resolved or null"
  }]
}

Rules:
- severity: critical=outage/blocker, high=bug/regression, medium=task/investigation, info=deployment/update
- done:true + resolution if messages show it was fixed/deployed/resolved
- owner+action null for purely informational items
- Deduplicate: one item per distinct topic
- Output ONLY valid JSON.`;
}

export async function classifySlackMessages(
  channels: ChannelMessages[], apiKey: string
): Promise<SlackData> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildSlackPrompt(channels) }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';
  const parsed = JSON.parse(text) as SlackData;

  // Merge active status from actual channel data
  const activeMap = new Map(channels.map(c => [c.channelName, c.active]));
  parsed.channels = parsed.channels.map(ch => ({
    ...ch,
    active: activeMap.get(ch.name) ?? ch.active,
  }));

  return parsed;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
cd backend && npx vitest run src/tests/ai.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ai.service.ts backend/src/tests/ai.service.test.ts
git commit -m "feat: AI service classifies Slack messages via Claude"
```

---

## Task 7: Express App + Routes

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/routes/data.ts`
- Create: `backend/src/routes/refresh.ts`
- Create: `backend/src/routes/links.ts`
- Create: `backend/src/routes/issues.ts`
- Create: `backend/src/routes/dismissed.ts`

- [ ] **Step 1: Create backend/src/index.ts**

```ts
// backend/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { createDbService } from './services/db.service';
import { makeDataRouter } from './routes/data';
import { makeRefreshRouter } from './routes/refresh';
import { makeLinksRouter } from './routes/links';
import { makeIssuesRouter } from './routes/issues';
import { makeDismissedRouter } from './routes/dismissed';

const app = express();
app.use(cors());
app.use(express.json());

// Ensure data dir exists
const dataDir = path.join(process.cwd(), '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'glow.db'));
const dbService = createDbService(db);

app.use('/api', makeDataRouter(dbService));
app.use('/api', makeRefreshRouter(dbService));
app.use('/api', makeLinksRouter(dbService));
app.use('/api', makeIssuesRouter());
app.use('/api', makeDismissedRouter(dbService));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
```

- [ ] **Step 2: Create backend/src/routes/data.ts**

```ts
// backend/src/routes/data.ts
import { Router } from 'express';
import type { DbService } from '../services/db.service';
import type { ApiDataResponse } from '../types';

export function makeDataRouter(db: DbService) {
  const router = Router();

  router.get('/data', (_req, res) => {
    const snapshot = db.getSnapshot();
    const response: ApiDataResponse = {
      snapshot: snapshot ?? {
        jiraData: { GGS: [], CLPLG: [], SST2: [] },
        slackData: { channels: [], items: [] },
        refreshedAt: null,
      },
      dismissedSuggestions: db.getDismissed(),
      linkResults: db.getLinkResults(),
    };
    res.json(response);
  });

  return router;
}
```

- [ ] **Step 3: Create backend/src/routes/refresh.ts**

```ts
// backend/src/routes/refresh.ts
import { Router } from 'express';
import type { DbService } from '../services/db.service';
import { fetchAllJiraIssues } from '../services/jira.service';
import { fetchSlackMessages } from '../services/slack.service';
import { classifySlackMessages } from '../services/ai.service';
import type { ApiDataResponse } from '../types';

export function makeRefreshRouter(db: DbService) {
  const router = Router();

  router.post('/refresh', async (_req, res) => {
    const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, SLACK_BOT_TOKEN, ANTHROPIC_API_KEY } = process.env;
    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN || !SLACK_BOT_TOKEN || !ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Missing required environment variables' });
    }

    try {
      const [jiraData, channelMessages] = await Promise.all([
        fetchAllJiraIssues(JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN),
        fetchSlackMessages(SLACK_BOT_TOKEN),
      ]);

      const slackData = await classifySlackMessages(channelMessages, ANTHROPIC_API_KEY);
      db.saveSnapshot(jiraData, slackData);

      const response: ApiDataResponse = {
        snapshot: { jiraData, slackData, refreshedAt: new Date().toISOString() },
        dismissedSuggestions: db.getDismissed(),
        linkResults: db.getLinkResults(),
      };
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? 'Refresh failed' });
    }
  });

  return router;
}
```

- [ ] **Step 4: Create backend/src/routes/links.ts**

```ts
// backend/src/routes/links.ts
import { Router } from 'express';
import type { DbService } from '../services/db.service';

export function makeLinksRouter(db: DbService) {
  const router = Router();

  router.post('/links', async (req, res) => {
    const { fromKey, toKey } = req.body as { fromKey: string; toKey: string };
    const pairKey = `${fromKey}-${toKey}`;
    const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
      return res.status(500).json({ error: 'Missing JIRA env vars' });
    }

    const auth = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = `${JIRA_BASE_URL}/rest/api/3/issueLink`;
    const body = {
      type: { name: 'Relates' },
      inwardIssue: { key: fromKey },
      outwardIssue: { key: toKey },
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      db.setLinkResult(pairKey, 'err');
      return res.status(r.status).json({ error: await r.text() });
    }
    db.setLinkResult(pairKey, 'ok');
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 5: Create backend/src/routes/issues.ts**

```ts
// backend/src/routes/issues.ts
import { Router } from 'express';

export function makeIssuesRouter() {
  const router = Router();

  // POST /api/issues — create a counterpart issue and link it to the source
  router.post('/issues', async (req, res) => {
    const { sourceKey, targetProject, summary } = req.body as {
      sourceKey: string; targetProject: string; summary: string;
    };
    const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
      return res.status(500).json({ error: 'Missing JIRA env vars' });
    }

    const auth = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' };

    // Create issue
    const createRes = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          project: { key: targetProject },
          summary,
          issuetype: { name: 'Task' },
        },
      }),
    });
    if (!createRes.ok) return res.status(createRes.status).json({ error: await createRes.text() });
    const created = await createRes.json() as { key: string };

    // Link to source
    await fetch(`${JIRA_BASE_URL}/rest/api/3/issueLink`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: { name: 'Relates' },
        inwardIssue: { key: sourceKey },
        outwardIssue: { key: created.key },
      }),
    });

    res.json({ key: created.key });
  });

  return router;
}
```

- [ ] **Step 6: Create backend/src/routes/dismissed.ts**

```ts
// backend/src/routes/dismissed.ts
import { Router } from 'express';
import type { DbService } from '../services/db.service';

export function makeDismissedRouter(db: DbService) {
  const router = Router();

  router.post('/dismissed', (req, res) => {
    const { pairKey } = req.body as { pairKey: string };
    db.addDismissed(pairKey);
    res.json({ ok: true });
  });

  router.delete('/dismissed/:id', (req, res) => {
    db.removeDismissed(req.params.id);
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 7: Smoke-test the backend starts**

```bash
cd backend && cp ../.env.example ../.env
# Fill in credentials in .env, then:
npm run dev
```

Expected: `Backend listening on http://localhost:3001`
`curl http://localhost:3001/api/data` should return `{"snapshot":{"jiraData":{"GGS":[],...},"refreshedAt":null},...}`

- [ ] **Step 8: Commit**

```bash
git add backend/src/index.ts backend/src/routes/
git commit -m "feat: Express app with all API routes"
```

---

## Task 8: Frontend Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx` (skeleton)

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "glow-status-frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.1.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create frontend/vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
```

- [ ] **Step 4: Create frontend/tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 5: Create frontend/postcss.config.js**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Glow Fashion Idol Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create frontend/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 8: Create frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'DM Sans', sans-serif;
  background-color: #f8f9fb;
  margin: 0;
}

.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
```

- [ ] **Step 9: Create frontend/src/App.tsx (skeleton)**

```tsx
export default function App() {
  return <div className="min-h-screen" style={{ background: '#f8f9fb' }}>
    <p className="p-4 text-gray-500">Loading...</p>
  </div>;
}
```

- [ ] **Step 10: Install frontend dependencies**

```bash
cd frontend && npm install
```

- [ ] **Step 11: Verify dev server starts**

```bash
cd frontend && npm run dev
```

Expected: Vite starts on http://localhost:5173, page shows "Loading..."

- [ ] **Step 12: Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffolding with Vite + React + Tailwind"
```

---

## Task 9: Frontend Types + Issue Utilities

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/utils/issue-utils.ts`
- Create: `frontend/src/utils/issue-utils.test.ts`

- [ ] **Step 1: Create frontend/src/types.ts**

Mirror the backend types exactly:

```ts
// frontend/src/types.ts
export interface JiraIssueLink { type: string; key: string; }
export interface JiraIssue {
  key: string; type: string; status: string; priority: string;
  assignee: string; summary: string; links: JiraIssueLink[];
}
export interface JiraData { GGS: JiraIssue[]; CLPLG: JiraIssue[]; SST2: JiraIssue[]; }
export interface SlackChannel { id: string; name: string; active: boolean; }
export interface SlackItem {
  ch: string; sev: 'critical' | 'high' | 'medium' | 'info';
  title: string; desc: string; who: string | null; jira: string | null;
  owner: string | null; action: string | null; done: boolean; resolution: string | null;
}
export interface SlackData { channels: SlackChannel[]; items: SlackItem[]; }
export interface Snapshot { jiraData: JiraData; slackData: SlackData; refreshedAt: string | null; }
export interface ApiDataResponse {
  snapshot: Snapshot;
  dismissedSuggestions: string[];
  linkResults: Record<string, 'ok' | 'err'>;
}
export interface LinkSuggestion { fromKey: string; toKey: string; fromSummary: string; toSummary: string; }
```

- [ ] **Step 2: Write failing tests for issue utilities**

```ts
// frontend/src/utils/issue-utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  getStatusGroup, getPriorityEmoji, getFeatureArea,
  getMissingCounterparts, generateLinkSuggestions,
  STATUS_GROUP_ORDER,
} from './issue-utils';
import type { JiraIssue } from '../types';

const issue = (key: string, status: string, summary: string, links: any[] = []): JiraIssue =>
  ({ key, type: 'Bug', status, priority: 'Major', assignee: 'Alice', summary, links });

describe('getStatusGroup', () => {
  it('maps known statuses', () => {
    expect(getStatusGroup('BLOCKED')).toBe('BLOCKED');
    expect(getStatusGroup('In Progress')).toBe('IN DEV');
    expect(getStatusGroup('in DEV')).toBe('IN DEV');
    expect(getStatusGroup('Code Review')).toBe('IN DEV');
    expect(getStatusGroup('Ready For Review')).toBe('IN DEV');
    expect(getStatusGroup('In QA')).toBe('IN QA');
    expect(getStatusGroup('Pending QA')).toBe('IN QA');
    expect(getStatusGroup('To Do')).toBe('TODO');
    expect(getStatusGroup('TO DO')).toBe('TODO');
    expect(getStatusGroup('BACKLOG')).toBe('TODO');
    expect(getStatusGroup('Ready For Dev')).toBe('TODO');
    expect(getStatusGroup('Done')).toBe('DONE');
    expect(getStatusGroup('pending deployment')).toBe('DONE');
  });

  it('falls back to TODO for unknown status', () => {
    expect(getStatusGroup('Weird Status')).toBe('TODO');
  });
});

describe('getPriorityEmoji', () => {
  it('returns correct emoji per priority', () => {
    expect(getPriorityEmoji('Blocker')).toBe('🔴');
    expect(getPriorityEmoji('Critical')).toBe('🟠');
    expect(getPriorityEmoji('Major')).toBe('🟡');
    expect(getPriorityEmoji('Medium')).toBe('🟢');
    expect(getPriorityEmoji('Minor')).toBe('🔵');
    expect(getPriorityEmoji('Trivial')).toBe('⚪');
  });
});

describe('getFeatureArea', () => {
  it('detects keywords by first match', () => {
    expect(getFeatureArea('Runway Authentication')).toBe('Runway');
    expect(getFeatureArea('Bot fails to submit outfit')).toBe('Bot');
    expect(getFeatureArea('Gifting: player can receive MAX gifts')).toBe('Gift');
    expect(getFeatureArea('Something completely different')).toBe('Other');
  });
});

describe('getMissingCounterparts', () => {
  it('SST2 issue with no GGS link needs + Server', () => {
    const i = issue('SST2-1', 'To Do', 'test', []);
    expect(getMissingCounterparts(i)).toContain('GGS');
    expect(getMissingCounterparts(i)).toContain('CLPLG');
  });

  it('SST2 issue already linked to GGS only needs + Plugin', () => {
    const i = issue('SST2-1', 'To Do', 'test', [{ type: 'relates to', key: 'GGS-5' }]);
    expect(getMissingCounterparts(i)).not.toContain('GGS');
    expect(getMissingCounterparts(i)).toContain('CLPLG');
  });

  it('GGS issue needs + Plugin', () => {
    const i = issue('GGS-1', 'To Do', 'test', []);
    expect(getMissingCounterparts(i)).toEqual(['CLPLG']);
  });

  it('CLPLG issue needs + Server', () => {
    const i = issue('CLPLG-1', 'To Do', 'test', []);
    expect(getMissingCounterparts(i)).toEqual(['GGS']);
  });
});

describe('generateLinkSuggestions', () => {
  it('suggests link when two unlinked issues share >=2 meaningful words', () => {
    const issues = [
      issue('GGS-1', 'In Progress', 'Friends of Friends feature update', []),
      issue('CLPLG-1', 'To Do', 'Friends feature suggested friends', []),
      issue('SST2-1', 'To Do', 'Unrelated analytics event', []),
    ];
    const suggestions = generateLinkSuggestions(issues);
    expect(suggestions.some(s => s.fromKey === 'GGS-1' && s.toKey === 'CLPLG-1')).toBe(true);
  });

  it('does not suggest link between issues in same project', () => {
    const issues = [
      issue('GGS-1', 'In Progress', 'Friends of Friends feature', []),
      issue('GGS-2', 'To Do', 'Friends feature update', []),
    ];
    const suggestions = generateLinkSuggestions(issues);
    expect(suggestions).toHaveLength(0);
  });

  it('does not suggest link for already-linked issues', () => {
    const issues = [
      issue('GGS-1', 'In Progress', 'Friends of Friends feature', [{ type: 'relates to', key: 'CLPLG-1' }]),
      issue('CLPLG-1', 'To Do', 'Friends feature update', [{ type: 'relates to', key: 'GGS-1' }]),
    ];
    expect(generateLinkSuggestions(issues)).toHaveLength(0);
  });
});

describe('STATUS_GROUP_ORDER', () => {
  it('starts with BLOCKED', () => {
    expect(STATUS_GROUP_ORDER[0]).toBe('BLOCKED');
  });
  it('ends with DONE', () => {
    expect(STATUS_GROUP_ORDER[STATUS_GROUP_ORDER.length - 1]).toBe('DONE');
  });
});
```

- [ ] **Step 3: Run — expect failure**

```bash
cd frontend && npx vitest run src/utils/issue-utils.test.ts
```

- [ ] **Step 4: Implement issue-utils.ts**

```ts
// frontend/src/utils/issue-utils.ts
import type { JiraIssue, LinkSuggestion } from '../types';

export const STATUS_GROUPS: Record<string, string[]> = {
  BLOCKED: ['BLOCKED'],
  'IN DEV': ['in DEV', 'In Progress', 'In progress', 'Code Review', 'Ready For Review'],
  'IN QA': ['In QA', 'Pending QA'],
  TODO: ['To Do', 'TO DO', 'BACKLOG', 'Ready For Dev'],
  DONE: ['Done', 'pending deployment'],
};
export const STATUS_GROUP_ORDER = ['BLOCKED', 'IN DEV', 'IN QA', 'TODO', 'DONE'];

export function getStatusGroup(status: string): string {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if (statuses.includes(status)) return group;
  }
  return 'TODO';
}

export const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; bdr: string }> = {
  BLOCKED: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', bdr: '#fecaca' },
  'IN DEV': { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', bdr: '#bfdbfe' },
  'IN QA': { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1', bdr: '#c7d2fe' },
  TODO: { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  DONE: { bg: '#ecfdf5', text: '#065f46', dot: '#10b981', bdr: '#a7f3d0' },
};

export function getStatusStyle(status: string) {
  return STATUS_STYLES[getStatusGroup(status)] ?? STATUS_STYLES.TODO;
}

export const PROJECT_STYLES: Record<string, { bg: string; text: string; bdr: string; acc: string; label: string }> = {
  GGS: { bg: '#f0fdfa', text: '#115e59', bdr: '#14b8a6', acc: '#0d9488', label: 'Server' },
  CLPLG: { bg: '#f5f3ff', text: '#5b21b6', bdr: '#8b5cf6', acc: '#7c3aed', label: 'Plugin' },
  SST2: { bg: '#fdf2f8', text: '#9d174d', bdr: '#ec4899', acc: '#db2777', label: 'Game' },
};

export function getProjectStyle(key: string) {
  const proj = key.split('-')[0];
  return PROJECT_STYLES[proj] ?? { bg: '#f3f4f6', text: '#374151', bdr: '#6b7280', acc: '#6b7280', label: proj };
}

const PRIORITY_EMOJI: Record<string, string> = {
  Blocker: '🔴', Critical: '🟠', Major: '🟡', Medium: '🟢', Minor: '🔵', Trivial: '⚪',
};
export function getPriorityEmoji(priority: string): string {
  return PRIORITY_EMOJI[priority] ?? '⚪';
}

const FEATURE_KEYWORDS = [
  'runway', 'matchmaking', 'bot', 'friend', 'gift', 'auth',
  'score', 'dashboard', 'notification', 'push', 'profile', 'coupon',
];
export function getFeatureArea(summary: string): string {
  const lower = summary.toLowerCase();
  const match = FEATURE_KEYWORDS.find(kw => lower.includes(kw));
  return match ? match[0].toUpperCase() + match.slice(1) : 'Other';
}

const COUNTERPART_TARGETS: Record<string, string[]> = {
  SST2: ['GGS', 'CLPLG'],
  CLPLG: ['GGS'],
  GGS: ['CLPLG'],
};
export function getMissingCounterparts(issue: JiraIssue): string[] {
  const proj = issue.key.split('-')[0];
  const required = COUNTERPART_TARGETS[proj];
  if (!required) return [];
  const linked = new Set(issue.links.map(l => l.key.split('-')[0]));
  return required.filter(p => !linked.has(p));
}

const STOPWORDS = new Set([
  'the','a','an','is','in','for','to','of','and','or','from','with',
  'should','be','not','it','when','if','can','need','this',
]);

function keywords(summary: string): Set<string> {
  return new Set(
    summary.toLowerCase().split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ''))
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

export function generateLinkSuggestions(issues: JiraIssue[]): LinkSuggestion[] {
  // Build set of all currently-linked issue keys
  const linked = new Set<string>();
  issues.forEach(i => i.links.forEach(l => { linked.add(i.key); linked.add(l.key); }));

  const unlinked = issues.filter(i => !linked.has(i.key));
  const suggestions: LinkSuggestion[] = [];
  const seen = new Set<string>();

  for (let a = 0; a < unlinked.length; a++) {
    for (let b = a + 1; b < unlinked.length; b++) {
      const ia = unlinked[a], ib = unlinked[b];
      if (ia.key.split('-')[0] === ib.key.split('-')[0]) continue;
      const pairKey = `${ia.key}-${ib.key}`;
      if (seen.has(pairKey)) continue;
      const kwA = keywords(ia.summary), kwB = keywords(ib.summary);
      const overlap = [...kwA].filter(w => kwB.has(w));
      if (overlap.length >= 2) {
        suggestions.push({ fromKey: ia.key, toKey: ib.key, fromSummary: ia.summary, toSummary: ib.summary });
        seen.add(pairKey);
      }
    }
  }
  return suggestions;
}
```

- [ ] **Step 5: Run — expect pass**

```bash
cd frontend && npx vitest run src/utils/issue-utils.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types.ts frontend/src/utils/
git commit -m "feat: frontend types and issue utilities with tests"
```

---

## Task 10: Filter Store + API Hooks

**Files:**
- Create: `frontend/src/store/filters.ts`
- Create: `frontend/src/hooks/useData.ts`
- Create: `frontend/src/hooks/useRefresh.ts`

- [ ] **Step 1: Create frontend/src/store/filters.ts**

```ts
// frontend/src/store/filters.ts
import { create } from 'zustand';

interface FiltersState {
  project: 'all' | 'GGS' | 'CLPLG' | 'SST2';
  featureAreas: Set<string>;
  statusGroups: Set<string>;
  search: string;
  setProject: (p: FiltersState['project']) => void;
  toggleFeatureArea: (a: string) => void;
  toggleStatusGroup: (g: string) => void;
  setSearch: (s: string) => void;
}

export const useFilters = create<FiltersState>((set) => ({
  project: 'all',
  featureAreas: new Set(),
  statusGroups: new Set(),
  search: '',
  setProject: (project) => set({ project }),
  toggleFeatureArea: (a) => set((s) => {
    const next = new Set(s.featureAreas);
    next.has(a) ? next.delete(a) : next.add(a);
    return { featureAreas: next };
  }),
  toggleStatusGroup: (g) => set((s) => {
    const next = new Set(s.statusGroups);
    next.has(g) ? next.delete(g) : next.add(g);
    return { statusGroups: next };
  }),
  setSearch: (search) => set({ search }),
}));
```

- [ ] **Step 2: Create frontend/src/hooks/useData.ts**

```ts
// frontend/src/hooks/useData.ts
import { useQuery } from '@tanstack/react-query';
import type { ApiDataResponse } from '../types';

async function fetchData(): Promise<ApiDataResponse> {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

export function useData() {
  return useQuery({ queryKey: ['data'], queryFn: fetchData, staleTime: Infinity });
}
```

- [ ] **Step 3: Create frontend/src/hooks/useRefresh.ts**

```ts
// frontend/src/hooks/useRefresh.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiDataResponse } from '../types';

async function doRefresh(): Promise<ApiDataResponse> {
  const res = await fetch('/api/refresh', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Refresh failed' }));
    throw new Error(err.error ?? 'Refresh failed');
  }
  return res.json();
}

export function useRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: doRefresh,
    onSuccess: (data) => qc.setQueryData(['data'], data),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/ frontend/src/hooks/
git commit -m "feat: Zustand filter store and React Query hooks"
```

---

## Task 11: Header + SummaryCards Components

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/SummaryCards.tsx`

- [ ] **Step 1: Create Header.tsx**

```tsx
// frontend/src/components/Header.tsx
import { useRefresh } from '../hooks/useRefresh';

interface HeaderProps {
  refreshedAt: string | null;
  counts: { GGS: number; CLPLG: number; SST2: number };
}

export function Header({ refreshedAt, counts }: HeaderProps) {
  const { mutate, isPending, error } = useRefresh();

  return (
    <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)' }}
      className="px-6 py-4 text-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Glow Fashion Idol</h1>
          <p className="text-purple-200 text-sm">Cross-Project Dashboard</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Project counts */}
          <div className="flex gap-2 text-sm">
            {([['GGS', 'Server', '#14b8a6'], ['CLPLG', 'Plugin', '#8b5cf6'], ['SST2', 'Game', '#ec4899']] as const).map(
              ([key, label, color]) => (
                <span key={key} className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                  style={{ background: color + '40', border: `1px solid ${color}` }}>
                  {label}: {counts[key]}
                </span>
              )
            )}
          </div>
          {/* Refresh */}
          <div className="flex flex-col items-end gap-1">
            <button onClick={() => mutate()}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: isPending ? '#6d28d9' : '#7c3aed', cursor: isPending ? 'not-allowed' : 'pointer', color: 'white' }}>
              {isPending ? '⟳ Refreshing…' : '⟳ Refresh'}
            </button>
            {refreshedAt && (
              <span className="text-purple-300 text-xs">
                Updated {new Date(refreshedAt).toLocaleTimeString()}
              </span>
            )}
            {error && <span className="text-red-300 text-xs">{error.message}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SummaryCards.tsx**

```tsx
// frontend/src/components/SummaryCards.tsx
import { STATUS_GROUP_ORDER, STATUS_STYLES } from '../utils/issue-utils';
import { useFilters } from '../store/filters';

interface SummaryCardsProps {
  groupCounts: Record<string, number>;
}

export function SummaryCards({ groupCounts }: SummaryCardsProps) {
  const { statusGroups, toggleStatusGroup } = useFilters();

  return (
    <div className="flex gap-3 flex-wrap">
      {STATUS_GROUP_ORDER.map(group => {
        const style = STATUS_STYLES[group];
        const active = statusGroups.has(group);
        return (
          <button key={group}
            onClick={() => toggleStatusGroup(group)}
            className="flex-1 min-w-[100px] px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{
              background: active ? style.bg : '#fff',
              border: `2px solid ${active ? style.dot : '#e5e7eb'}`,
              color: active ? style.text : '#6b7280',
              boxShadow: active ? `0 0 0 1px ${style.dot}20` : 'none',
            }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: style.dot }} />
                {group}
              </span>
              <span className="text-lg font-bold" style={{ color: style.dot }}>
                {groupCounts[group] ?? 0}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/components/SummaryCards.tsx
git commit -m "feat: Header and SummaryCards components"
```

---

## Task 12: Filters Component

**Files:**
- Create: `frontend/src/components/Filters.tsx`

- [ ] **Step 1: Create Filters.tsx**

```tsx
// frontend/src/components/Filters.tsx
import { useState } from 'react';
import { useFilters } from '../store/filters';
import { STATUS_GROUP_ORDER } from '../utils/issue-utils';

const PROJECT_OPTIONS = [
  { value: 'all', label: 'All Projects' },
  { value: 'GGS', label: 'Server (GGS)' },
  { value: 'CLPLG', label: 'Plugin (CLPLG)' },
  { value: 'SST2', label: 'Game (SST2)' },
] as const;

const FEATURE_AREAS = [
  'Runway','Matchmaking','Bot','Friend','Gift','Auth',
  'Score','Dashboard','Notification','Push','Profile','Coupon','Other',
];

interface FiltersProps {
  areaCounts: Record<string, number>;
}

export function Filters({ areaCounts }: FiltersProps) {
  const { project, featureAreas, statusGroups, search, setProject, toggleFeatureArea, toggleStatusGroup, setSearch } = useFilters();
  const [showAreaDd, setShowAreaDd] = useState(false);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Project dropdown */}
      <select value={project} onChange={e => setProject(e.target.value as any)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 cursor-pointer">
        {PROJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Feature area dropdown */}
      <div className="relative">
        <button onClick={() => setShowAreaDd(v => !v)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 flex items-center gap-1">
          Feature Area {featureAreas.size > 0 && <span className="bg-purple-600 text-white text-xs rounded-full px-1.5">{featureAreas.size}</span>}
          <span className="text-gray-400">▾</span>
        </button>
        {showAreaDd && (
          <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[160px]">
            {FEATURE_AREAS.map(a => (
              <label key={a} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer text-sm">
                <input type="checkbox" checked={featureAreas.has(a)} onChange={() => toggleFeatureArea(a)} className="rounded" />
                {a} {areaCounts[a] ? <span className="text-gray-400 text-xs ml-auto">{areaCounts[a]}</span> : null}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <input type="text" placeholder="Search key, summary, assignee…" value={search}
        onChange={e => setSearch(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 min-w-[240px]" />

      {/* Active status chips */}
      {[...statusGroups].map(g => (
        <span key={g} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full cursor-pointer"
          style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #8b5cf6' }}
          onClick={() => toggleStatusGroup(g)}>
          {g} ✕
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Filters.tsx
git commit -m "feat: Filters component"
```

---

## Task 13: IssueCard Component

**Files:**
- Create: `frontend/src/components/IssueCard.tsx`

- [ ] **Step 1: Create IssueCard.tsx**

```tsx
// frontend/src/components/IssueCard.tsx
import type { JiraIssue } from '../types';
import {
  getPriorityEmoji, getProjectStyle, getStatusStyle,
  getMissingCounterparts,
} from '../utils/issue-utils';

const JIRA_BASE = 'https://tabtale.atlassian.net/browse/';

interface IssueCardProps {
  issue: JiraIssue;
  isCrossLinked: boolean;
  linkResults: Record<string, 'ok' | 'err'>;
  onCreateCounterpart: (issue: JiraIssue, targetProject: string) => void;
}

export function IssueCard({ issue, isCrossLinked, linkResults, onCreateCounterpart }: IssueCardProps) {
  const projStyle = getProjectStyle(issue.key);
  const statusStyle = getStatusStyle(issue.status);
  const missing = getMissingCounterparts(issue);

  return (
    <div className="bg-white rounded-xl p-4 transition-all hover:shadow-md"
      style={{
        border: '1px solid #e5e7eb',
        borderLeft: isCrossLinked ? `3px solid ${projStyle.acc}` : '1px solid #e5e7eb',
      }}>
      {/* Row 1: priority, key, project badge, summary, status */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-base leading-none mt-0.5">{getPriorityEmoji(issue.priority)}</span>
        <a href={`${JIRA_BASE}${issue.key}`} target="_blank" rel="noopener noreferrer"
          className="font-mono text-sm font-semibold hover:underline"
          style={{ color: projStyle.acc, fontFamily: 'JetBrains Mono, monospace' }}>
          {issue.key}
        </a>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: projStyle.bg, color: projStyle.text, border: `1px solid ${projStyle.bdr}` }}>
          {projStyle.label}
        </span>
        <span className="flex-1 text-sm text-gray-800">{issue.summary}</span>
        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.bdr}` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
          {issue.status}
        </span>
      </div>

      {/* Row 2: assignee, type, links, counterpart buttons */}
      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-gray-500">
        <span>{issue.assignee}</span>
        <span className="text-gray-300">·</span>
        <span>{issue.type}</span>

        {issue.links.map((link, i) => (
            <a key={i} href={`${JIRA_BASE}${link.key}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs hover:opacity-80"
              style={{ background: getProjectStyle(link.key).bg, color: getProjectStyle(link.key).acc, border: `1px solid ${getProjectStyle(link.key).bdr}` }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{link.key}</span>
              <span className="text-gray-400">({link.type})</span>
            </a>
        ))}

        {missing.map(target => {
          const label = target === 'GGS' ? '+ Server' : target === 'CLPLG' ? '+ Plugin' : `+ ${target}`;
          return (
            <button key={target}
              onClick={() => onCreateCounterpart(issue, target)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-all hover:opacity-80"
              style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/IssueCard.tsx
git commit -m "feat: IssueCard component"
```

---

## Task 14: IssueList Component

**Files:**
- Create: `frontend/src/components/IssueList.tsx`

- [ ] **Step 1: Create IssueList.tsx**

```tsx
// frontend/src/components/IssueList.tsx
import type { JiraData, JiraIssue } from '../types';
import { getStatusGroup, getFeatureArea, STATUS_GROUP_ORDER } from '../utils/issue-utils';
import { useFilters } from '../store/filters';
import { IssueCard } from './IssueCard';

interface IssueListProps {
  jiraData: JiraData;
  crossLinkedKeys: Set<string>;
  linkResults: Record<string, 'ok' | 'err'>;
  onCreateCounterpart: (issue: JiraIssue, targetProject: string) => void;
}

export function IssueList({ jiraData, crossLinkedKeys, linkResults, onCreateCounterpart }: IssueListProps) {
  const { project, featureAreas, statusGroups, search } = useFilters();
  const all = [...jiraData.GGS, ...jiraData.CLPLG, ...jiraData.SST2];

  let filtered = all;
  if (project !== 'all') filtered = filtered.filter(i => i.key.startsWith(project));
  if (featureAreas.size > 0) filtered = filtered.filter(i => featureAreas.has(getFeatureArea(i.summary)));
  if (statusGroups.size > 0) filtered = filtered.filter(i => statusGroups.has(getStatusGroup(i.status)));
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(i =>
      i.key.toLowerCase().includes(q) ||
      i.summary.toLowerCase().includes(q) ||
      i.assignee.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const ai = STATUS_GROUP_ORDER.indexOf(getStatusGroup(a.status));
    const bi = STATUS_GROUP_ORDER.indexOf(getStatusGroup(b.status));
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  if (filtered.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No issues match the current filters.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {filtered.map(issue => (
        <IssueCard key={issue.key} issue={issue}
          isCrossLinked={crossLinkedKeys.has(issue.key)}
          linkResults={linkResults}
          onCreateCounterpart={onCreateCounterpart} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/IssueList.tsx
git commit -m "feat: IssueList with filtering and sorting"
```

---

## Task 15: LinkSuggestions Component

**Files:**
- Create: `frontend/src/components/LinkSuggestions.tsx`

- [ ] **Step 1: Create LinkSuggestions.tsx**

```tsx
// frontend/src/components/LinkSuggestions.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LinkSuggestion, ApiDataResponse } from '../types';

interface LinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  dismissed: Set<string>;
  linkResults: Record<string, 'ok' | 'err'>;
}

export function LinkSuggestions({ suggestions, dismissed, linkResults }: LinkSuggestionsProps) {
  const [open, setOpen] = useState(true);
  const qc = useQueryClient();

  const visible = suggestions.filter(s => {
    const pk = `${s.fromKey}-${s.toKey}`;
    return !dismissed.has(pk) && linkResults[pk] !== 'ok';
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ fromKey, toKey }: { fromKey: string; toKey: string }) => {
      const res = await fetch('/api/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromKey, toKey }),
      });
      if (!res.ok) throw new Error('Link failed');
      return { fromKey, toKey };
    },
    onSuccess: ({ fromKey, toKey }) => {
      const pairKey = `${fromKey}-${toKey}`;
      qc.setQueryData(['data'], (old: ApiDataResponse | undefined) => {
        if (!old) return old;
        return { ...old, linkResults: { ...old.linkResults, [pairKey]: 'ok' } };
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (pairKey: string) => {
      await fetch('/api/dismissed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairKey }) });
      return pairKey;
    },
    onSuccess: (pairKey) => {
      qc.setQueryData(['data'], (old: ApiDataResponse | undefined) => {
        if (!old) return old;
        return { ...old, dismissedSuggestions: [...old.dismissedSuggestions, pairKey] };
      });
    },
  });

  if (visible.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #fde68a', background: '#fffbeb' }}>
      <button className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium"
        style={{ color: '#92400e' }} onClick={() => setOpen(v => !v)}>
        <span>💡 {visible.length} possible link suggestion{visible.length > 1 ? 's' : ''} — similar issues that may be related</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {visible.map(s => {
            const pk = `${s.fromKey}-${s.toKey}`;
            const isLinking = confirmMutation.isPending && (confirmMutation.variables as any)?.fromKey === s.fromKey;
            return (
              <div key={pk} className="flex items-center gap-3 p-2 rounded-lg bg-white"
                style={{ border: '1px solid #fde68a' }}>
                <div className="flex-1 text-xs text-gray-700">
                  <span className="font-mono font-semibold text-amber-700">{s.fromKey}</span>
                  <span className="text-gray-400 mx-1">↔</span>
                  <span className="font-mono font-semibold text-amber-700">{s.toKey}</span>
                  <span className="ml-2 text-gray-500">{s.fromSummary}</span>
                </div>
                <button onClick={() => confirmMutation.mutate({ fromKey: s.fromKey, toKey: s.toKey })}
                  disabled={isLinking}
                  className="px-2 py-1 rounded text-xs font-medium text-white"
                  style={{ background: '#d97706' }}>
                  {isLinking ? '…' : 'Link in JIRA'}
                </button>
                <button onClick={() => dismissMutation.mutate(pk)}
                  className="px-2 py-1 rounded text-xs font-medium text-gray-500 hover:bg-gray-100">
                  Dismiss
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/LinkSuggestions.tsx
git commit -m "feat: LinkSuggestions component"
```

---

## Task 16: SlackSection Component

**Files:**
- Create: `frontend/src/components/SlackSection.tsx`

- [ ] **Step 1: Create SlackSection.tsx**

```tsx
// frontend/src/components/SlackSection.tsx
import type { SlackData, SlackItem } from '../types';

const SEV_COLORS = {
  critical: { dot: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
  high: { dot: '#f97316', bg: '#fff7ed', text: '#9a3412' },
  medium: { dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  info: { dot: '#6b7280', bg: '#f9fafb', text: '#374151' },
};

function SlackItemRow({ item }: { item: SlackItem }) {
  const sevColor = SEV_COLORS[item.sev] ?? SEV_COLORS.info;
  return (
    <div className="flex gap-3 py-3" style={{ opacity: item.done ? 0.5 : 1, borderBottom: '1px solid #f3f4f6' }}>
      <div className="mt-1 shrink-0">
        {item.done
          ? <span className="text-green-500 text-sm">✓</span>
          : <span className="w-2 h-2 rounded-full block mt-1" style={{ background: sevColor.dot }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{item.title}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: item.done ? '#ecfdf5' : sevColor.bg, color: item.done ? '#065f46' : sevColor.text }}>
            {item.done ? 'Done' : 'Open'}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: sevColor.bg, color: sevColor.text }}>
            {item.sev}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
        <div className="flex gap-3 mt-1 flex-wrap text-xs text-gray-400">
          <span>#{item.ch}</span>
          {item.who && <span>reported by {item.who}</span>}
          {item.jira && (
            <a href={`https://tabtale.atlassian.net/browse/${item.jira}`} target="_blank" rel="noopener noreferrer"
              className="font-mono hover:underline" style={{ color: '#7c3aed' }}>
              {item.jira}
            </a>
          )}
        </div>
        {!item.done && item.owner && item.action && (
          <p className="text-xs mt-1" style={{ color: '#2563eb' }}>→ <strong>{item.owner}</strong>: {item.action}</p>
        )}
        {item.done && item.resolution && (
          <p className="text-xs mt-1 text-green-600">✓ {item.resolution}</p>
        )}
      </div>
    </div>
  );
}

interface SlackSectionProps {
  slackData: SlackData;
}

export function SlackSection({ slackData }: SlackSectionProps) {
  const activeChannels = slackData.channels.filter(c => c.active);
  const quietCount = slackData.channels.length - activeChannels.length;

  return (
    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #e5e7eb' }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-800">Slack Intelligence</h2>
        <div className="flex gap-2 flex-wrap">
          {activeChannels.map(ch => (
            <span key={ch.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#dcfce7', color: '#166534' }}>
              #{ch.name}
            </span>
          ))}
          {quietCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#f3f4f6', color: '#6b7280' }}>
              +{quietCount} quiet
            </span>
          )}
        </div>
      </div>
      <div>
        {slackData.items.length === 0
          ? <p className="text-sm text-gray-400 py-4 text-center">No Slack items. Click Refresh to load.</p>
          : slackData.items.map((item, i) => <SlackItemRow key={i} item={item} />)
        }
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SlackSection.tsx
git commit -m "feat: SlackSection component"
```

---

## Task 17: CreateIssueModal Component

**Files:**
- Create: `frontend/src/components/CreateIssueModal.tsx`

- [ ] **Step 1: Create CreateIssueModal.tsx**

```tsx
// frontend/src/components/CreateIssueModal.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JiraIssue } from '../types';

interface CreateIssueModalProps {
  sourceIssue: JiraIssue;
  targetProject: string;
  onClose: () => void;
}

const PROJECT_LABELS: Record<string, string> = { GGS: 'Server', CLPLG: 'Plugin', SST2: 'Game' };

export function CreateIssueModal({ sourceIssue, targetProject, onClose }: CreateIssueModalProps) {
  const [summary, setSummary] = useState(sourceIssue.summary);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/issues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceKey: sourceIssue.key, targetProject, summary }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ key: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Create {PROJECT_LABELS[targetProject] ?? targetProject} counterpart
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          New <strong>Task</strong> in <strong>{targetProject}</strong>, linked to{' '}
          <span className="font-mono font-semibold" style={{ color: '#7c3aed' }}>{sourceIssue.key}</span>
        </p>
        <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400 resize-none"
        />
        {mutation.error && (
          <p className="text-xs text-red-500 mt-2">{(mutation.error as Error).message}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !summary.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#7c3aed', opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? 'Creating…' : 'Create & Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CreateIssueModal.tsx
git commit -m "feat: CreateIssueModal component"
```

---

## Task 18: Wire Up App.tsx + End-to-End Smoke Test

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace App.tsx skeleton with full implementation**

```tsx
// frontend/src/App.tsx
import { useState } from 'react';
import { useData } from './hooks/useData';
import { useFilters } from './store/filters';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { Filters } from './components/Filters';
import { IssueList } from './components/IssueList';
import { LinkSuggestions } from './components/LinkSuggestions';
import { SlackSection } from './components/SlackSection';
import { CreateIssueModal } from './components/CreateIssueModal';
import {
  getStatusGroup, getFeatureArea, generateLinkSuggestions, STATUS_GROUP_ORDER,
} from './utils/issue-utils';
import type { JiraIssue } from './types';

export default function App() {
  const { data, isLoading, error } = useData();
  const [modal, setModal] = useState<{ issue: JiraIssue; target: string } | null>(null);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fb' }}>
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fb' }}>
      <p className="text-red-500 text-sm">Failed to load: {(error as Error).message}</p>
    </div>
  );

  const { snapshot, dismissedSuggestions, linkResults } = data!;
  const { jiraData, slackData, refreshedAt } = snapshot;
  const all = [...jiraData.GGS, ...jiraData.CLPLG, ...jiraData.SST2];

  // Cross-linked keys (issues with links to other projects in the tracked set)
  const crossLinkedKeys = new Set<string>();
  all.forEach(i => i.links.forEach(l => {
    const lp = l.key.split('-')[0];
    if (['GGS','CLPLG','SST2'].includes(lp) && lp !== i.key.split('-')[0]) {
      crossLinkedKeys.add(i.key);
      crossLinkedKeys.add(l.key);
    }
  }));

  // Status group counts
  const groupCounts: Record<string, number> = {};
  STATUS_GROUP_ORDER.forEach(g => { groupCounts[g] = all.filter(i => getStatusGroup(i.status) === g).length; });

  // Feature area counts
  const areaCounts: Record<string, number> = {};
  all.forEach(i => { const a = getFeatureArea(i.summary); areaCounts[a] = (areaCounts[a] ?? 0) + 1; });

  // Link suggestions
  const suggestions = generateLinkSuggestions(all);
  const dismissedSet = new Set(dismissedSuggestions);

  const counts = { GGS: jiraData.GGS.length, CLPLG: jiraData.CLPLG.length, SST2: jiraData.SST2.length };

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fb' }}>
      <Header refreshedAt={refreshedAt} counts={counts} />
      <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col gap-4">
        <SummaryCards groupCounts={groupCounts} />
        <Filters areaCounts={areaCounts} />
        <LinkSuggestions suggestions={suggestions} dismissed={dismissedSet} linkResults={linkResults} />
        <IssueList
          jiraData={jiraData}
          crossLinkedKeys={crossLinkedKeys}
          linkResults={linkResults}
          onCreateCounterpart={(issue, target) => setModal({ issue, target })}
        />
        <SlackSection slackData={slackData} />
      </div>
      {modal && (
        <CreateIssueModal
          sourceIssue={modal.issue}
          targetProject={modal.target}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all backend tests**

```bash
cd backend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: issue-utils tests pass.

- [ ] **Step 4: Start both servers and smoke-test in browser**

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Open http://localhost:5173.
- Dashboard renders with "Loading..." briefly, then shows empty state (no data yet).
- Click **Refresh** — backend fetches JIRA + Slack. Dashboard populates with issues and Slack items.
- Status group cards show correct counts; clicking them filters the issue list.
- Search input filters issues.
- Clicking a project/feature area dropdown filters correctly.

- [ ] **Step 5: Final commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire up App.tsx — dashboard complete"
```

---

## Task 19: Environment Setup Doc

**Files:**
- Modify: `README.md` (create if not exists — this is the setup doc, not an additional doc)

- [ ] **Step 1: Create README.md**

```markdown
# Glow Fashion Idol Dashboard

Cross-project JIRA + Slack dashboard for the Glow Fashion Idol multiplayer services team.

## Setup

1. **Clone and install**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

2. **Configure credentials**
   ```bash
   cp .env.example .env
   ```
   Fill in `.env`:
   - `JIRA_API_TOKEN` — from https://id.atlassian.com/manage/api-tokens
   - `SLACK_BOT_TOKEN` — Slack App Bot Token (scopes: `channels:history`, `channels:read`, `users:read`)
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com

3. **Run**
   ```bash
   npm run dev
   ```
   Opens backend on http://localhost:3001 and frontend on http://localhost:5173.

4. **Use**
   - Open http://localhost:5173
   - Click **Refresh** to fetch live data (requires valid credentials)
   - Data persists in `data/glow.db` across restarts
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: setup README"
```
