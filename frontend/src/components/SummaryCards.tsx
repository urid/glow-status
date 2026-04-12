import { useData } from '../hooks/useData'
import { useFiltersStore } from '../store/filters'
import { getStatusGroup, type StatusGroup } from '../lib/issues'

const GROUP_ORDER: StatusGroup[] = ['BLOCKED', 'IN DEV', 'IN QA', 'TODO', 'DONE']

const GROUP_STYLE: Record<StatusGroup, { bg: string; text: string; dot: string; bdr: string }> = {
  BLOCKED: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', bdr: '#fecaca' },
  'IN DEV': { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', bdr: '#bfdbfe' },
  'IN QA':  { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1', bdr: '#c7d2fe' },
  TODO:     { bg: '#f5f5f4', text: '#44403c', dot: '#78716c', bdr: '#d6d3d1' },
  DONE:     { bg: '#ecfdf5', text: '#065f46', dot: '#10b981', bdr: '#a7f3d0' },
}

const GROUP_ICON: Record<StatusGroup, string> = {
  BLOCKED: '🚫',
  'IN DEV': '⚡',
  'IN QA':  '🔍',
  TODO:     '📋',
  DONE:     '✅',
}

export default function SummaryCards() {
  const { data } = useData()
  const { statusGroups, toggleStatusGroup } = useFiltersStore()

  const counts: Record<StatusGroup, number> = {
    BLOCKED: 0, 'IN DEV': 0, 'IN QA': 0, TODO: 0, DONE: 0,
  }

  if (data) {
    const { GGS, CLPLG, SST2 } = data.snapshot.jiraData
    for (const issue of [...GGS, ...CLPLG, ...SST2]) {
      counts[getStatusGroup(issue.status)]++
    }
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {GROUP_ORDER.map((g) => {
        const st = GROUP_STYLE[g]
        const isSelected = statusGroups.includes(g)
        const isDimmed = statusGroups.length > 0 && !isSelected
        return (
          <div
            key={g}
            onClick={() => toggleStatusGroup(g)}
            style={{
              background: st.bg,
              border: `1px solid ${st.bdr}`,
              borderRadius: 12,
              padding: 12,
              cursor: 'pointer',
              opacity: isDimmed ? 0.5 : 1,
              outline: isSelected ? `2px solid ${st.dot}` : 'none',
              outlineOffset: 1,
              transition: 'all 0.15s',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 16 }}>{GROUP_ICON[g]}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: st.dot }}>{counts[g]}</span>
            </div>
            <span style={{ fontSize: 11, color: st.text, fontWeight: 600 }}>{g}</span>
          </div>
        )
      })}
    </div>
  )
}
