import React, { useState, useEffect } from 'react'
import { usePdfStore } from '../../store/pdfStore.js'
import { Trash2 } from 'lucide-react'

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
        left: image.x,
        top: image.y,
        width: image.width,
        height: image.height,
        // Borde azul si está seleccionada
        outline: isSelected ? '2px solid #3b82f6' : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isSelected ? 50 : 10, // Traer al frente si está seleccionada
      }}
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