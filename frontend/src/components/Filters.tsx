import { useState, useRef, useEffect } from 'react'
import { useData } from '../hooks/useData'
import { useFiltersStore } from '../store/filters'
import { useFilteredIssues } from '../hooks/useFilteredIssues'
import { getFeatureArea } from '../lib/issues'

const FEATURE_AREAS = [
  'Runway', 'Matchmaking', 'Bot', 'Friend', 'Gift', 'Auth',
  'Score', 'Dashboard', 'Notification', 'Push', 'Profile', 'Coupon', 'Other',
]

const PROJECT_LABELS: Record<string, string> = {
  GGS: 'Server (GGS)',
  CLPLG: 'Plugin (CLPLG)',
  SST2: 'Game (SST2)',
}

const STATUS_GROUP_STYLE: Record<string, { bg: string; text: string; bdr: string }> = {
  BLOCKED: { bg: '#fef2f2', text: '#991b1b', bdr: '#fecaca' },
  'IN DEV': { bg: '#eff6ff', text: '#1e40af', bdr: '#bfdbfe' },
  'IN QA':  { bg: '#eef2ff', text: '#3730a3', bdr: '#c7d2fe' },
  TODO:     { bg: '#f5f5f4', text: '#44403c', bdr: '#d6d3d1' },
  DONE:     { bg: '#ecfdf5', text: '#065f46', bdr: '#a7f3d0' },
}

function Dropdown({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onToggle])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}
      >
        {label}
        <span style={{ fontSize: 10, opacity: 0.4, marginLeft: 'auto' }}>▼</span>
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 50, minWidth: 180, padding: 4 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count?: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: selected ? '#f3f4f6' : 'transparent', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: selected ? 700 : 500, cursor: 'pointer', textAlign: 'left' }}
    >
      <span>{label}</span>
      {count !== undefined && <span style={{ color: '#9ca3af', fontSize: 11 }}>{count}</span>}
    </button>
  )
}

export default function Filters() {
  const { data } = useData()
  const filtered = useFilteredIssues()
  const { project, featureArea, statusGroups, search, setProject, setFeatureArea, toggleStatusGroup, clearStatusGroups, setSearch } = useFiltersStore()

  const [projOpen, setProjOpen] = useState(false)
  const [areaOpen, setAreaOpen] = useState(false)

  const allIssues = data
    ? [...data.snapshot.jiraData.GGS, ...data.snapshot.jiraData.CLPLG, ...data.snapshot.jiraData.SST2]
    : []

  const projCounts = { GGS: data?.snapshot.jiraData.GGS.length ?? 0, CLPLG: data?.snapshot.jiraData.CLPLG.length ?? 0, SST2: data?.snapshot.jiraData.SST2.length ?? 0 }

  const areaCounts = Object.fromEntries(
    FEATURE_AREAS.map((a) => [a, allIssues.filter((i) => getFeatureArea(i.summary) === a).length]),
  )


  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Project dropdown */}
      <Dropdown
        label={project ? PROJECT_LABELS[project] ?? project : 'All Projects'}
        isOpen={projOpen}
        onToggle={() => { setProjOpen((p) => !p); setAreaOpen(false) }}
      >
        <DropdownItem label="All Projects" count={allIssues.length} selected={!project} onClick={() => { setProject(null); setProjOpen(false) }} />
        {Object.entries(PROJECT_LABELS).map(([key, label]) => (
          <DropdownItem key={key} label={label} count={projCounts[key as keyof typeof projCounts]} selected={project === key} onClick={() => { setProject(key); setProjOpen(false) }} />
        ))}
      </Dropdown>

      {/* Feature area dropdown */}
      <Dropdown
        label={featureArea ?? 'All Areas'}
        isOpen={areaOpen}
        onToggle={() => { setAreaOpen((p) => !p); setProjOpen(false) }}
      >
        <DropdownItem label="All Areas" count={allIssues.length} selected={!featureArea} onClick={() => { setFeatureArea(null); setAreaOpen(false) }} />
        {FEATURE_AREAS.map((a) => (
          <DropdownItem key={a} label={a} count={areaCounts[a]} selected={featureArea === a} onClick={() => { setFeatureArea(a); setAreaOpen(false) }} />
        ))}
      </Dropdown>

      {/* Active status group chips */}
      {statusGroups.map((sg) => {
        const sgStyle = STATUS_GROUP_STYLE[sg]
        if (!sgStyle) return null
        return (
          <span key={sg} style={{ background: sgStyle.bg, color: sgStyle.text, border: `1px solid ${sgStyle.bdr}`, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {sg}
            <button onClick={() => toggleStatusGroup(sg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sgStyle.text, fontSize: 12, padding: 0, marginLeft: 2, lineHeight: 1 }}>✕</button>
          </span>
        )
      })}
      {statusGroups.length > 1 && (
        <button onClick={clearStatusGroups} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#6b7280' }}>
          Clear all
        </button>
      )}

      {/* Search */}
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: '#fff', color: '#1e293b', border: '1px solid #e5e7eb', borderRadius: 10, padding: '7px 14px', fontSize: 12, width: 160 }}
      />

      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
        {filtered.length} issues
      </span>
    </div>
  )
}
