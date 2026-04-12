import { useMemo } from 'react'
import { useData } from './useData'
import { useFiltersStore } from '../store/filters'
import { getFeatureArea, getStatusGroup, sortIssues } from '../lib/issues'
import type { JiraIssue } from '../types'

export function useFilteredIssues(): JiraIssue[] {
  const { data } = useData()
  const { project, featureArea, statusGroups, search } = useFiltersStore()

  return useMemo(() => {
    if (!data) return []

    const { GGS, CLPLG, SST2 } = data.snapshot.jiraData
    let all = [...GGS, ...CLPLG, ...SST2]

    if (project) {
      all = all.filter((i) => i.key.startsWith(project + '-'))
    }
    if (featureArea) {
      all = all.filter((i) => getFeatureArea(i.summary) === featureArea)
    }
    if (statusGroups.length > 0) {
      all = all.filter((i) => statusGroups.includes(getStatusGroup(i.status)))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      all = all.filter(
        (i) => i.key.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q),
      )
    }

    return sortIssues(all)
  }, [data, project, featureArea, statusGroups, search])
}
