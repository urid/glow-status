import { describe, it, expect } from 'vitest'
import {
  getFeatureArea,
  getStatusGroup,
  getStatusGroupSort,
  sortIssues,
  computeLinkSuggestions,
  getCounterpartTargets,
  counterpartProject,
} from './issues'
import type { JiraIssue } from '../types'

function makeIssue(key: string, summary: string, status = 'To Do', links: JiraIssue['links'] = []): JiraIssue {
  return { key, summary, status, links, type: 'Story', priority: 'Medium', assignee: 'Alice' }
}

// ── Feature Area Detection ────────────────────────────────────────────────────

describe('getFeatureArea', () => {
  it.each([
    ['Add runway support', 'Runway'],
    ['Fix matchmaking lag', 'Matchmaking'],
    ['Bot detection logic', 'Bot'],
    ['Friend list empty', 'Friend'],
    ['Gift sending fails', 'Gift'],
    ['Auth token expiry', 'Auth'],
    ['Score calculation wrong', 'Score'],
    ['Dashboard loading slow', 'Dashboard'],
    ['Push notification broken', 'Notification'],
    ['Push badge missing', 'Push'],
    ['Profile image upload', 'Profile'],
    ['Coupon redemption error', 'Coupon'],
    ['Random unrelated issue', 'Other'],
  ])('"%s" → %s', (summary, expected) => {
    expect(getFeatureArea(summary)).toBe(expected)
  })

  it('returns first match in priority order (runway before matchmaking)', () => {
    expect(getFeatureArea('runway matchmaking overlap')).toBe('Runway')
  })

  it('is case-insensitive', () => {
    expect(getFeatureArea('MATCHMAKING BUG')).toBe('Matchmaking')
  })
})

// ── Status Groups ─────────────────────────────────────────────────────────────

describe('getStatusGroup', () => {
  it.each([
    ['BLOCKED', 'BLOCKED'],
    ['in DEV', 'IN DEV'],
    ['In Progress', 'IN DEV'],
    ['In progress', 'IN DEV'],
    ['Code Review', 'IN DEV'],
    ['Ready For Review', 'IN DEV'],
    ['In QA', 'IN QA'],
    ['Pending QA', 'IN QA'],
    ['To Do', 'TODO'],
    ['TO DO', 'TODO'],
    ['BACKLOG', 'TODO'],
    ['Ready For Dev', 'TODO'],
    ['Done', 'DONE'],
    ['pending deployment', 'DONE'],
    ['Unknown Status', 'TODO'],
  ] as const)('"%s" → %s', (status, group) => {
    expect(getStatusGroup(status)).toBe(group)
  })
})

describe('getStatusGroupSort', () => {
  it('BLOCKED sorts before IN DEV before IN QA before TODO before DONE', () => {
    expect(getStatusGroupSort('BLOCKED')).toBeLessThan(getStatusGroupSort('IN DEV'))
    expect(getStatusGroupSort('IN DEV')).toBeLessThan(getStatusGroupSort('IN QA'))
    expect(getStatusGroupSort('IN QA')).toBeLessThan(getStatusGroupSort('TODO'))
    expect(getStatusGroupSort('TODO')).toBeLessThan(getStatusGroupSort('DONE'))
  })
})

describe('sortIssues', () => {
  it('sorts by status group order', () => {
    const issues = [
      makeIssue('GGS-1', 'A', 'Done'),
      makeIssue('GGS-2', 'B', 'BLOCKED'),
      makeIssue('GGS-3', 'C', 'In QA'),
      makeIssue('GGS-4', 'D', 'In Progress'),
    ]
    const sorted = sortIssues(issues)
    expect(sorted.map((i) => i.key)).toEqual(['GGS-2', 'GGS-4', 'GGS-3', 'GGS-1'])
  })

  it('does not mutate original array', () => {
    const issues = [makeIssue('GGS-1', 'A', 'Done'), makeIssue('GGS-2', 'B', 'BLOCKED')]
    sortIssues(issues)
    expect(issues[0].key).toBe('GGS-1')
  })
})

// ── Link Suggestion Algorithm ─────────────────────────────────────────────────

describe('computeLinkSuggestions', () => {
  it('suggests cross-project pairs with ≥2 shared words', () => {
    const issues = [
      makeIssue('GGS-1', 'matchmaking queue timeout fix'),
      makeIssue('CLPLG-1', 'matchmaking queue latency issue'),
    ]
    const suggestions = computeLinkSuggestions(issues, [], {})
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].fromKey).toBe('GGS-1')
    expect(suggestions[0].toKey).toBe('CLPLG-1')
    expect(suggestions[0].sharedWords).toContain('matchmaking')
    expect(suggestions[0].sharedWords).toContain('queue')
  })

  it('does not suggest same-project pairs', () => {
    const issues = [
      makeIssue('GGS-1', 'runway score issue problem'),
      makeIssue('GGS-2', 'runway score bug problem'),
    ]
    expect(computeLinkSuggestions(issues, [], {})).toHaveLength(0)
  })

  it('does not suggest issues that already have links', () => {
    const issues = [
      makeIssue('GGS-1', 'runway score timeout crash', 'To Do', [{ type: 'relates', key: 'CLPLG-99' }]),
      makeIssue('CLPLG-1', 'runway score latency crash'),
    ]
    expect(computeLinkSuggestions(issues, [], {})).toHaveLength(0)
  })

  it('skips dismissed pairs', () => {
    const issues = [
      makeIssue('GGS-1', 'runway score timeout crash'),
      makeIssue('CLPLG-1', 'runway score latency crash'),
    ]
    expect(computeLinkSuggestions(issues, ['GGS-1-CLPLG-1'], {})).toHaveLength(0)
  })

  it('skips pairs already successfully linked', () => {
    const issues = [
      makeIssue('GGS-1', 'runway score timeout crash'),
      makeIssue('CLPLG-1', 'runway score latency crash'),
    ]
    expect(computeLinkSuggestions(issues, [], { 'GGS-1-CLPLG-1': 'ok' })).toHaveLength(0)
  })

  it('requires at least 2 shared meaningful words', () => {
    const issues = [
      makeIssue('GGS-1', 'runway only one shared word xyz'),
      makeIssue('CLPLG-1', 'runway completely different abc'),
    ]
    expect(computeLinkSuggestions(issues, [], {})).toHaveLength(0)
  })

  it('ignores stopwords in comparison', () => {
    const issues = [
      makeIssue('GGS-1', 'the in for to of and'),
      makeIssue('CLPLG-1', 'the in for to of and'),
    ]
    expect(computeLinkSuggestions(issues, [], {})).toHaveLength(0)
  })
})

// ── Counterpart Button Rules ──────────────────────────────────────────────────

describe('getCounterpartTargets', () => {
  it('SST2 shows both Server and Plugin when no links', () => {
    const issue = makeIssue('SST2-1', 'test')
    expect(getCounterpartTargets(issue)).toEqual(['Server', 'Plugin'])
  })

  it('SST2 hides Server if already linked to GGS', () => {
    const issue = makeIssue('SST2-1', 'test', 'To Do', [{ type: 'relates', key: 'GGS-5' }])
    expect(getCounterpartTargets(issue)).toEqual(['Plugin'])
  })

  it('SST2 hides Plugin if already linked to CLPLG', () => {
    const issue = makeIssue('SST2-1', 'test', 'To Do', [{ type: 'relates', key: 'CLPLG-5' }])
    expect(getCounterpartTargets(issue)).toEqual(['Server'])
  })

  it('SST2 shows nothing if linked to both GGS and CLPLG', () => {
    const issue = makeIssue('SST2-1', 'test', 'To Do', [
      { type: 'relates', key: 'GGS-5' },
      { type: 'relates', key: 'CLPLG-5' },
    ])
    expect(getCounterpartTargets(issue)).toEqual([])
  })

  it('CLPLG shows Server when no GGS link', () => {
    const issue = makeIssue('CLPLG-1', 'test')
    expect(getCounterpartTargets(issue)).toEqual(['Server'])
  })

  it('CLPLG shows nothing if already linked to GGS', () => {
    const issue = makeIssue('CLPLG-1', 'test', 'To Do', [{ type: 'relates', key: 'GGS-5' }])
    expect(getCounterpartTargets(issue)).toEqual([])
  })

  it('GGS shows Plugin when no CLPLG link', () => {
    const issue = makeIssue('GGS-1', 'test')
    expect(getCounterpartTargets(issue)).toEqual(['Plugin'])
  })

  it('GGS shows nothing if already linked to CLPLG', () => {
    const issue = makeIssue('GGS-1', 'test', 'To Do', [{ type: 'relates', key: 'CLPLG-5' }])
    expect(getCounterpartTargets(issue)).toEqual([])
  })
})

describe('counterpartProject', () => {
  it('Server → GGS', () => expect(counterpartProject('Server', 'SST2')).toBe('GGS'))
  it('Plugin → CLPLG', () => expect(counterpartProject('Plugin', 'GGS')).toBe('CLPLG'))
})
