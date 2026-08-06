import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-dvh flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
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
      </div>
    </BrowserRouter>
  )
}
