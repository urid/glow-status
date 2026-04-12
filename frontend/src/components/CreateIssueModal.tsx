import { useState } from 'react'
import { useCreateIssue } from '../hooks/useMutations'
import type { JiraIssue } from '../types'
import type { CounterpartTarget } from '../lib/issues'
import { counterpartProject } from '../lib/issues'

const JIRA_BASE = 'https://tabtale.atlassian.net/browse/'

const PROJECT_COLORS: Record<string, { bg: string; text: string; bdr: string; acc: string }> = {
  GGS:   { bg: '#f0fdfa', text: '#115e59', bdr: '#14b8a6', acc: '#0d9488' },
  CLPLG: { bg: '#f5f3ff', text: '#5b21b6', bdr: '#8b5cf6', acc: '#7c3aed' },
  SST2:  { bg: '#fdf2f8', text: '#9d174d', bdr: '#ec4899', acc: '#db2777' },
}
const PROJECT_LABELS: Record<string, string> = {
  GGS: 'Server (GGS)', CLPLG: 'Plugin (CLPLG)', SST2: 'Game (SST2)',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; bdr: string }> = {
  'In QA':    { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1', bdr: '#c7d2fe' },
  'In Progress': { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', bdr: '#bfdbfe' },
  'To Do':    { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  BLOCKED:    { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', bdr: '#fecaca' },
}
function getStatusStyle(status: string) {
  return STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af', bdr: '#d1d5db' }
}
function getProjectStyle(key: string) {
  return PROJECT_COLORS[key.split('-')[0]] ?? { bg: '#f3f4f6', text: '#374151', bdr: '#6b7280', acc: '#6b7280' }
}

interface Props {
  issue: JiraIssue
  target: CounterpartTarget
  onClose: () => void
}

export default function CreateIssueModal({ issue, target, onClose }: Props) {
  const fromProject = issue.key.split('-')[0]
  const fromLabel = { GGS: 'Game Server', CLPLG: 'Plugin', SST2: 'Game' }[fromProject] ?? fromProject
  const targetProject = counterpartProject(target, fromProject)

  const [title, setTitle] = useState(`[${issue.key}] ${issue.summary}`)
  const [desc, setDesc] = useState(
    `Counterpart for ${issue.key} (${fromLabel}).\n\nOriginal: ${JIRA_BASE}${issue.key}\nSummary: ${issue.summary}\nStatus: ${issue.status}\nAssignee: ${issue.assignee}`
  )

  const createIssue = useCreateIssue()

  const pc = getProjectStyle(issue.key)
  const ss = getStatusStyle(issue.status)

  async function handleCreate() {
    createIssue.mutate({ fromKey: issue.key, project: targetProject, summary: title })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, width: 560, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Create Counterpart Issue</h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Source issue */}
        <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div className="flex items-center gap-2 text-sm mb-1">
            <span style={{ color: '#9ca3af', fontSize: 12 }}>Source:</span>
            <a href={`${JIRA_BASE}${issue.key}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: pc.acc, textDecoration: 'none', fontSize: 12 }}>{issue.key}</a>
            <span style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.bdr}`, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>
              <span style={{ background: ss.dot, width: 5, height: 5, borderRadius: '50%', display: 'inline-block' }} />
              {issue.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#475569' }}>{issue.summary}</div>
        </div>

        {/* Target project (read-only) */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Project</label>
          <div>
            {(() => {
              const tp = PROJECT_COLORS[targetProject]
              return (
                <span style={{ background: tp.bg, color: tp.acc, border: `2px solid ${tp.acc}`, borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'inline-block' }}>
                  {PROJECT_LABELS[targetProject] ?? targetProject}
                </span>
              )
            })()}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 14, color: '#1e293b', boxSizing: 'border-box' }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={5}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 13, color: '#1e293b', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {/* Result banner */}
        {createIssue.isSuccess && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: 13 }}>
            Created:{' '}
            <a href={`${JIRA_BASE}${createIssue.data.newKey}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {createIssue.data.newKey}
            </a>{' '}
            {createIssue.data.linked ? `(linked to ${issue.key})` : `(link to ${issue.key} failed — link manually)`}
          </div>
        )}
        {createIssue.isError && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: 13 }}>
            Error: {createIssue.error?.message}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {createIssue.isSuccess ? 'Close' : 'Cancel'}
          </button>
          {!createIssue.isSuccess && (
            <button
              onClick={handleCreate}
              disabled={createIssue.isPending}
              style={{ background: createIssue.isPending ? '#d1d5db' : 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: createIssue.isPending ? 'wait' : 'pointer' }}
            >
              {createIssue.isPending ? 'Creating...' : 'Create & Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
