import { BrowserRouter, NavLink, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { SyncStatusBanner } from './components/SyncStatusBanner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

function HistoryMapRedirect() {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams(searchParams)
  next.set('map', '1')
  return <Navigate to={`/history?${next.toString()}`} replace />
}

function AppShell() {
  const { authenticated, loading } = useAuth()
  const showNav = !loading && authenticated

  return (
    <div className="flex min-h-dvh flex-col">
      <SyncStatusBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/map" element={<HistoryMapRedirect />} />
        </Route>
      </Routes>
      {showNav && (
        <nav className="sticky bottom-0 border-t border-sky-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-md">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex min-h-12 flex-1 items-center justify-center text-sm font-medium ${
                  isActive ? 'text-cyan-800' : 'text-slate-400'
                }`
              }
            >
              記録
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex min-h-12 flex-1 items-center justify-center text-sm font-medium ${
                  isActive ? 'text-cyan-800' : 'text-slate-400'
                }`
              }
            >
              履歴
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
