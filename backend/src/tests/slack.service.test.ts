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
  it('returns messages for all 6 channels', async () => {
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
