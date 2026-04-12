import { useData } from '../hooks/useData'
import type { SlackItem } from '../types'

const JIRA_BASE = 'https://tabtale.atlassian.net/browse/'

const SEV_COLORS: Record<SlackItem['sev'], { bg: string; text: string; dot: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  high:     { bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
  medium:   { bg: '#fffbeb', text: '#92400e', dot: '#eab308' },
  info:     { bg: '#f0fdf4', text: '#166534', dot: '#22c55e' },
}

export default function SlackSection() {
  const { data } = useData()

  if (!data) return null

  const { channels, items } = data.snapshot.slackData
  const activeChannels = channels.filter((c) => c.active)
  const quietCount = channels.filter((c) => !c.active).length
  const openCount = items.filter((x) => !x.done).length

  return (
    <div className="pb-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span style={{ fontSize: 15 }}>💬</span>
        <h2 style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Slack Intelligence (24h)
        </h2>
        <div className="flex gap-1 ml-2 flex-wrap">
          {activeChannels.map((c) => (
            <span key={c.id} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
              #{c.name}
            </span>
          ))}
        </div>
        {quietCount > 0 && (
          <span style={{ color: '#d1d5db', fontSize: 10 }}>{quietCount} quiet</span>
        )}
        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
          {openCount} open / {items.length} total
        </span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            No Slack items — refresh to fetch latest messages
          </div>
        )}
        {items.map((item, i) => {
          const sc = SEV_COLORS[item.sev] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' }
          return (
            <div
              key={i}
              style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', opacity: item.done ? 0.55 : 1 }}
            >
              <div className="flex items-start gap-3">
                {/* Done/severity indicator */}
                <div style={{ marginTop: 3, flexShrink: 0 }}>
                  {item.done ? (
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #10b981', background: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>✓</span>
                  ) : (
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: sc.dot, marginTop: 1, marginLeft: 3 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.done ? '#9ca3af' : '#1e293b' }}>
                      {item.title}
                    </span>
                    {item.done && (
                      <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 12, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>Done</span>
                    )}
                    {!item.done && (item.sev === 'critical' || item.sev === 'high') && (
                      <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.dot}33`, borderRadius: 12, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>Open</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: item.done ? '#b0b0b0' : '#6b7280', margin: '0 0 6px', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 11 }}>
                    <span style={{ color: '#9ca3af' }}>#{item.ch}</span>
                    {item.who && <span style={{ color: '#6b7280' }}>— {item.who}</span>}
                    {item.jira && (
                      <a href={`${JIRA_BASE}${item.jira}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', color: '#7c3aed', fontWeight: 700, textDecoration: 'none', fontSize: 11 }}>
                        {item.jira}
                      </a>
                    )}
                    {item.owner && !item.done && (
                      <span style={{ color: '#3730a3', fontWeight: 600 }}>
                        → {item.owner}{item.action ? `: ${item.action}` : ''}
                      </span>
                    )}
                    {item.done && item.resolution && (
                      <span style={{ color: '#059669', fontStyle: 'italic' }}>✓ {item.resolution}</span>
                    )}
                  </div>
                </div>

                {/* Severity badge */}
                <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.dot}33`, borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0, letterSpacing: '0.05em' }}>
                  {item.sev}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
