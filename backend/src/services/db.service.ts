// backend/src/services/db.service.ts
import { DatabaseSync } from 'node:sqlite';
import type { JiraData, SlackData, Snapshot } from '../types';

interface SnapshotRow {
  id: number;
  jira_data: string;
  slack_data: string;
  refreshed_at: string;
}

interface DismissedRow {
  pair_key: string;
}

interface LinkResultRow {
  pair_key: string;
  status: 'ok' | 'err';
}

export function createDbService(db: DatabaseSync) {
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
      const row = db.prepare('SELECT * FROM snapshots WHERE id = 1').get() as SnapshotRow | undefined;
      if (!row) return null;
      try {
        return {
          jiraData: JSON.parse(row.jira_data) as JiraData,
          slackData: JSON.parse(row.slack_data) as SlackData,
          refreshedAt: row.refreshed_at,
        };
      } catch {
        throw new Error('Snapshot data in database is corrupted and cannot be parsed');
      }
    },

    saveSnapshot(jiraData: JiraData, slackData: SlackData): void {
      db.prepare(`
        INSERT OR REPLACE INTO snapshots (id, jira_data, slack_data, refreshed_at)
        VALUES (1, ?, ?, ?)
      `).run(JSON.stringify(jiraData), JSON.stringify(slackData), new Date().toISOString());
    },

    getDismissed(): string[] {
      return (db.prepare('SELECT pair_key FROM dismissed_suggestions').all() as unknown as DismissedRow[])
        .map(r => r.pair_key);
    },

    addDismissed(pairKey: string): void {
      db.prepare('INSERT OR IGNORE INTO dismissed_suggestions (pair_key) VALUES (?)').run(pairKey);
    },

    removeDismissed(pairKey: string): void {
      db.prepare('DELETE FROM dismissed_suggestions WHERE pair_key = ?').run(pairKey);
    },

    getLinkResults(): Record<string, 'ok' | 'err'> {
      const rows = db.prepare('SELECT pair_key, status FROM link_results').all() as unknown as LinkResultRow[];
      return Object.fromEntries(rows.map(r => [r.pair_key, r.status]));
    },

    setLinkResult(pairKey: string, status: 'ok' | 'err'): void {
      db.prepare('INSERT OR REPLACE INTO link_results (pair_key, status) VALUES (?, ?)').run(pairKey, status);
    },
  };
}

export type DbService = ReturnType<typeof createDbService>;
