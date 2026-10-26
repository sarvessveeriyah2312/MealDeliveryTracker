import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { FullScreenSpinner } from '@/components/Spinner'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenSpinner />
  // Keep search + hash: a failed magic link returns its error there and the login page shows it.
  if (!session)
    return <Navigate to={{ pathname: '/login', search: location.search, hash: location.hash }} replace state={{ from: location.pathname }} />
  return <Outlet />
}
