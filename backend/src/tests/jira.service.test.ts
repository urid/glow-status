// backend/src/tests/jira.service.test.ts
import { describe, it, expect } from 'vitest';
import { transformIssue, deduplicateByKey } from '../services/jira.service';

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
    expect(result).not.toBeNull();
    expect(result!.key).toBe('GGS-1');
    expect(result!.status).toBe('In Progress');
    expect(result!.assignee).toBe('Alice');
    expect(result!.type).toBe('Story');
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
    expect(transformIssue(raw)!.assignee).toBe('Unassigned');
  });

  it('filters issue links to only GGS/CLPLG/SST2 keys', () => {
    const raw = {
      key: 'GGS-3',
      fields: {
        summary: 'x', status: { name: 'To Do' },
        issuetype: { name: 'Bug' }, priority: { name: 'Minor' },
        assignee: null,
        issuelinks: [
          { type: { outward: 'relates to', inward: 'is related to' }, outwardIssue: { key: 'CLPLG-5' } },
          { type: { outward: 'relates to', inward: 'is related to' }, outwardIssue: { key: 'TAC-99' } },
          { type: { inward: 'is blocked by', outward: 'blocks' }, inwardIssue: { key: 'SST2-10' } },
        ],
      },
    };
    const links = transformIssue(raw)!.links;
    expect(links).toHaveLength(2);
    expect(links.map(l => l.key)).toContain('CLPLG-5');
    expect(links.map(l => l.key)).toContain('SST2-10');
    expect(links.map(l => l.key)).not.toContain('TAC-99');
  });

  it('returns null for Epic issue type', () => {
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
