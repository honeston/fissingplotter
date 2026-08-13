import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth() {
  const { loading, authenticated } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        読み込み中…
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
