import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
// 👇 1. Importamos toast y useToasterStore además de Toaster
import toast, { Toaster, useToasterStore } from 'react-hot-toast' 
import { Analytics } from '@vercel/analytics/react'

import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import Tools from './pages/Tools.jsx'
import UpdateModal from './components/UpdateModal.jsx'

export default function App() {
  // 👇 2. Obtenemos el estado global de todas las alertas
  const { toasts } = useToasterStore()

  // 👇 3. Creamos un "Efecto Guardián" anti-spam
  useEffect(() => {
    const TOAST_LIMIT = 1 // 👈 Límite: Solo 1 alerta en pantalla a la vez

    toasts
      .filter((t) => t.visible) // Filtramos solo las alertas que están visibles
      .filter((_, i) => i >= TOAST_LIMIT) // Si hay más del límite permitido...
      .forEach((t) => toast.dismiss(t.id)) // ...cerramos las más viejas al instante
  }, [toasts])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/:toolId" element={<Tools />} />
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>

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
          }
        }} 
      />

      <Analytics />
      <UpdateModal />
    </HashRouter>
  )
}