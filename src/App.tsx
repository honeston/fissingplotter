import { useEffect } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { SyncStatusBanner } from './components/SyncStatusBanner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { isPublicContentPath } from './legal/meta'
import { ChangeEmailPage } from './pages/ChangeEmailPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { DeleteAccountPage } from './pages/DeleteAccountPage'
import { FishEncyclopediaPage } from './pages/FishEncyclopediaPage'
import { FishEncyclopediaSpeciesPage } from './pages/FishEncyclopediaSpeciesPage'
import { GuidePage } from './pages/GuidePage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { LegalPage } from './pages/LegalPage'
import { LoginPage } from './pages/LoginPage'
import { MyPage } from './pages/MyPage'
import { MyTacklePage } from './pages/MyTacklePage'

function scrollWindowToTop() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    scrollWindowToTop()
  }, [pathname])
  return null
}

function HistoryMapRedirect() {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams(searchParams)
  next.delete('map')
  const query = next.toString()
  return <Navigate to={query ? `/history?${query}` : '/history'} replace />
}

function AuthLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
      読み込み中…
    </div>
  )
}

function RootPage() {
  const { loading, authenticated, cloudEnabled } = useAuth()

  if (!cloudEnabled) {
    return <HomePage />
  }
  if (loading) {
    return <AuthLoading />
  }
  if (!authenticated) {
    return <LandingPage />
  }
  return <HomePage />
}

function AppShell() {
  const { authenticated, loading } = useAuth()
  const { pathname } = useLocation()
  const isPublicContent = isPublicContentPath(pathname)
  const showNav = !loading && authenticated && !isPublicContent

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <SyncStatusBanner />
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route element={<RequireAuth />}>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/map" element={<HistoryMapRedirect />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/mypage/tackle" element={<MyTacklePage />} />
          <Route path="/mypage/email" element={<ChangeEmailPage />} />
          <Route path="/mypage/password" element={<ChangePasswordPage />} />
          <Route path="/mypage/delete-account" element={<DeleteAccountPage />} />
          <Route path="/mypage/encyclopedia" element={<FishEncyclopediaPage />} />
          <Route
            path="/mypage/encyclopedia/:species"
            element={<FishEncyclopediaSpeciesPage />}
          />
        </Route>
      </Routes>
      {showNav && (
        <nav className="sticky bottom-0 border-t border-sky-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-md">
            <NavLink
              to="/"
              end
              onClick={scrollWindowToTop}
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
              onClick={scrollWindowToTop}
              className={({ isActive }) =>
                `flex min-h-12 flex-1 items-center justify-center text-sm font-medium ${
                  isActive ? 'text-cyan-800' : 'text-slate-400'
                }`
              }
            >
              履歴
            </NavLink>
            <NavLink
              to="/mypage"
              onClick={scrollWindowToTop}
              className={({ isActive }) =>
                `flex min-h-12 flex-1 items-center justify-center text-sm font-medium ${
                  isActive ? 'text-cyan-800' : 'text-slate-400'
                }`
              }
            >
              マイページ
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
