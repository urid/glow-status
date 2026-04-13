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
  const oldest = String(Math.floor(Date.now() / 1000) - 72 * 3600);
  const userCache = new Map<string, string>();

  async function resolveUser(userId: string): Promise<string> {
    if (userCache.has(userId)) return userCache.get(userId)!;
    try {
      const info = await client.users.info({ user: userId });
      const name = (info.user as any)?.real_name ?? userId;
      userCache.set(userId, name);
      return name;
    } catch (err: any) {
      console.warn(`Could not resolve user ${userId}:`, err?.data ?? err?.message ?? err);
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
    } catch (err: any) {
      console.error(`Slack error on #${ch.name} (${ch.id}):`, err?.data ?? err?.message ?? err);
    }
    return { channelId: ch.id, channelName: ch.name, messages, active: messages.length > 0 };
  }

  return Promise.all(CHANNELS.map(fetchChannel));
}
