import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import Tools from './pages/Tools.jsx'
import UpdateModal from './components/UpdateModal.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />

        <Route path="/editor" element={<Editor />} />

        <Route path="/about" element={<Landing />} />

        <Route path="/tools" element={<Tools />} />

        <Route path="/tools/:toolId" element={<Tools />} />

        <Route
          path="*"
          element={<Navigate to="/editor" replace />}
        />
      </Routes>

      <Toaster 
        position="top-center" /* 👈 Las mueve al centro de la pantalla, arriba */
        toastOptions={{
          duration: 2500, /* 👈 Se ocultan solas más rápido (2.5 segundos) */
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
            duration: 3500, /* Los errores duran un segundo más para que alcances a leerlos */
          }
        }} 
      />

      <Analytics />
       <UpdateModal />
    </HashRouter>
  )
}