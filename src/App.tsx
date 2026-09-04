import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { loadReminder, scheduleWhileOpen, showReminderNow } from './lib/reminders'
import AchievementsPage from './pages/AchievementsPage'
import ExercisesPage from './pages/ExercisesPage'
import GoalPage from './pages/GoalPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import StatsPage from './pages/StatsPage'
import WorkoutPage from './pages/WorkoutPage'
import { useApp } from './state/AppContext'

const NAV = [
  { to: '/', label: 'ホーム', icon: '🏠', match: ['/'] },
  { to: '/workout', label: 'メニュー', icon: '🏋️', match: ['/workout'] },
  // 記録タブは履歴・統計・実績の3画面をまとめて担当する
  { to: '/history', label: '記録', icon: '📋', match: ['/history', '/stats', '/achievements'] },
  { to: '/goal', label: '目標', icon: '🎯', match: ['/goal'] },
  { to: '/profile', label: '設定', icon: '⚙️', match: ['/profile', '/exercises'] },
]

export default function App() {
  const { ready } = useApp()
  const { pathname } = useLocation()

  // アプリを開いている間は、予定時刻ちょうどに通知を出す
  useEffect(() => scheduleWhileOpen(loadReminder(), () => void showReminderNow()), [])

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">筋トレログ</span>
      </header>

      <main className="app-main">
        {!ready ? (
          <div className="page">
            <p className="muted">読み込み中…</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/goal" element={<GoalPage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        )}
      </main>

      <nav className="app-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={`nav-item${item.match.includes(pathname) ? ' is-active' : ''}`}
          >
            <span className="nav-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
