import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/history', label: '履歴' },
  { to: '/stats', label: '統計' },
  { to: '/achievements', label: '実績' },
]

/** 「記録」セクション内の切り替え。下部ナビを増やさずに3画面を行き来する */
export default function SectionTabs() {
  return (
    <nav className="section-tabs" aria-label="記録の表示切り替え">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => `section-tab${isActive ? ' is-active' : ''}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
