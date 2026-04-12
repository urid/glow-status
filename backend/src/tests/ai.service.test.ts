// backend/src/tests/ai.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifySlackMessages } from '../services/ai.service.js';
import type { ChannelMessages } from '../services/slack.service.js';

// ── Anthropic mock ────────────────────────────────────────────────────────────

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

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
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Anthropic path
  it('uses Anthropic when anthropicKey is provided', async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([SAMPLE_ITEM]));

    const result = await classifySlackMessages({ anthropicKey: 'fake-key' }, SAMPLE_CHANNELS);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ ch: 'glow-server', sev: 'high', jira: 'GGS-123' });
  });

  it('calls Anthropic with claude-opus-4-6 model', async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([]));

    await classifySlackMessages({ anthropicKey: 'my-api-key' }, SAMPLE_CHANNELS);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-6' }),
    );
  });

  it('prefers Anthropic over Gemini when both keys are set', async () => {
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
    const item = { ...SAMPLE_ITEM, sev: 'UNKNOWN' };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse([item]));

    const result = await classifySlackMessages({ anthropicKey: 'key' }, SAMPLE_CHANNELS);
    expect(result[0].sev).toBe('info');
  });

  it('throws when response is not valid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all!!!' }],
    });

    await expect(
      classifySlackMessages({ anthropicKey: 'key' }, SAMPLE_CHANNELS)
    ).rejects.toThrow();
  });
});
