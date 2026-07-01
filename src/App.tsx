import { useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useSettings } from './store/settings'
import { soundEngine } from './engine/audio'
import Home from './screens/Home'
import Configure from './screens/Configure'
import Workout from './screens/Workout'
import Complete from './screens/Complete'
import History from './screens/History'
import Editor from './screens/Editor'
import Settings from './screens/Settings'

function BottomNav() {
  const items = [
    { to: '/', label: 'Train', ico: '🧗' },
    { to: '/history', label: 'History', ico: '📈' },
    { to: '/settings', label: 'Settings', ico: '⚙️' },
  ]
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.to === '/'}>
          <span className="ico">{i.ico}</span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  const themeMode = useSettings((s) => s.themeMode)
  const soundTheme = useSettings((s) => s.soundTheme)
  const volume = useSettings((s) => s.volume)
  const location = useLocation()

  // apply theme to <html> and browser chrome
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    const color = themeMode === 'dark' ? '#121212' : '#ffffff'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [themeMode])

  useEffect(() => soundEngine.setTheme(soundTheme), [soundTheme])
  useEffect(() => soundEngine.setVolume(volume), [volume])

  // The workout screen is full-bleed and hides the nav.
  const hideNav = location.pathname === '/workout'

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/configure/:id" element={<Configure />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/complete" element={<Complete />} />
        <Route path="/history" element={<History />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
