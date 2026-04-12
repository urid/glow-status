// Implemented in Task 10
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiDataResponse } from '../types'

export function useRefresh() {
  const queryClient = useQueryClient()
  return useMutation<ApiDataResponse>({
    mutationFn: async () => {
      const res = await fetch('/api/refresh', { method: 'POST' })
      if (!res.ok) throw new Error('Refresh failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['data'], data)
    },
  })
}
