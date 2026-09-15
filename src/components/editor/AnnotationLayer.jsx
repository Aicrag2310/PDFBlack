import React, { useRef, useState, useEffect } from 'react'
import { usePdfStore } from '../../store/pdfStore.js'
import { Trash2 } from 'lucide-react'
import styles from './AnnotationLayer.module.css'

// 1. UTILIDAD: Calcula el tamaño de la "caja invisible" que envuelve al dibujo
const getBoundingBox = (ann) => {
  if (ann.type === 'path') {
    if (!ann.points || ann.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
    const xs = ann.points.map(p => p.x)
    const ys = ann.points.map(p => p.y)
    return { 
      x: Math.min(...xs), y: Math.min(...ys), 
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) 
    }
  }
  if (ann.type === 'shape') {
    return {
      x: Math.min(ann.startX, ann.endX), y: Math.min(ann.startY, ann.endY),
      w: Math.abs(ann.startX - ann.endX), h: Math.abs(ann.startY - ann.endY)
    }
  }
  return { 
    x: ann.x || ann.startX || 0, y: ann.y || ann.startY || 0, 
    w: ann.width || ann.w || 0, h: ann.height || ann.h || 0 
  }
}

// 2. UTILIDAD MAESTRA: Dibuja los trazos SVG (se usa tanto para los guardados como para el vivo)
const renderShapeContent = (ann, isPreview = false) => {
  if (ann.type === 'path') {
    const d = ann.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return (
      <path d={d} stroke={ann.color} strokeWidth={ann.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={ann.brushType === 'marker' ? 0.4 : 1} />
    )
  }
  if (ann.type === 'shape') {
    const minX = Math.min(ann.startX, ann.endX); const minY = Math.min(ann.startY, ann.endY)
    const w = Math.abs(ann.startX - ann.endX); const h = Math.abs(ann.startY - ann.endY)
    const dash = isPreview ? '4 2' : 'none'

    if (ann.shapeType === 'rect') return <rect x={minX} y={minY} width={w} height={h} stroke={ann.color} strokeWidth={ann.strokeWidth} fill="none" strokeDasharray={dash} />
    if (ann.shapeType === 'circle') return <ellipse cx={minX + w/2} cy={minY + h/2} rx={w/2} ry={h/2} stroke={ann.color} strokeWidth={ann.strokeWidth} fill="none" strokeDasharray={dash} />
    if (ann.shapeType === 'line') return <line x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY} stroke={ann.color} strokeWidth={ann.strokeWidth} strokeLinecap="round" strokeDasharray={dash} />
  }

  // Compatibilidad Resaltador/Redactar
  const fillMap = { highlight: isPreview ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.35)', redact: isPreview ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,1)', rect: 'rgba(232,69,69,0.08)' }
  const strokeMap = { highlight: isPreview ? '#fbbf24' : 'rgba(251,191,36,0.6)', redact: 'transparent', rect: '#e84545' }

  return (
    <rect x={ann.x || ann.startX} y={ann.y || ann.startY} width={ann.width || ann.w} height={ann.height || ann.h} fill={fillMap[ann.type] || 'rgba(232,69,69,0.1)'} stroke={strokeMap[ann.type] || '#e84545'} strokeWidth={ann.type === 'redact' ? 0 : 1.5} strokeDasharray={isPreview && ann.type === 'rect' ? '4 2' : 'none'} rx={ann.type === 'rect' ? 2 : 0} />
  )
}

// =========================================================================
// 3. COMPONENTE INTERACTIVO: Envuelve cada dibujo con sus controles
// =========================================================================
function InteractiveAnnotation({ ann, pageNum, activeTool, zoom }) {
  const { selectedElement, setSelectedElement, updateAnnotation, removeAnnotation } = usePdfStore()
  const isSelected = selectedElement?.id === ann.id
  
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  
  const box = getBoundingBox(ann)

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging && !isResizing) return
      
      const dx = e.movementX / zoom
      const dy = e.movementY / zoom

      if (isDragging) {
        if (ann.type === 'path') {
          updateAnnotation(pageNum, ann.id, { points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })) })
        } else if (ann.type === 'shape') {
          updateAnnotation(pageNum, ann.id, { startX: ann.startX + dx, startY: ann.startY + dy, endX: ann.endX + dx, endY: ann.endY + dy })
        } else {
          updateAnnotation(pageNum, ann.id, { x: (ann.x || 0) + dx, y: (ann.y || 0) + dy })
        }
      } 
      else if (isResizing) {
        if (ann.type === 'path') {
          // Escalar un trazo libre matemáticamente
          const scaleX = (box.w + dx) / (box.w || 1)
          const scaleY = (box.h + dy) / (box.h || 1)
          updateAnnotation(pageNum, ann.id, {
            points: ann.points.map(p => ({ x: box.x + (p.x - box.x) * Math.max(0.1, scaleX), y: box.y + (p.y - box.y) * Math.max(0.1, scaleY) }))
          })
        } else if (ann.type === 'shape') {
          updateAnnotation(pageNum, ann.id, { endX: ann.endX + dx, endY: ann.endY + dy })
        } else {
          updateAnnotation(pageNum, ann.id, { width: Math.max(5, (ann.width || 0) + dx), height: Math.max(5, (ann.height || 0) + dy) })
        }
      }
    }

    const handlePointerUp = () => { setIsDragging(false); setIsResizing(false) }

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, isResizing, ann, zoom, pageNum, updateAnnotation, box.w, box.h, box.x, box.y])

  return (
    <g 
      // El truco maestro: el dibujo "atrapa" el clic solo si estás en modo selección
      style={{ 
        pointerEvents: activeTool === 'select' ? 'auto' : 'none', 
        cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'pointer') 
      }}
      onPointerDown={(e) => {
        if (activeTool === 'select') {
          e.stopPropagation()
          setSelectedElement(ann, pageNum)
          setIsDragging(true)
        }
      }}
    >
      {/* El dibujo real */}
      {renderShapeContent(ann, false)}

      {/* Controles de Selección */}
      {isSelected && activeTool === 'select' && (
        <>
          {/* Borde punteado */}
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4 4" pointerEvents="none" />
          
          {/* Cuadro para redimensionar (esquina inferior derecha) */}
          <rect 
            x={box.x + box.w - 5} y={box.y + box.h - 5} width={10} height={10} fill="#3b82f6" stroke="#fff" strokeWidth={1.5}
            style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
            onPointerDown={(e) => { e.stopPropagation(); setIsResizing(true) }}
          />

          {/* Botón flotante de Borrar (Arriba) */}
          <foreignObject x={box.x} y={box.y > 40 ? box.y - 35 : box.y + box.h + 10} width={100} height={40}>
            <button
              onClick={(e) => { e.stopPropagation(); removeAnnotation(pageNum, ann.id) }}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <Trash2 size={12} /> Borrar
            </button>
          </foreignObject>
        </>
      )}
    </g>
  )
}

// =========================================================================
// 4. EL LIENZO PRINCIPAL
// =========================================================================
export default function AnnotationLayer({ pageNum, pageSize, activeTool }) {
  const { addAnnotation, editLayers, zoom, activeShape, brushSize, brushColor, brushType } = usePdfStore()
  
  const svgRef = useRef(null)
  const [drawing, setDrawing] = useState(null)
  const isDrawable = ['highlight', 'redact', 'shape', 'draw'].includes(activeTool)

  const getPos = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }

  const handleMouseDown = (e) => {
    if (!isDrawable) return
    const pos = getPos(e)
    
    if (activeTool === 'draw') setDrawing({ type: 'path', points: [pos], color: brushColor, strokeWidth: brushSize, brushType })
    else if (activeTool === 'shape') setDrawing({ type: 'shape', shapeType: activeShape, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y, color: brushColor, strokeWidth: brushSize })
    else setDrawing({ type: activeTool, startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const handleMouseMove = (e) => {
    if (!drawing) return
    const pos = getPos(e)

    if (drawing.type === 'path') setDrawing(d => ({ ...d, points: [...d.points, pos] }))
    else if (drawing.type === 'shape') setDrawing(d => ({ ...d, endX: pos.x, endY: pos.y }))
    else setDrawing(d => ({ ...d, x: Math.min(pos.x, d.startX), y: Math.min(pos.y, d.startY), w: Math.abs(pos.x - d.startX), h: Math.abs(pos.y - d.startY) }))
  }

  const handleMouseUp = () => {
    if (!drawing) return
    let finalAnnotation = null

    if (drawing.type === 'path') {
      if (drawing.points.length > 1) finalAnnotation = { id: `ann-${Date.now()}`, ...drawing }
    } else if (drawing.type === 'shape') {
      if (Math.abs(drawing.startX - drawing.endX) > 3) finalAnnotation = { id: `ann-${Date.now()}`, ...drawing }
    } else {
      if (drawing.w > 3) finalAnnotation = { id: `ann-${Date.now()}`, type: drawing.type, x: drawing.x, y: drawing.y, width: drawing.w, height: drawing.h, color: activeTool === 'highlight' ? '#fbbf24' : '#000000' }
    }

    if (finalAnnotation) addAnnotation(pageNum, finalAnnotation)
    setDrawing(null)
  }

  const annotations = editLayers[pageNum]?.annotations || []

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      width={pageSize.width}
      height={pageSize.height}
      // Si estamos dibujando, el SVG atrapa los clics. Si estamos seleccionando, deja pasar los clics
      // hacia los dibujos individuales gracias al pointerEvents="none"
      style={{ pointerEvents: isDrawable ? 'auto' : 'none', position: 'absolute', top: 0, left: 0, zIndex: 20 }}
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
      onPointerLeave={handleMouseUp}
    >
      {/* 1. Dibujos Finalizados (Con controles si los seleccionas) */}
      {annotations.map(ann => (
        <InteractiveAnnotation key={ann.id} ann={ann} pageNum={pageNum} activeTool={activeTool} zoom={zoom} />
      ))}

      {/* 2. Trazo en Vivo (Mientras arrastras el mouse) */}
      {drawing && <g pointerEvents="none">{renderShapeContent(drawing, true)}</g>}
    </svg>
  )
}