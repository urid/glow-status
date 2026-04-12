// backend/src/tests/db.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createDbService } from '../services/db.service';

function makeDb() {
  const db = new DatabaseSync(':memory:');
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
