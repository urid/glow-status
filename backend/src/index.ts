// backend/src/index.ts
import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { createDbService } from './services/db.service.js';
import { fetchAllJiraIssues } from './services/jira.service.js';
import { fetchSlackMessages, CHANNELS } from './services/slack.service.js';
import { classifySlackMessages } from './services/ai.service.js';
import type { ApiDataResponse, SlackData } from './types.js';

// ── Environment ───────────────────────────────────────────────────────────────

const {
  JIRA_BASE_URL,
  JIRA_USER_EMAIL,
  JIRA_API_TOKEN,
  SLACK_BOT_TOKEN,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  PORT = '3001',
} = process.env;

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

// ── Database ──────────────────────────────────────────────────────────────────

const dataDir = path.resolve(process.cwd(), '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'glow.db'));
const dbService = createDbService(db);

// ── JIRA helpers ──────────────────────────────────────────────────────────────

function jiraAuth(): { base: string; auth: string } {
  const base = requireEnv('JIRA_BASE_URL');
  const email = requireEnv('JIRA_USER_EMAIL');
  const token = requireEnv('JIRA_API_TOKEN');
  const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  return { base, auth };
}

async function jiraPost(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { base, auth } = jiraAuth();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/data — return last snapshot
app.get('/api/data', (_req, res) => {
  try {
    const snapshot = dbService.getSnapshot();
    const payload: ApiDataResponse = {
      snapshot: snapshot ?? {
        jiraData: { GGS: [], CLPLG: [], SST2: [] },
        slackData: { channels: [], items: [] },
        refreshedAt: null,
      },
      dismissedSuggestions: dbService.getDismissed(),
      linkResults: dbService.getLinkResults(),
    };
    res.json(payload);
  } catch (err) {
    console.error('GET /api/data error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/refresh — fetch JIRA + Slack, classify, persist, return data
app.post('/api/refresh', async (_req, res) => {
  try {
    const jiraBase = requireEnv('JIRA_BASE_URL');
    const jiraEmail = requireEnv('JIRA_USER_EMAIL');
    const jiraToken = requireEnv('JIRA_API_TOKEN');
    const slackToken = requireEnv('SLACK_BOT_TOKEN');
    const anthropicKey = ANTHROPIC_API_KEY;
    const geminiKey = GEMINI_API_KEY;

    const [jiraData, channelMessages] = await Promise.all([
      fetchAllJiraIssues(jiraBase, jiraEmail, jiraToken),
      fetchSlackMessages(slackToken),
    ]);

    const items = await classifySlackMessages({ anthropicKey, geminiKey }, channelMessages);

    const slackData: SlackData = {
      channels: CHANNELS.map((ch) => {
        const found = channelMessages.find((c) => c.channelId === ch.id);
        return { id: ch.id, name: ch.name, active: found?.active ?? false };
      }),
      items,
    };

    dbService.saveSnapshot(jiraData, slackData);

    const payload: ApiDataResponse = {
      snapshot: {
        jiraData,
        slackData,
        refreshedAt: new Date().toISOString(),
      },
      dismissedSuggestions: dbService.getDismissed(),
      linkResults: dbService.getLinkResults(),
    };
    res.json(payload);
  } catch (err) {
    console.error('POST /api/refresh error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/links — create a JIRA "Relates to" link
app.post('/api/links', async (req, res) => {
  const { fromKey, toKey } = req.body as { fromKey?: string; toKey?: string };
  if (!fromKey || !toKey) {
    res.status(400).json({ error: 'fromKey and toKey are required' });
    return;
  }
  const pairKey = `${fromKey}-${toKey}`;
  try {
    const result = await jiraPost('/rest/api/3/issueLink', {
      type: { name: 'Relates' },
      inwardIssue: { key: fromKey },
      outwardIssue: { key: toKey },
    });
    const status = result.ok ? 'ok' : 'err';
    dbService.setLinkResult(pairKey, status);
    if (!result.ok) {
      res.status(result.status).json({ error: 'JIRA link creation failed', detail: result.data });
      return;
    }
    res.json({ pairKey, status: 'ok' });
  } catch (err) {
    dbService.setLinkResult(pairKey, 'err');
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/issues — create a counterpart issue and link to source
app.post('/api/issues', async (req, res) => {
  const { fromKey, project, summary } = req.body as {
    fromKey?: string;
    project?: string;
    summary?: string;
  };
  if (!fromKey || !project || !summary) {
    res.status(400).json({ error: 'fromKey, project, and summary are required' });
    return;
  }
  try {
    // Determine issue type by project
    const issueType = project === 'CLPLG' ? 'Plugin' : 'Story';
    const createResult = await jiraPost('/rest/api/3/issue', {
      fields: {
        project: { key: project },
        summary,
        issuetype: { name: issueType },
      },
    });
    if (!createResult.ok) {
      res.status(createResult.status).json({ error: 'Issue creation failed', detail: createResult.data });
      return;
    }
    const newKey = (createResult.data as { key: string }).key;

    // Link back to source
    const linkResult = await jiraPost('/rest/api/3/issueLink', {
      type: { name: 'Relates' },
      inwardIssue: { key: fromKey },
      outwardIssue: { key: newKey },
    });
    if (!linkResult.ok) {
      // Issue created but link failed — still return success with a warning
      res.json({ newKey, linked: false });
      return;
    }
    res.json({ newKey, linked: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/dismissed — save a dismissed suggestion
app.post('/api/dismissed', (req, res) => {
  const { pairKey } = req.body as { pairKey?: string };
  if (!pairKey) {
    res.status(400).json({ error: 'pairKey is required' });
    return;
  }
  try {
    dbService.addDismissed(pairKey);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/dismissed/:id — remove a dismissed suggestion
app.delete('/api/dismissed/:id', (req, res) => {
  const pairKey = decodeURIComponent(req.params.id);
  try {
    dbService.removeDismissed(pairKey);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const port = parseInt(PORT, 10);
app.listen(port, () => {
  console.log(`glow-status backend running on http://localhost:${port}`);
  if (!JIRA_BASE_URL || !SLACK_BOT_TOKEN) {
    console.warn('Warning: JIRA_BASE_URL or SLACK_BOT_TOKEN missing. Set them in .env before calling /api/refresh.');
  }
  const activeAiProvider = ANTHROPIC_API_KEY ? 'Anthropic' : GEMINI_API_KEY ? 'Gemini' : null;
  if (!activeAiProvider) {
    console.warn('Warning: no AI key set (ANTHROPIC_API_KEY or GEMINI_API_KEY) — Slack classification will be skipped.');
  } else {
    console.log(`AI provider: ${activeAiProvider}`);
  }
});

export { app };
