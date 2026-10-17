import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

function FullScreenSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div
        className="size-6 animate-spin rounded-full border-2 border-border border-t-brand"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

/** Redirects anonymous users to /login, preserving where they wanted to go. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Sends already-authenticated users away from /login and /signup. */
export function GuestRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
