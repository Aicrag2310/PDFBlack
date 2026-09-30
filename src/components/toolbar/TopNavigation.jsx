import React, { useState, useEffect } from 'react'

import {
  FileText,
  Home,
  PlusSquare,
  Files,
  PenTool,
  Eye,
  HelpCircle,
  Wrench,
  Sun,
  Moon
} from 'lucide-react'

import { useNavigate, useLocation } from 'react-router-dom'

import BackstageMenu from './BackstageMenu.jsx'

const { ipcRenderer } = window.require
  ? window.require('electron')
  : { ipcRenderer: null }

/*
 * =========================================================
 * COMPONENTE DE TEMA CLARO/OSCURO
 * =========================================================
 */
function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pdfzero-theme') || 'dark'
  })

  useEffect(() => {
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
        background: 'var(--bg-card, #18181b)',
        border: '1px solid var(--brd-2, rgba(255,255,255,0.1))',
        color: 'var(--tx-1, #ffffff)',
        padding: '4px 10px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '13px',
        fontWeight: 500,
        WebkitAppRegion: 'no-drag' // 🔥 CRUCIAL: Permite hacer clic sin arrastrar la ventana
      }}
    >
      {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#3b82f6" />}
      <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}

export default function TopNavigation({
  activeSection,
  onSectionChange,
}) {
  const [hoveredSection, setHoveredSection] = useState(null)

  const navigate = useNavigate()
  const location = useLocation()

  const sections = [
    { id: 'file', label: 'Archivo', icon: FileText },
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'settings', label: 'Herramientas', icon: Wrench },
    { id: 'insert', label: 'Insertar', icon: PlusSquare },
    { id: 'organize', label: 'Organizar', icon: Files },
    { id: 'sign', label: 'Firmar', icon: PenTool },
    { id: 'view', label: 'Ver', icon: Eye },
    { id: 'help', label: 'Ayuda', icon: HelpCircle },
  ]

  /*
   * =========================================================
   * RUTAS ESPECIALES Y ESTADOS
   * =========================================================
   */
  const isToolsPage = location.pathname === '/tools' || location.pathname.startsWith('/tools/')
  
  // 🔥 SOLUCIÓN: Ya no bloqueamos el menú si estamos en Tools.
  // Si activeSection es 'file', siempre se muestra el menú Archivo.
  const isFileActive = activeSection === 'file'

  /*
   * =========================================================
   * CONTROLES DE WINDOWS
   * =========================================================
   */
  const handleMinimize = () => ipcRenderer?.send('window-minimize')
  const handleMaximize = () => ipcRenderer?.send('window-maximize')
  const handleClose = () => ipcRenderer?.send('window-close')

  /*
   * =========================================================
   * CAMBIO DE SECCIÓN
   * =========================================================
   */
  const handleSectionClick = (sectionId) => {
    if (sectionId === 'file') {
      if (onSectionChange) onSectionChange('file')
      return
    }

    if (sectionId === 'home') {
      if (onSectionChange) onSectionChange('home')
      navigate('/editor')
      return
    }

    if (sectionId === 'settings') {
      if (onSectionChange) onSectionChange('settings')
      navigate('/tools')
      return
    }

    if (onSectionChange) {
      onSectionChange(sectionId)
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */
  return (
    <>
      <style>
        {`
          .win-control {
            width: 46px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: #a1a1aa;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
            -webkit-app-region: no-drag;
            font-family: sans-serif;
            font-size: 14px;
            outline: none;
          }
          .win-control:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
          .win-control.close:hover { background: #e81123; color: #ffffff; }
        `}
      </style>

      {/* =====================================================
          BARRA SUPERIOR
          ===================================================== */}
      <div
        style={{
          width: '100%',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // 🔥 Si Archivo está activo, siempre es rojo
          background: isFileActive ? '#f73a3a' : 'var(--bg-panel, #18181b)',
          borderBottom: '1px solid var(--brd, rgba(255,255,255,0.10))',
          userSelect: 'none',
          flexShrink: 0,
          transition: 'background 0.2s',
          WebkitAppRegion: 'drag',
          zIndex: 999999,
          position: 'relative',
        }}
      >
        {/* =================================================
            IZQUIERDA
            ================================================= */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: '12px' }}>
          
          {/* =================================================
              LOGO
              ================================================= */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              paddingRight: '18px', marginRight: '6px', height: '100%',
              borderRight: isFileActive 
                ? '1px solid rgba(255,255,255,0.25)' 
                : '1px solid var(--brd, rgba(255,255,255,0.08))',
              color: isFileActive ? '#ffffff' : '#fd0000',
              fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', WebkitAppRegion: 'no-drag',
            }}
          >
            <div
              style={{
                width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '6px',
                background: isFileActive 
                  ? 'rgba(0,0,0,0.22)' : 'linear-gradient(135deg, #f73a3a 0%, #b91c1c 100%)',
                color: '#ffffff', fontSize: '13px', fontWeight: '800',
              }}
            >
              A
            </div>
            <span>Aicrag Black PDF</span>
          </div>

          {/* =================================================
              SECCIONES (CINTA DE OPCIONES)
              ================================================= */}
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '2px' }}>
            {sections.map((section) => {
              const Icon = section.icon
              const isTools = section.id === 'settings'
              
              // Lógica de activación limpia: 
              // Si Archivo está abierto, ninguna otra se ve "activa"
              const isActive = isFileActive 
                ? section.id === 'file' 
                : (isTools ? isToolsPage : activeSection === section.id)
                
              const isHovered = hoveredSection === section.id

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  onMouseEnter={() => setHoveredSection(section.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                  style={{
                    position: 'relative', height: '32px', padding: '0 12px', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none', borderRadius: '6px',
                    background: isActive 
                      ? (isFileActive ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.10)')
                      : isHovered 
                        ? (isFileActive ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)')
                        : 'transparent',
                    color: isFileActive ? '#ffffff' : isActive ? '#dd1818' : 'var(--tx-2, #d4d4d8)',
                    cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? '600' : '500',
                    transition: 'all 0.15s ease', outline: 'none', WebkitAppRegion: 'no-drag',
                  }}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{section.label}</span>

                  {isActive && !isFileActive && (
                    <span style={{
                      position: 'absolute', left: '10px', right: '10px', bottom: '-5px', height: '2px', 
                      borderRadius: '2px 2px 0 0', background: '#f73a3a',
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* =================================================
            DERECHA (TEMA + CONTROLES WINDOWS)
            ================================================= */}
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          
          <div style={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
             <ThemeToggle />
          </div>

          <button className="win-control" onClick={handleMinimize} title="Minimizar">
            <span style={{ fontSize: '10px', marginTop: '10px' }}>__</span>
          </button>
          
          <button className="win-control" onClick={handleMaximize} title="Maximizar">
            <span style={{ width: '10px', height: '10px', border: '1.5px solid currentColor' }} />
          </button>
          
          <button className="win-control close" onClick={handleClose} title="Cerrar">
            <span style={{ fontSize: '18px', fontWeight: '300' }}>×</span>
          </button>
        </div>
      </div>

      {/* =====================================================
          MENÚ ARCHIVO (BACKSTAGE)
          ===================================================== */}
      {/* 🔥 AHORA SE MUESTRA SIEMPRE QUE ARCHIVO ESTÉ ACTIVO */}
      {isFileActive && (
        <BackstageMenu onSectionChange={onSectionChange} />
      )}
    </>
  )
}