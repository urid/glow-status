import type { JiraIssue, JiraIssueLink } from '../types'
import { getCounterpartTargets, type CounterpartTarget } from '../lib/issues'

const JIRA_BASE = 'https://tabtale.atlassian.net/browse/'

const PRIORITY_EMOJI: Record<string, string> = {
  Blocker: '🔴', Critical: '🟠', Major: '🟡', Medium: '🟢', Minor: '🔵', Trivial: '⚪',
}

const PROJECT_COLORS: Record<string, { bg: string; text: string; bdr: string; acc: string }> = {
  GGS:   { bg: '#f0fdfa', text: '#115e59', bdr: '#14b8a6', acc: '#0d9488' },
  CLPLG: { bg: '#f5f3ff', text: '#5b21b6', bdr: '#8b5cf6', acc: '#7c3aed' },
  SST2:  { bg: '#fdf2f8', text: '#9d174d', bdr: '#ec4899', acc: '#db2777' },
}

const PROJECT_LABELS: Record<string, string> = {
  GGS: 'Server', CLPLG: 'Plugin', SST2: 'Game',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; bdr: string }> = {
  Done:                  { bg: '#ecfdf5', text: '#065f46', dot: '#10b981', bdr: '#a7f3d0' },
  'In QA':               { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1', bdr: '#c7d2fe' },
  'Pending QA':          { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1', bdr: '#c7d2fe' },
  'Code Review':         { bg: '#faf5ff', text: '#6b21a8', dot: '#a855f7', bdr: '#e9d5ff' },
  'Ready For Review':    { bg: '#faf5ff', text: '#6b21a8', dot: '#a855f7', bdr: '#e9d5ff' },
  'in DEV':              { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', bdr: '#bfdbfe' },
  'In Progress':         { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', bdr: '#bfdbfe' },
  'In progress':         { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', bdr: '#bfdbfe' },
  'pending deployment':  { bg: '#ecfdf5', text: '#065f46', dot: '#10b981', bdr: '#a7f3d0' },
  'Ready For Dev':       { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  'TO DO':               { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  'To Do':               { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  BACKLOG:               { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  BLOCKED:               { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', bdr: '#fecaca' },
}

function getStatusColors(status: string) {
  return STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af', bdr: '#d1d5db' }
}

function getProjectColors(key: string) {
  const proj = key.split('-')[0]
  return PROJECT_COLORS[proj] ?? { bg: '#f3f4f6', text: '#374151', bdr: '#6b7280', acc: '#6b7280' }
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatusColors(status)
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.bdr}`, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
      <span style={{ background: s.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
      {status}
    </span>
  )
}

function ProjectBadge({ issueKey }: { issueKey: string }) {
  const proj = issueKey.split('-')[0]
  const s = getProjectColors(issueKey)
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.bdr}44`, display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
      {PROJECT_LABELS[proj] ?? proj}
    </span>
  )
}

function LinkBadge({ link, allIssues }: { link: JiraIssueLink; allIssues: JiraIssue[] }) {
  const s = getProjectColors(link.key)
  const linked = allIssues.find((i) => i.key === link.key)
  const ls = linked ? getStatusColors(linked.status) : null
  return (
    <a
      href={`${JIRA_BASE}${link.key}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.bdr}44`, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, textDecoration: 'none' }}
    >
      <span style={{ opacity: 0.5 }}>{link.type}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{link.key}</span>
      {ls && linked && (
        <span style={{ background: ls.bg, color: ls.text, border: `1px solid ${ls.bdr}`, borderRadius: 10, padding: '0 5px', fontSize: 10, marginLeft: 2 }}>
          {linked.status}
        </span>
      )}
    </a>
  )
}

interface IssueCardProps {
  issue: JiraIssue
  allIssues: JiraIssue[]
  isLinked: boolean
  onCreateCounterpart: (issue: JiraIssue, target: CounterpartTarget) => void
}

export default function IssueCard({ issue, allIssues, isLinked, onCreateCounterpart }: IssueCardProps) {
  const proj = issue.key.split('-')[0]
  const pc = getProjectColors(issue.key)
  const crossLinks = issue.links.filter((l) => ['GGS', 'CLPLG', 'SST2'].includes(l.key.split('-')[0]))
  const counterpartTargets = getCounterpartTargets(issue)

  return (
    <div
      className="group flex flex-col gap-2 px-4 py-3 transition-colors"
      style={{
        borderLeft: isLinked ? `3px solid ${pc.acc}` : '3px solid transparent',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span style={{ fontSize: 14 }}>{PRIORITY_EMOJI[issue.priority] ?? '⚪'}</span>
          <a
            href={`${JIRA_BASE}${issue.key}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: pc.acc, textDecoration: 'none', flexShrink: 0 }}
          >
            {issue.key}
          </a>
          <ProjectBadge issueKey={issue.key} />
          <span style={{ fontSize: 14, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {issue.summary}
          </span>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      <div className="flex items-center gap-3 pl-6" style={{ fontSize: 12 }}>
        <span style={{ color: '#9ca3af' }}>{issue.assignee}</span>
        <span style={{ color: '#d1d5db' }}>•</span>
        <span style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{issue.type}</span>

        {crossLinks.length > 0 && (
          <>
            <span style={{ color: '#d1d5db' }}>•</span>
            <div className="flex items-center gap-1 flex-wrap">
              {crossLinks.map((l, i) => (
                <LinkBadge key={i} link={l} allIssues={allIssues} />
              ))}
            </div>
          </>
        )}

        {counterpartTargets.length > 0 && (
          <>
            <span style={{ color: '#d1d5db' }}>•</span>
            <div className="flex items-center gap-1">
              {counterpartTargets.map((target) => {
                const targetProj = target === 'Server' ? 'GGS' : 'CLPLG'
                const tp = PROJECT_COLORS[targetProj]
                return (
                  <button
                    key={target}
                    onClick={() => onCreateCounterpart(issue, target)}
                    style={{ background: tp.bg, color: tp.acc, border: `1px solid ${tp.bdr}44`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: '16px' }}
                  >
                    + {target}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
