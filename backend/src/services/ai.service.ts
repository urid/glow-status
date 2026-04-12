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
