import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useFilteredIssues } from '../hooks/useFilteredIssues'
import IssueCard from './IssueCard'
import CreateIssueModal from './CreateIssueModal'
import type { JiraIssue } from '../types'
import type { CounterpartTarget } from '../lib/issues'

export default function IssueList() {
  const { data } = useData()
  const filtered = useFilteredIssues()
  const [modal, setModal] = useState<{ issue: JiraIssue; target: CounterpartTarget } | null>(null)

  const allIssues = data
    ? [...data.snapshot.jiraData.GGS, ...data.snapshot.jiraData.CLPLG, ...data.snapshot.jiraData.SST2]
    : []

  // Issues that appear in a link result (were linked)
  const linkedKeys = new Set(
    Object.entries(data?.linkResults ?? {})
      .filter(([, v]) => v === 'ok')
      .flatMap(([k]) => k.split('-').slice(0, 2).join('-'))
  )

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {filtered.map((issue, i) => (
          <div key={issue.key} style={i > 0 ? { borderTop: '1px solid #f3f4f6' } : {}}>
            <IssueCard
              issue={issue}
              allIssues={allIssues}
              isLinked={linkedKeys.has(issue.key)}
              onCreateCounterpart={(iss, target) => setModal({ issue: iss, target })}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            No issues match your filters
          </div>
        )}
      </div>

      {modal && (
        <CreateIssueModal
          issue={modal.issue}
          target={modal.target}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
