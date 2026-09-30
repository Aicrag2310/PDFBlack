import React, { useEffect, useState } from 'react' // 👈 1. Añadimos useState
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import toast, { Toaster, useToasterStore } from 'react-hot-toast' 
import { Analytics } from '@vercel/analytics/react'

import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import Tools from './pages/Tools.jsx'
import UpdateModal from './components/UpdateModal.jsx'
import TopNavigation from './components/toolbar/TopNavigation.jsx'

export default function App() {
  const { toasts } = useToasterStore()
  
  // 👈 2. Creamos el estado para saber qué pestaña de la barra está activa
  const [activeSection, setActiveSection] = useState('home')

  // Efecto Guardián anti-spam
  useEffect(() => {
    const TOAST_LIMIT = 1 
    toasts
      .filter((t) => t.visible) 
      .filter((_, i) => i >= TOAST_LIMIT) 
      .forEach((t) => toast.dismiss(t.id)) 
  }, [toasts])

  return (
    <HashRouter>
      {/* 👇 3. CONTENEDOR PRINCIPAL: Ocupa el 100% de la ventana en formato columna */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* 👑 LA BARRA SUPERIOR ARRASTRABLE ESTILO WINDOWS/WORD */}
        <TopNavigation
  activeSection={activeSection}
  onSectionChange={setActiveSection}
/>

        {/* 📄 EL CONTENIDO DE LA APP: Toma todo el espacio sobrante (flex: 1) */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/editor" replace />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/about" element={<Landing />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/:toolId" element={<Tools />} />
            <Route path="*" element={<Navigate to="/editor" replace />} />
          </Routes>
        </div>

      </div>

      {/* COMPONENTES GLOBALES FLOTANTES */}
    <Toaster
  position="top-center"
  toastOptions={{
    duration: 2500,
    style: {
      background: 'var(--bg-card, #18181b)',
      color: 'var(--tx-1, #fff)',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      fontSize: '14px',
    },
    success: {
      duration: 2500,
    },
    error: {
      duration: 3500,
    },
  }}
  containerStyle={{
    top: '75px',
    zIndex: 9999999,
  }}
/>
      <Analytics />
      <UpdateModal />
    </HashRouter>
  )
}