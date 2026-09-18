import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import {
  renderPage,
  extractTextItems,
  detectPageBackground,
  sampleLocalBackground,
  applyCanvasTextColors,
  BASE_SCALE,
} from '../../lib/pdfRenderer.js'
import TextBlock, { TextContextToolbar } from './TextBlock.jsx'
import ImageBlock, { ImageContextToolbar } from './ImageBlock.jsx'
import AnnotationLayer from './AnnotationLayer.jsx'
import styles from './PdfCanvas.module.css'

/* =========================================================
   COMPONENTE HIJO: Representa una sola hoja del PDF
========================================================= */
function PdfPage({ pageNum }) {
  const {
    file, zoom, activeTool,
    editLayers, addTextBlock, getLayer,
    setSelectedElement, selectedElement, selectedElementPage,
    extractedEdits, setPageBg: storeSetPageBg, setBlockBgs, searchText,
    defaultFont, defaultFontSize, defaultTextColor,
    defaultFontBold, defaultFontItalic, defaultFontUnderline,
    setCurrentPage, pendingSignature, setPendingSignature, setActiveTool
  } = usePdfStore()
  
  const pageRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const renderIdRef = useRef(0)

  const [isVisible, setIsVisible] = useState(false)
  const [baseSize, setBaseSize] = useState({ width: 794, height: 1123 }) // Tamaño A4 por defecto
  const [isRendering, setIsRendering] = useState(false)
  const [textItems, setTextItems] = useState([])
  const [pageBg, setPageBgLocal] = useState('white')
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [editingId, setEditingId] = useState(null)

  const setPageBg = (bg) => { setPageBgLocal(bg); storeSetPageBg(pageNum, bg) }

  // 1. OBSERVER DE LAZY LOADING: Solo renderiza si te acercas a la hoja
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true)
    }, { rootMargin: '1000px' })
    
    if (pageRef.current) observer.observe(pageRef.current)
    return () => observer.disconnect()
  }, [])

  // 2. OBSERVER DE POSICIÓN: Actualiza el indicador "Página X / Y" al scrollear
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setCurrentPage(pageNum)
    }, { threshold: 0.5 })
    
    if (pageRef.current) observer.observe(pageRef.current)
    return () => observer.disconnect()
  }, [pageNum, setCurrentPage])

  /* ── Render PDF canvas (Solo si es visible) ── */
  useEffect(() => {
    if (!file || !pageNum || !isVisible) return
    const id = ++renderIdRef.current
    setIsRendering(true)

    renderPage(pageNum, zoom)
      .then(({ canvas, width, height }) => {
        if (id !== renderIdRef.current) return
        const baseW = width / zoom
        const baseH = height / zoom
        setBaseSize({ width: baseW, height: baseH })

        const el = canvasRef.current
        if (!el) return
        el.width = canvas.width
        el.height = canvas.height
        el.style.width = baseW + 'px'
        el.style.height = baseH + 'px'
        el.getContext('2d').drawImage(canvas, 0, 0)
        setPageBg(detectPageBackground(canvas))
        setCanvasVersion(v => v + 1)
        setIsRendering(false)
      })
      .catch(e => {
        if (id !== renderIdRef.current) return
        setIsRendering(false)
        console.error('Render error:', e)
      })
  }, [file, pageNum, zoom, isVisible])

  /* ── Extract text once per page ── */
  useEffect(() => {
    if (!file || !pageNum || !isVisible) return
    setTextItems([])
    setEditingId(null)
    extractTextItems(pageNum)
      .then(setTextItems)
      .catch(() => setTextItems([]))
  }, [file, pageNum, isVisible])

  useEffect(() => {
    if (!textItems.length || !canvasRef.current || isRendering) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvasScale = zoom * dpr

    setTextItems(prev => {
      let changed = false
      const next = applyCanvasTextColors(prev, canvasRef.current, canvasScale, pageBg)
      for (let i = 0; i < next.length; i++) {
        if (next[i].color !== prev[i]?.color || next[i].colorSource !== prev[i]?.colorSource) {
          changed = true
          break
        }
      }
      return changed ? next : prev
    })
  }, [textItems.length, canvasVersion, zoom, pageBg, isRendering])

  useEffect(() => {
    if (!selectedElement || selectedElementPage !== pageNum) return
    const corrected = textItems.find(item => item.id === selectedElement.id)
    if (!corrected) return
    if (corrected.color !== selectedElement.color || corrected.colorSource !== selectedElement.colorSource) {
      setSelectedElement(corrected, pageNum)
    }
  }, [textItems, selectedElement, selectedElementPage, pageNum, setSelectedElement])

  const handleClick = useCallback((e) => {
    const isBg = e.target === containerRef.current || e.target === canvasRef.current

    // 🔥 MAGIA DE FIRMAS: MODO SELLO
    if (activeTool === 'sign' && pendingSignature && isBg) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom

      const newSignature = {
        id: `sig-${Date.now()}`,
        type: 'image',
        src: pendingSignature.dataUrl,
        x: x - 75,
        y: y - 37,
        width: 150, 
        height: 75,
        isEdited: true,
        zIndex: 9999
      }
      
      usePdfStore.getState().addImage(pageNum, newSignature) 
      setPendingSignature(null) 
      setActiveTool('select') 
      return
    }

    if (isBg) { setSelectedElement(null, null); setEditingId(null) }
    if (activeTool !== 'text' || !isBg) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    const newBlock = {
      id: `new-${Date.now()}`, 
      str: '', 
      x, y, width: 120, height: 20,
      fontSize: defaultFontSize, 
      fontFamily: defaultFont,
      fontBold: defaultFontBold, 
      fontItalic: defaultFontItalic,
      fontUnderline: defaultFontUnderline, 
      color: defaultTextColor,
      isEdited: true
    }
    
    addTextBlock(pageNum, newBlock)
    setSelectedElement(newBlock, pageNum)
    setEditingId(newBlock.id)
  }, [
    activeTool, pageNum, zoom, addTextBlock, setSelectedElement, 
    defaultFont, defaultFontSize, defaultTextColor, 
    defaultFontBold, defaultFontItalic, defaultFontUnderline,
    pendingSignature, setPendingSignature, setActiveTool
  ])

  const getLocalBg = useCallback((x, y, w, h) => {
    if (!canvasRef.current) return pageBg || 'white'
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvasScale = zoom * dpr
    return sampleLocalBackground(canvasRef.current, x, y, w, h, canvasScale) || pageBg || 'white'
  }, [zoom, pageBg])

  useEffect(() => {
    if (!file || !canvasRef.current) return
    const layer = getLayer(pageNum)
    const blocks = (layer.texts || []).filter(b => b.isEdited && b.originalId)
    if (blocks.length === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvasScale = zoom * dpr
    const map = {}
    blocks.forEach(block => {
      const fontSize = block.originalFontSize || block.fontSize || 12
      const width = Math.max(block.originalWidth || block.width || fontSize * 4, 1)
      const height = Math.max(block.originalHeight || block.height || fontSize, 1)
      const cx = (block.originalX ?? block.x)
      const cy = (block.originalY ?? block.y)
      map[block.id] = sampleLocalBackground(canvasRef.current, cx, cy, width, height, canvasScale) || pageBg || 'white'
    })
    setBlockBgs(pageNum, map)
  }, [file, pageNum, zoom, pageBg, canvasVersion, editLayers, getLayer, setBlockBgs])

  const scaledW = baseSize.width * zoom
  const scaledH = baseSize.height * zoom
  const layer = getLayer(pageNum)

  const editedOriginalIds = new Set(
    (layer.texts || []).filter(t => t.isEdited && t.originalId).map(t => t.originalId)
  )

  const selectedBlock = selectedElement && selectedElementPage === pageNum
    ? (textItems.find(t => t.id === selectedElement.id) || (layer.texts || []).find(t => t.id === selectedElement.id))
    : null

  const isEditing = selectedBlock && editingId === selectedBlock?.id
  const editedTextBlocks = (layer.texts || []).filter(block => block.isEdited && block.originalId)

  return (
    <div 
      ref={pageRef} 
      data-page={pageNum}
      style={{ 
        position: 'relative', 
        width: scaledW, 
        height: scaledH, 
        flexShrink: 0,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        backgroundColor: 'white',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      <div
        ref={containerRef}
        className={`${styles.pageContainer} ${activeTool === 'text' ? styles.cursorText : ''}`}
        style={{ 
          width: baseSize.width, 
          height: baseSize.height, 
          transform: `scale(${zoom})`, 
          transformOrigin: 'top left', 
          cursor: (activeTool === 'sign' && pendingSignature) ? 'crosshair' : undefined 
        }}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className={styles.canvas} />

        {/* 🖼️ IMÁGENES AL FONDO DE LAS CAPAS INTERACTIVAS */}
        {(layer.images || []).map(img => (
          <ImageBlock key={img.id} image={img} pageNum={pageNum} zoom={zoom} />
        ))}

        {isRendering && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
          </div>
        )}

        {textItems.filter(item => !editedOriginalIds.has(item.id)).map(item => (
          <TextBlock
            key={item.id} block={item} pageNum={pageNum} isExtracted pageBg={pageBg} getLocalBg={getLocalBg}
            forceEdit={editingId === item.id} onEditStart={() => setEditingId(item.id)} onEditEnd={() => setEditingId(null)}
          />
        ))}

        {editedTextBlocks.map(block => {
          const fontSize = block.originalFontSize || block.fontSize || 12
          const width = Math.max(block.originalWidth || block.width || fontSize * 4, 1)
          const height = Math.max(block.originalHeight || block.height || fontSize, 1)
          const cx = (block.originalX ?? block.x)
          const cy = (block.originalY ?? block.y)
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const canvasScale = zoom * dpr
          const localBg = canvasRef.current ? (sampleLocalBackground(canvasRef.current, cx, cy, width, height, canvasScale) || pageBg || 'white') : (pageBg || 'white')
          const pad = 2
          return (
            <div
              key={`cover-${block.id}`}
              style={{
                position: 'absolute', left: cx - 0.75, top: cy - pad, width: width + pad * 2, height: height + pad * 2,
                background: localBg, filter: 'blur(1px)', pointerEvents: 'none', zIndex: 8, borderRadius: 2,
              }}
            />
          )
        })}

        {(layer.texts || []).map(block => (
          <TextBlock
            key={block.id} block={block} pageNum={pageNum} isExtracted={false} pageBg={pageBg} getLocalBg={getLocalBg}
            forceEdit={editingId === block.id} onEditStart={() => setEditingId(block.id)} onEditEnd={() => setEditingId(null)}
          />
        ))}

        {/* Barra flotante individual de imagen/firma si está seleccionada en esta página */}
        {selectedElement && (selectedElement.type === 'image' || selectedElement.src) && selectedElementPage === pageNum && (
          <ImageContextToolbar 
            image={selectedElement} 
            pageNum={pageNum} 
            pos={{ x: selectedElement.x * zoom, y: selectedElement.y * zoom }} 
          />
        )}

        <AnnotationLayer pageNum={pageNum} pageSize={baseSize} activeTool={activeTool} />

        {/* 🔍 CAPA DE BÚSQUEDA FLOTANTE */}
        {searchText && searchText.trim() !== '' && textItems.map(item => {
          if (!item.str || !item.str.toLowerCase().includes(searchText.toLowerCase())) return null;
          const pad = 2;
          return (
            <div
              key={`search-hl-${item.id}`}
              style={{
                position: 'absolute', left: item.x - pad, top: item.y - pad, width: item.width + pad * 2, height: item.height + pad * 2,
                backgroundColor: 'rgba(255, 235, 59, 0.4)', border: '2px solid rgb(255, 193, 7)', borderRadius: '4px',
                pointerEvents: 'none', zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            />
          )
        })}
      </div>

      {selectedBlock && !isEditing && (
        <TextContextToolbar
          block={selectedBlock} pageNum={pageNum}
          pos={{ x: selectedBlock.x * zoom, y: selectedBlock.y * zoom }}
          onEdit={() => setEditingId(selectedBlock.id)}
          onClose={() => setSelectedElement(null, null)}
        />
      )}
    </div>
  )
}

/* =========================================================
   COMPONENTE PADRE: El contenedor de scroll continuo
========================================================= */
export default function PdfCanvas() {
  const { file, pageCount, currentPage, zoom } = usePdfStore()

  // 🎯 SCROLL AUTOMÁTICO AL CAMBIAR currentPage DESDE LAS MINIATURAS
  useEffect(() => {
    if (!currentPage) return
    const element = document.querySelector(`[data-page="${currentPage}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentPage])

  if (!file) return null

  return (
    <div 
      className={styles.wrapper} 
      style={{
        overflowY: 'auto',
        overflowX: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        gap: '40px',
        backgroundColor: '#e5e7eb',
        height: '100%'
      }}
    >
      {/* Indicador flotante tipo píldora */}
      <div style={{
        position: 'fixed',
        bottom: '29px',
        right: '220px',
        zIndex: 100,
        background: 'var(--bg-card, rgba(24, 24, 27, 0.85))',
        backdropFilter: 'blur(12px)',
        color: 'var(--tx-1, white)',
        padding: '8px 16px',
        borderRadius: '99px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'none'
      }}>
        Página {currentPage} de {pageCount} &nbsp;|&nbsp; {Math.round(zoom * 100)}%
      </div>

      {/* Mapeamos y dibujamos TODAS las hojas */}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => (
        <PdfPage key={pageNum} pageNum={pageNum} />
      ))}
    </div>
  )
}