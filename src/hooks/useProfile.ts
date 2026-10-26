import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/api/profile'
import { useAuth } from '@/auth/AuthProvider'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({ queryKey: ['profile', user?.id], queryFn: () => getProfile(user!.id), enabled: !!user })
}
