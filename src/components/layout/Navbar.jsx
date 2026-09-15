import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FileText, Sun, Moon } from 'lucide-react'
import styles from './Navbar.module.css'

// Componente interno para alternar tema Claro/Oscuro
function ThemeToggle() {
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('pdfzero-theme') || 'dark'
  })

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pdfzero-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--brd-2)',
        color: 'var(--tx-1)',
        padding: '6px 10px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '13px',
        fontWeight: 500
      }}
    >
      {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#3b82f6" />}
      <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}

export default function Navbar({ variant = 'app' }) {
  const location = useLocation()

  return (
    <nav className={`${styles.nav} ${variant === 'landing' ? styles.landing : ''}`}>
      <div className={styles.left}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoMark}>
            <FileText size={14} />
          </div>
          <span className={styles.logoName}>PDFBlack</span>
          <span className={styles.logoBeta}>Aicrag</span>
        </Link>

        {variant === 'app' && (
          <div className={styles.tabs}>
            <Link to="/editor" className={`${styles.tab} ${location.pathname === '/editor' ? styles.active : ''}`}>
              Editor
            </Link>
            <Link to="/tools" className={`${styles.tab} ${location.pathname.startsWith('/tools') ? styles.active : ''}`}>
              Todas las herramientas
            </Link>
          </div>
        )}
      </div>

      {/* Lado derecho del Navbar con el botón de tema */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ThemeToggle />
      </div>
    </nav>
  )
}