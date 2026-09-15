import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

import Landing from './pages/Landing.jsx'
import Editor from './pages/Editor.jsx'
import Tools from './pages/Tools.jsx'

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
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      <Analytics />
    </HashRouter>
  )
}