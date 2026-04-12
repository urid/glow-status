// backend/src/services/jira.service.ts
import type { JiraData, JiraIssue, JiraIssueLink } from '../types';

const TRACKED_PROJECTS = ['GGS', 'CLPLG', 'SST2'];
const SST2_ACCOUNT_ID = '557058:0b20c326-8d11-41ef-8e7d-6651e435f006';

const DONE_CLAUSE = "(status != Done OR (status = Done AND resolved >= -7d))";

const QUERIES: Record<string, string> = {
  GGS: `project = GGS AND issuetype != Epic AND ${DONE_CLAUSE} ORDER BY status ASC, updated DESC`,
  CLPLG: `project = CLPLG AND issuetype != Epic AND ${DONE_CLAUSE} ORDER BY status ASC, updated DESC`,
  SST2: `project = SST2 AND issuetype != Epic AND (labels = server OR assignee = ${SST2_ACCOUNT_ID}) AND ${DONE_CLAUSE} ORDER BY status ASC, updated DESC`,
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
  const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`;
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
