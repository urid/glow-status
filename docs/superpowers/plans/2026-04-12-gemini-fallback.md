# Gemini Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Gemini as a fallback AI provider for Slack classification, using Anthropic when `ANTHROPIC_API_KEY` is set, Gemini when `GEMINI_API_KEY` is set, and skipping classification when neither is set.

**Architecture:** A single `classifySlackMessages({ anthropicKey, geminiKey }, channels)` function selects the provider internally. The system prompt and JSON parsing are shared. `index.ts` reads both env vars and passes them through.

**Tech Stack:** `@google/generative-ai` (new), `@anthropic-ai/sdk` (existing), Vitest for tests.

---

### Task 1: Install Gemini SDK and add env vars

**Files:**
- Modify: `backend/package.json`
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Install the Gemini SDK**

Run from the repo root:
```bash
cd backend && npm install @google/generative-ai
```
Expected output: added 1 package

- [ ] **Step 2: Add GEMINI_API_KEY to .env**

Open `.env` and add this line (fill in your key):
```
GEMINI_API_KEY=your-gemini-api-key-here
```

- [ ] **Step 3: Add GEMINI_API_KEY to .env.example**

Open `.env.example` and add after `ANTHROPIC_API_KEY=`:
```
GEMINI_API_KEY=
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json .env.example
git commit -m "feat: install @google/generative-ai, add GEMINI_API_KEY to env template"
```

---

### Task 2: Update ai.service.ts to support both providers

**Files:**
- Modify: `backend/src/services/ai.service.ts`

The new signature is `classifySlackMessages({ anthropicKey, geminiKey }: AIKeys, channels)`.
The Anthropic path stays identical to today. The Gemini path uses `@google/generative-ai` with the same system prompt.

- [ ] **Step 1: Replace ai.service.ts with the multi-provider implementation**

Overwrite `backend/src/services/ai.service.ts` with:

```typescript
// backend/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChannelMessages } from './slack.service.js';
import type { SlackItem } from '../types.js';

const ANTHROPIC_MODEL = 'claude-opus-4-6';
const GEMINI_MODEL = 'gemini-2.0-flash';

export interface AIKeys {
  anthropicKey?: string;
  geminiKey?: string;
}

const SYSTEM_PROMPT = `You are a Slack message classifier for a game server engineering team.

Given messages from multiple Slack channels, extract meaningful work items — bugs, alerts, action items, discussions, decisions.

Return a JSON array of items. Each item must match this schema exactly:
{
  "ch": "<channel name>",
  "sev": "critical" | "high" | "medium" | "info",
  "title": "<short title, max 80 chars>",
  "desc": "<brief description of the issue or discussion>",
  "who": "<reporter or author full name, or null>",
  "jira": "<JIRA key like GGS-123 if mentioned, or null>",
  "owner": "<person responsible for action, or null>",
  "action": "<specific action item if present, or null>",
  "done": <true if resolved/closed/done, false otherwise>,
  "resolution": "<how it was resolved, or null>"
}

Severity guidelines:
- critical: production outage, data loss, system down
- high: significant bug, urgent action needed, blocking work
- medium: non-urgent issue, question with impact, needs follow-up
- info: FYI, status update, non-actionable discussion

Rules:
- Skip pure noise: one-word acks, emoji-only, bot messages, "+1", "ok", "thanks"
- Group thread replies with their parent message as one item
- Extract JIRA keys (e.g. GGS-123, CLPLG-45, SST2-78) from message text
- If a thread shows an issue was resolved, set done=true and fill resolution
- Return ONLY a valid JSON array, no markdown, no explanation`;

function buildUserPrompt(channels: ChannelMessages[]): string {
  const parts: string[] = [];
  for (const ch of channels) {
    if (ch.messages.length === 0) continue;
    parts.push(`=== #${ch.channelName} ===`);
    for (const msg of ch.messages) {
      const time = new Date(Number(msg.ts) * 1000).toISOString().slice(0, 16).replace('T', ' ');
      parts.push(`[${time}] ${msg.userName}: ${msg.text}`);
    }
    parts.push('');
  }
  return parts.join('\n');
}

function parseJsonResponse(text: string): SlackItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!match) throw new Error(`AI response was not valid JSON: ${text.slice(0, 200)}`);
    parsed = JSON.parse(match[1]);
  }
  if (!Array.isArray(parsed)) throw new Error('AI response was not a JSON array');

  return (parsed as Record<string, unknown>[]).map((item) => ({
    ch: String(item.ch ?? ''),
    sev: (['critical', 'high', 'medium', 'info'].includes(item.sev as string)
      ? item.sev
      : 'info') as SlackItem['sev'],
    title: String(item.title ?? ''),
    desc: String(item.desc ?? ''),
    who: item.who != null ? String(item.who) : null,
    jira: item.jira != null ? String(item.jira) : null,
    owner: item.owner != null ? String(item.owner) : null,
    action: item.action != null ? String(item.action) : null,
    done: Boolean(item.done),
    resolution: item.resolution != null ? String(item.resolution) : null,
  }));
}

async function classifyWithAnthropic(apiKey: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
}

async function classifyWithGemini(apiKey: string, userPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

export async function classifySlackMessages(
  keys: AIKeys,
  channels: ChannelMessages[],
): Promise<SlackItem[]> {
  const activeChannels = channels.filter((c) => c.messages.length > 0);
  if (activeChannels.length === 0) return [];

  const userPrompt = buildUserPrompt(activeChannels);

  let text: string;
  if (keys.anthropicKey) {
    text = await classifyWithAnthropic(keys.anthropicKey, userPrompt);
  } else if (keys.geminiKey) {
    text = await classifyWithGemini(keys.geminiKey, userPrompt);
  } else {
    return [];
  }

  return parseJsonResponse(text);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors

---

### Task 3: Update tests for ai.service.ts

**Files:**
- Modify: `backend/src/tests/ai.service.test.ts`

The existing tests pass a bare string key. They must be updated to use the new `{ anthropicKey }` shape. New tests cover the Gemini path and provider selection.

- [ ] **Step 1: Replace ai.service.test.ts**

Overwrite `backend/src/tests/ai.service.test.ts` with:

```typescript
// backend/src/tests/ai.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifySlackMessages } from '../services/ai.service.js';
import type { ChannelMessages } from '../services/slack.service.js';

// ── Anthropic mock ────────────────────────────────────────────────────────────

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

async function getAnthropicMock() {
  const mod = await import('@anthropic-ai/sdk');
  return (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
}

function makeAnthropicResponse(json: unknown): object {
  return { content: [{ type: 'text', text: JSON.stringify(json) }] };
}

// ── Gemini mock ───────────────────────────────────────────────────────────────

const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

function makeGeminiResponse(json: unknown): object {
  return { response: { text: () => JSON.stringify(json) } };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_CHANNELS: ChannelMessages[] = [
  {
    channelId: 'C001',
    channelName: 'glow-server',
    active: true,
    messages: [
      { userId: 'U1', userName: 'Alice', text: 'GGS-123 matchmaking is broken in prod', ts: '1700000000' },
      { userId: 'U2', userName: 'Bob', text: 'Investigating now', ts: '1700000060' },
    ],
  },
  {
    channelId: 'C002',
    channelName: 'glow-runway',
    active: false,
    messages: [],
  },
];

const SAMPLE_ITEM = {
  ch: 'glow-server', sev: 'high', title: 'Matchmaking broken in prod',
  desc: 'GGS-123 matchmaking is broken', who: 'Alice', jira: 'GGS-123',
  owner: 'Bob', action: 'Investigate', done: false, resolution: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('classifySlackMessages', () => {
  beforeEach(() => vi.clearAllMocks());

  // Provider selection
  it('returns empty array when no keys are provided', async () => {
    const result = await classifySlackMessages({}, SAMPLE_CHANNELS);
    expect(result).toEqual([]);
  });

  it('returns empty array when no channels have messages', async () => {
    const empty: ChannelMessages[] = [
      { channelId: 'C1', channelName: 'x', active: false, messages: [] },
    ];
    const result = await classifySlackMessages({ anthropicKey: 'key' }, empty);
    expect(result).toEqual([]);
  });

  // Anthropic path
  it('uses Anthropic when anthropicKey is provided', async () => {
    const mockCreate = await getAnthropicMock();
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([SAMPLE_ITEM]));

    const result = await classifySlackMessages({ anthropicKey: 'fake-key' }, SAMPLE_CHANNELS);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ ch: 'glow-server', sev: 'high', jira: 'GGS-123' });
  });

  it('calls Anthropic with claude-opus-4-6 model', async () => {
    const mockCreate = await getAnthropicMock();
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([]));

    await classifySlackMessages({ anthropicKey: 'my-api-key' }, SAMPLE_CHANNELS);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-6' }),
    );
  });

  it('prefers Anthropic over Gemini when both keys are set', async () => {
    const mockCreate = await getAnthropicMock();
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([SAMPLE_ITEM]));

    await classifySlackMessages({ anthropicKey: 'a-key', geminiKey: 'g-key' }, SAMPLE_CHANNELS);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  // Gemini path
  it('uses Gemini when only geminiKey is provided', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeGeminiResponse([SAMPLE_ITEM]));

    const result = await classifySlackMessages({ geminiKey: 'g-key' }, SAMPLE_CHANNELS);

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ ch: 'glow-server', sev: 'high' });
  });

  it('calls Gemini with gemini-2.0-flash model', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockGetModel = vi.fn().mockReturnValue({ generateContent: mockGenerateContent });
    (GoogleGenerativeAI as any).mockImplementationOnce(() => ({ getGenerativeModel: mockGetModel }));
    mockGenerateContent.mockResolvedValueOnce(makeGeminiResponse([]));

    await classifySlackMessages({ geminiKey: 'g-key' }, SAMPLE_CHANNELS);

    expect(mockGetModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.0-flash' }),
    );
  });

  // Shared parsing
  it('handles markdown-wrapped JSON response (Anthropic)', async () => {
    const mockCreate = await getAnthropicMock();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: `\`\`\`json\n${JSON.stringify([SAMPLE_ITEM])}\n\`\`\`` }],
    });

    const result = await classifySlackMessages({ anthropicKey: 'key' }, SAMPLE_CHANNELS);
    expect(result).toHaveLength(1);
  });

  it('handles markdown-wrapped JSON response (Gemini)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => `\`\`\`json\n${JSON.stringify([SAMPLE_ITEM])}\n\`\`\`` },
    });

    const result = await classifySlackMessages({ geminiKey: 'key' }, SAMPLE_CHANNELS);
    expect(result).toHaveLength(1);
  });

  it('defaults unknown severity to info', async () => {
    const mockCreate = await getAnthropicMock();
    const item = { ...SAMPLE_ITEM, sev: 'UNKNOWN' };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([item]));

    const result = await classifySlackMessages({ anthropicKey: 'key' }, SAMPLE_CHANNELS);
    expect(result[0].sev).toBe('info');
  });

  it('throws when response is not valid JSON', async () => {
    const mockCreate = await getAnthropicMock();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all!!!' }],
    });

    await expect(
      classifySlackMessages({ anthropicKey: 'key' }, SAMPLE_CHANNELS)
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests — expect failures (old signature still in index.ts)**

```bash
cd backend && npm test
```
Expected: tests in ai.service.test.ts pass; nothing else should break yet.

---

### Task 4: Update index.ts to pass both keys

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update the refresh route**

Find this block in `backend/src/index.ts` (around line 93):
```typescript
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const [jiraData, channelMessages] = await Promise.all([
      fetchAllJiraIssues(jiraBase, jiraEmail, jiraToken),
      fetchSlackMessages(slackToken),
    ]);

    const items = anthropicKey
      ? await classifySlackMessages(anthropicKey, channelMessages)
      : [];
```

Replace with:
```typescript
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const [jiraData, channelMessages] = await Promise.all([
      fetchAllJiraIssues(jiraBase, jiraEmail, jiraToken),
      fetchSlackMessages(slackToken),
    ]);

    const items = await classifySlackMessages({ anthropicKey, geminiKey }, channelMessages);
```

- [ ] **Step 2: Update the startup warning**

Find (around line 232):
```typescript
  if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY not set — Slack classification will be skipped.');
  }
```

Replace with:
```typescript
  const activeAiProvider = ANTHROPIC_API_KEY ? 'Anthropic' : process.env.GEMINI_API_KEY ? 'Gemini' : null;
  if (!activeAiProvider) {
    console.warn('Warning: no AI key set (ANTHROPIC_API_KEY or GEMINI_API_KEY) — Slack classification will be skipped.');
  } else {
    console.log(`AI provider: ${activeAiProvider}`);
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
cd backend && npm test
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ai.service.ts backend/src/tests/ai.service.test.ts backend/src/index.ts .env.example backend/package.json backend/package-lock.json
git commit -m "feat: add Gemini fallback for Slack classification, Anthropic takes priority"
```
