import React from 'react'
import { X, FileText } from 'lucide-react'
import { usePdfStore } from '../../store/pdfStore.js'

export default function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab } = usePdfStore()

  if (!tabs || tabs.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--bg-app)',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
        height: '40px',
        minHeight: '40px',
        padding: '0 8px',
        gap: '2px',
        overflowX: 'auto',
        overflowY: 'hidden',
        zIndex: 20
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId

        return (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            // 🎯 MAGIA DE ARRASTRE ENTRE PESTAÑAS:
            onDragOver={(e) => e.preventDefault()} // Permite soltar / interactuar con el drag
            onDragEnter={() => {
              // Si no estás en esta pestaña y mantienes una página arrastrándose encima, cambia de pestaña automáticamente
              if (!isActive) {
                switchTab(tab.id)
              }
            }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              minWidth: '140px',
              maxWidth: '220px',
              padding: '0 8px 0 12px',
              background: isActive
                ? 'var(--bg-card)'
                : 'transparent',
              color: isActive
                ? 'var(--tx-1)'
                : 'var(--tx-2)',
              borderRadius: '6px 6px 0 0',
              fontSize: '13px',
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              transition: 'background 0.15s ease, color 0.15s ease',
              borderBottom: isActive
                ? '2px solid var(--accent, #f73a3a)'
                : '2px solid transparent'
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-card)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <FileText
              size={14}
              strokeWidth={1.8}
              style={{
                flexShrink: 0,
                color: isActive
                  ? 'var(--accent, #f73a3a)'
                  : 'var(--tx-3, #777)'
              }}
            />

            <span
              title={tab.fileName}
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.fileName}
            </span>

            <button
              onClick={e => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              aria-label={`Cerrar ${tab.fileName}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                flexShrink: 0,
                padding: 0,
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: 'var(--tx-3, #777)',
                cursor: 'pointer',
                transition: 'background 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background =
                  'var(--bg-hover, rgba(255,255,255,0.08))'
                e.currentTarget.style.color =
                  'var(--tx-1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--tx-3, #777)'
              }}
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}