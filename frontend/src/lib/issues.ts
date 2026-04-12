import type { JiraIssue } from '../types'

// ── Feature Area Detection ────────────────────────────────────────────────────

const FEATURE_AREA_KEYWORDS: [string, string][] = [
  ['runway', 'Runway'],
  ['matchmaking', 'Matchmaking'],
  ['bot', 'Bot'],
  ['friend', 'Friend'],
  ['gift', 'Gift'],
  ['auth', 'Auth'],
  ['score', 'Score'],
  ['dashboard', 'Dashboard'],
  ['notification', 'Notification'],
  ['push', 'Push'],
  ['profile', 'Profile'],
  ['coupon', 'Coupon'],
]

export function getFeatureArea(summary: string): string {
  const lower = summary.toLowerCase()
  for (const [keyword, label] of FEATURE_AREA_KEYWORDS) {
    if (lower.includes(keyword)) return label
  }
  return 'Other'
}

// ── Status Groups ─────────────────────────────────────────────────────────────

export type StatusGroup = 'BLOCKED' | 'IN DEV' | 'IN QA' | 'TODO' | 'DONE'

const STATUS_GROUP_MAP: Record<string, StatusGroup> = {
  BLOCKED: 'BLOCKED',
  'in DEV': 'IN DEV',
  'In Progress': 'IN DEV',
  'In progress': 'IN DEV',
  'Code Review': 'IN DEV',
  'Ready For Review': 'IN DEV',
  'In QA': 'IN QA',
  'Pending QA': 'IN QA',
  'To Do': 'TODO',
  'TO DO': 'TODO',
  BACKLOG: 'TODO',
  'Ready For Dev': 'TODO',
  Done: 'DONE',
  'pending deployment': 'DONE',
}

const STATUS_GROUP_SORT: Record<StatusGroup, number> = {
  BLOCKED: 1,
  'IN DEV': 2,
  'IN QA': 3,
  TODO: 4,
  DONE: 5,
}

export function getStatusGroup(status: string): StatusGroup {
  return STATUS_GROUP_MAP[status] ?? 'TODO'
}

export function getStatusGroupSort(group: StatusGroup): number {
  return STATUS_GROUP_SORT[group]
}

export function sortIssues(issues: JiraIssue[]): JiraIssue[] {
  return [...issues].sort((a, b) => {
    const ga = getStatusGroup(a.status)
    const gb = getStatusGroup(b.status)
    return getStatusGroupSort(ga) - getStatusGroupSort(gb)
  })
}

// ── Link Suggestion Algorithm ─────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'for', 'to', 'of', 'and', 'or',
  'from', 'with', 'should', 'be', 'not', 'it', 'when', 'if', 'can', 'need', 'this',
])

function meaningfulWords(summary: string): Set<string> {
  return new Set(
    summary
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  )
}

export interface LinkSuggestion {
  fromKey: string
  toKey: string
  sharedWords: string[]
}

/** Returns pairs of unlinked cross-project issues with ≥2 shared meaningful words */
export function computeLinkSuggestions(
  issues: JiraIssue[],
  dismissed: string[],
  linkResults: Record<string, 'ok' | 'err'>,
): LinkSuggestion[] {
  const dismissedSet = new Set(dismissed)
  const unlinked = issues.filter((i) => i.links.length === 0)

  const suggestions: LinkSuggestion[] = []
  const seen = new Set<string>()

  for (let i = 0; i < unlinked.length; i++) {
    for (let j = i + 1; j < unlinked.length; j++) {
      const a = unlinked[i]
      const b = unlinked[j]

      // Must be cross-project
      const projA = a.key.split('-')[0]
      const projB = b.key.split('-')[0]
      if (projA === projB) continue

      const pairKey = `${a.key}-${b.key}`
      const pairKeyRev = `${b.key}-${a.key}`

      if (dismissedSet.has(pairKey) || dismissedSet.has(pairKeyRev)) continue
      if (linkResults[pairKey] === 'ok' || linkResults[pairKeyRev] === 'ok') continue
      if (seen.has(pairKey) || seen.has(pairKeyRev)) continue

      const wordsA = meaningfulWords(a.summary)
      const wordsB = meaningfulWords(b.summary)
      const shared = [...wordsA].filter((w) => wordsB.has(w))

      if (shared.length >= 2) {
        seen.add(pairKey)
        suggestions.push({ fromKey: a.key, toKey: b.key, sharedWords: shared })
      }
    }
  }

  return suggestions
}

// ── Counterpart Button Rules ──────────────────────────────────────────────────

export type CounterpartTarget = 'Server' | 'Plugin'

export function getCounterpartTargets(issue: JiraIssue): CounterpartTarget[] {
  const proj = issue.key.split('-')[0]
  const linkedProjects = issue.links.map((l) => l.key.split('-')[0])

  if (proj === 'SST2') {
    const targets: CounterpartTarget[] = []
    if (!linkedProjects.includes('GGS')) targets.push('Server')
    if (!linkedProjects.includes('CLPLG')) targets.push('Plugin')
    return targets
  }
  if (proj === 'CLPLG') {
    return linkedProjects.includes('GGS') ? [] : ['Server']
  }
  if (proj === 'GGS') {
    return linkedProjects.includes('CLPLG') ? [] : ['Plugin']
  }
  return []
}

export function counterpartProject(target: CounterpartTarget, fromProject: string): string {
  if (target === 'Server') return 'GGS'
  if (target === 'Plugin') return 'CLPLG'
  return fromProject
}
