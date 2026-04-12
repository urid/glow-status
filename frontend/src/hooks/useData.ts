// Implemented in Task 10
import { useQuery } from '@tanstack/react-query'
import type { ApiDataResponse } from '../types'

export function useData() {
  return useQuery<ApiDataResponse>({
    queryKey: ['data'],
    queryFn: async () => {
      const res = await fetch('/api/data')
      if (!res.ok) throw new Error('Failed to fetch data')
      return res.json()
    },
  })
}
