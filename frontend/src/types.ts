// Mirrors backend/src/types.ts — source of truth is the backend

export interface JiraIssueLink {
  type: string
  key: string
}

export interface JiraIssue {
  key: string
  type: string
  status: string
  priority: string
  assignee: string
  summary: string
  links: JiraIssueLink[]
}

export interface JiraData {
  GGS: JiraIssue[]
  CLPLG: JiraIssue[]
  SST2: JiraIssue[]
}

export interface SlackChannel {
  id: string
  name: string
  active: boolean
}

export interface SlackItem {
  ch: string
  sev: 'critical' | 'high' | 'medium' | 'info'
  title: string
  desc: string
  who: string | null
  jira: string | null
  owner: string | null
  action: string | null
  done: boolean
  resolution: string | null
}

export interface SlackData {
  channels: SlackChannel[]
  items: SlackItem[]
}

export interface Snapshot {
  jiraData: JiraData
  slackData: SlackData
  refreshedAt: string | null
}

export interface ApiDataResponse {
  snapshot: Snapshot
  dismissedSuggestions: string[]
  linkResults: Record<string, 'ok' | 'err'>
}
