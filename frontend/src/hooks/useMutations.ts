import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiDataResponse } from '../types'

function updateData(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (prev: ApiDataResponse) => ApiDataResponse,
) {
  queryClient.setQueryData<ApiDataResponse>(['data'], (prev) => {
    if (!prev) return prev
    return updater(prev)
  })
}

// POST /api/links
export function useCreateLink() {
  const queryClient = useQueryClient()
  return useMutation<{ pairKey: string; status: 'ok' | 'err' }, Error, { fromKey: string; toKey: string }>({
    mutationFn: async ({ fromKey, toKey }) => {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromKey, toKey }),
      })
      if (!res.ok) throw new Error('Link creation failed')
      return res.json()
    },
    onSuccess: ({ pairKey, status }) => {
      updateData(queryClient, (prev) => ({
        ...prev,
        linkResults: { ...prev.linkResults, [pairKey]: status },
      }))
    },
  })
}

// POST /api/issues
export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation<{ newKey: string; linked: boolean }, Error, { fromKey: string; project: string; summary: string }>({
    mutationFn: async (body) => {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Issue creation failed')
      return res.json()
    },
    onSuccess: () => {
      // Invalidate to refetch fresh data with the new issue's link
      queryClient.invalidateQueries({ queryKey: ['data'] })
    },
  })
}

// POST /api/dismissed
export function useDismiss() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (pairKey) => {
      const res = await fetch('/api/dismissed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairKey }),
      })
      if (!res.ok) throw new Error('Dismiss failed')
    },
    onSuccess: (_data, pairKey) => {
      updateData(queryClient, (prev) => ({
        ...prev,
        dismissedSuggestions: [...prev.dismissedSuggestions, pairKey],
      }))
    },
  })
}

// DELETE /api/dismissed/:id
export function useUndismiss() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (pairKey) => {
      const res = await fetch(`/api/dismissed/${encodeURIComponent(pairKey)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Undismiss failed')
    },
    onSuccess: (_data, pairKey) => {
      updateData(queryClient, (prev) => ({
        ...prev,
        dismissedSuggestions: prev.dismissedSuggestions.filter((k) => k !== pairKey),
      }))
    },
  })
}
