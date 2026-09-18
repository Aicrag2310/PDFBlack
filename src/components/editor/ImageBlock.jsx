import React, { useState, useEffect } from 'react'
import { usePdfStore } from '../../store/pdfStore.js'
import { Trash2, Copy, ArrowDown, ArrowUp } from 'lucide-react' // 👈 Asegúrate de que 'Copy' esté aquí
import toast from 'react-hot-toast'

export default function ImageBlock({ image, pageNum, zoom }) {
  const { updateImage, removeImage, selectedElement, setSelectedElement } = usePdfStore()
  
  // Saber si esta es la imagen que el usuario tiene seleccionada
  const isSelected = selectedElement?.id === image.id

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  // Iniciar el movimiento
  const handlePointerDown = (e) => {
    e.stopPropagation()
    setSelectedElement(image, pageNum)
    setIsDragging(true)
  }

  // Iniciar el cambio de tamaño (desde la esquina)
  const handleResizeDown = (e) => {
    e.stopPropagation()
    setSelectedElement(image, pageNum)
    setIsResizing(true)
  }

  // Escuchar el movimiento del ratón en toda la ventana para que sea fluido
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDragging) {
        // e.movementX/Y nos da cuántos píxeles se movió el ratón. 
        // Lo dividimos por el zoom para que el movimiento coincida con la escala del PDF
        updateImage(pageNum, image.id, {
          x: image.x + e.movementX / zoom,
          y: image.y + e.movementY / zoom
        })
      } else if (isResizing) {
        updateImage(pageNum, image.id, {
          // Evitamos que la imagen se haga más pequeña de 20x20 pixeles
          width: Math.max(20, image.width + e.movementX / zoom),
          height: Math.max(20, image.height + e.movementY / zoom)
        })
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, isResizing, image, pageNum, zoom, updateImage])

  return (
    <div
      style={{
        position: 'absolute',
        left: Number(image.x) || 50,
        top: Number(image.y) || 50,
        width: image.width,
        height: image.height,
        // Borde azul si está seleccionada
        outline: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: image.zIndex || (isSelected ? 999 : 10),
      }}
      tabIndex={-1}
      onPointerDown={handlePointerDown}
    >
      {/* La imagen real */}
      <img 
        src={image.src} 
        alt="User insert"
        style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} 
      />

      {/* Controles que solo aparecen cuando haces clic en la imagen */}
      {isSelected && (
        <>
          {/* Botón de borrar (arriba a la derecha) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeImage(pageNum, image.id)
            }}
            style={{
              position: 'absolute',
              top: -30,
              right: 0,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <Trash2 size={12} /> Borrar
          </button>

          {/* Cuadrito de redimensionamiento (abajo a la derecha) */}
          <div
            onPointerDown={handleResizeDown}
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 12,
              height: 12,
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'nwse-resize'
            }}
          />
        </>
      )}
    </div>
  )
}

export function ImageContextToolbar({ image, pageNum, pos }) {
  const { removeImage, updateImage, setSelectedElement, addImage } = usePdfStore()

  const [thickness, setThickness] = useState(image.thickness || 0)

  // Sincroniza si cambia la imagen externa
  useEffect(() => {
    setThickness(image.thickness || 0)
  }, [image.thickness])

  // 🪄 Motor optimizado para cambiar color o grosor al terminar o mover
  const applyModifications = (newColor, newThickness) => {
    const colorToUse = newColor || image.color || '#000000'
    const tVal = newThickness !== undefined ? newThickness : thickness

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = image.originalSrc || image.src || image.dataUrl
    
    if (!image.originalSrc) {
      updateImage(pageNum, image.id, { originalSrc: image.src || image.dataUrl })
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let data = imgData.data

      const hex = colorToUse.replace('#', '')
      const rT = parseInt(hex.substring(0, 2), 16)
      const gT = parseInt(hex.substring(2, 4), 16)
      const bT = parseInt(hex.substring(4, 6), 16)

      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] > 10) {
          data[i] = rT
          data[i+1] = gT
          data[i+2] = bT
        }
      }

      if (tVal > 0) {
        const w = canvas.width
        const h = canvas.height
        const sourceData = new Uint8ClampedArray(data)

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4
            if (sourceData[idx + 3] < 50) {
              let foundInk = false
              for (let dy = -tVal; dy <= tVal; dy++) {
                for (let dx = -tVal; dx <= tVal; dx++) {
                  const nx = x + dx
                  const ny = y + dy
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nIdx = (ny * w + nx) * 4
                    if (sourceData[nIdx + 3] > 100) {
                      foundInk = true
                      break
                    }
                  }
                }
                if (foundInk) break
              }
              if (foundInk) {
                data[idx] = rT
                data[idx+1] = gT
                data[idx+2] = bT
                data[idx+3] = 255
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0)
      const modifiedUrl = canvas.toDataURL('image/png')
      
      updateImage(pageNum, image.id, { 
        src: modifiedUrl, 
        dataUrl: modifiedUrl, 
        color: colorToUse,
        thickness: tVal 
      })
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: Math.max(2, pos.y - 50),
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg-panel, #18181b)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: '6px 10px',
        zIndex: 99999,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        pointerEvents: 'all',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      onMouseDown={e => {
        if (e.target.tagName !== 'INPUT' || e.target.type !== 'range') {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* 🎨 Selector de color */}
      <input 
        type="color" 
        value={image.color || '#000000'}
        title="Cambiar color de la firma"
        onChange={(e) => applyModifications(e.target.value, undefined)}
        style={{ 
          width: 24, height: 24, padding: 0, border: 'none', 
          background: 'transparent', cursor: 'pointer', borderRadius: '4px' 
        }}
      />

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

      {/* 🎚️ Control de Grosor Fluido */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#a1a1aa' }}>
        <span>Grosor: {thickness}</span>
        <input 
          type="range" 
          min="0" 
          max="3" 
          step="1"
          value={thickness}
          onChange={(e) => {
            const val = Number(e.target.value)
            setThickness(val) // Mueve el slider visualmente al instante
          }}
          onMouseUp={(e) => {
            applyModifications(undefined, Number(e.target.value)) // Aplica el cálculo pesado al soltar o cambiar
          }}
          onTouchEnd={(e) => {
            applyModifications(undefined, Number(e.target.value))
          }}
          style={{ width: '60px', accentColor: '#a855f7', cursor: 'pointer' }}
          title="Ajustar grosor del trazo"
        />
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

      {/* Duplicar */}
      <button 
        title="Duplicar firma"
        onClick={() => {
          const clone = { 
            ...image, 
            id: `img-${Date.now()}`, 
            x: image.x + 20, 
            y: image.y + 20 
          }
          addImage(pageNum, clone)
          toast.success('Firma duplicada')
        }}
        style={toolbarBtnStyle}
      >
        <Copy size={15} />
      </button>

      {/* Mandar al fondo */}
      {/* Mandar al fondo */}
      <button 
        title="Mandar al fondo"
        onClick={() => {
          updateImage(pageNum, image.id, { zIndex: 0 })
          toast.success('Firma enviada al fondo')
        }}
        style={toolbarBtnStyle}
      >
        <ArrowDown size5={15} />
      </button>

      {/* Traer al frente */}
      <button 
        title="Traer al frente"
        onClick={() => {
          updateImage(pageNum, image.id, { zIndex: 99999 })
          toast.success('Firma traída al frente')
        }}
        style={toolbarBtnStyle}
      >
        <ArrowUp size={15} />
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

      {/* Eliminar */}
      <button 
        title="Eliminar firma"
        onClick={() => {
          removeImage(pageNum, image.id)
          setSelectedElement(null, null)
          toast.success('Firma eliminada')
        }}
        style={{ ...toolbarBtnStyle, color: '#f87171' }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

const toolbarBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, border: 'none', borderRadius: 6,
  background: 'transparent', color: '#a1a1aa', cursor: 'pointer',
}