import { useData } from '../hooks/useData'
import { useCreateLink, useDismiss } from '../hooks/useMutations'
import { computeLinkSuggestions } from '../lib/issues'

const JIRA_BASE = 'https://tabtale.atlassian.net/browse/'

const PROJECT_ACC: Record<string, string> = {
  GGS: '#0d9488', CLPLG: '#7c3aed', SST2: '#db2777',
}
const PROJECT_BG: Record<string, string> = {
  GGS: '#f0fdfa', CLPLG: '#f5f3ff', SST2: '#fdf2f8',
}

function acc(key: string) {
  return PROJECT_ACC[key.split('-')[0]] ?? '#6b7280'
}

export default function LinkSuggestions() {
  const { data } = useData()
  const createLink = useCreateLink()
  const dismiss = useDismiss()

  if (!data) return null

  const allIssues = [
    ...data.snapshot.jiraData.GGS,
    ...data.snapshot.jiraData.CLPLG,
    ...data.snapshot.jiraData.SST2,
  ]

  const issueMap = Object.fromEntries(allIssues.map((i) => [i.key, i]))
  const suggestions = computeLinkSuggestions(allIssues, data.dismissedSuggestions, data.linkResults)

  if (suggestions.length === 0) return null

  return (
    <details open style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
      <summary style={{ padding: 14, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
        💡 {suggestions.length} link suggestion{suggestions.length > 1 ? 's' : ''}
      </summary>
      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((s) => {
          const pairKey = `${s.fromKey}-${s.toKey}`
          const busy = createLink.isPending && (createLink.variables as { fromKey: string })?.fromKey === s.fromKey
          const fromIssue = issueMap[s.fromKey]
          const toIssue = issueMap[s.toKey]

          return (
            <div
              key={pairKey}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #fde68a', fontSize: 12 }}
            >
              <a
                href={`${JIRA_BASE}${s.fromKey}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: acc(s.fromKey), textDecoration: 'none', flexShrink: 0 }}
              >
                {s.fromKey}
              </a>
              <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                {fromIssue?.summary}
              </span>
              <span style={{ color: '#d97706', flexShrink: 0 }}>⟷</span>
              <a
                href={`${JIRA_BASE}${s.toKey}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: acc(s.toKey), textDecoration: 'none', flexShrink: 0 }}
              >
                {s.toKey}
              </a>
              <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                {toIssue?.summary}
              </span>
              <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => dismiss.mutate(pairKey)}
                  style={{ background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Dismiss
                </button>
                <button
                  onClick={() => createLink.mutate({ fromKey: s.fromKey, toKey: s.toKey })}
                  disabled={busy}
                  style={{ background: busy ? '#e5e7eb' : '#7c3aed', color: busy ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {busy ? 'Linking...' : '🔗 Link in JIRA'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}
