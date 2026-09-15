import React, { useState, useEffect, useRef } from 'react'
import {
  MousePointer2, Type, Image, Pencil, Square, PenLine,
  Highlighter, EyeOff, Undo2, Redo2, ZoomIn, ZoomOut,
  Download, Scan, Sparkles, Loader2, Bold, Italic, Underline,
  PanelLeft, SlidersHorizontal
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import { exportPdf, downloadBytes } from '../../lib/pdfExporter.js'
import { renderPage } from '../../lib/pdfRenderer.js'
import { ocrCanvas } from '../../lib/ocrEngine.js'
import DropZone from '../ui/DropZone.jsx'
import styles from './EditorToolbar.module.css'

const TOOLS = [
  { id: 'select',    icon: MousePointer2, label: 'Seleccionar y editar texto' },
  { id: 'text',      icon: Type,          label: 'Añadir caja de texto' },
  { id: 'image',     icon: Image,         label: 'Añadir imagen' },
  { id: 'draw',      icon: Pencil,        label: 'Dibujar' },
  { id: 'shape',     icon: Square,        label: 'Forma' },
  { id: 'sign',      icon: PenLine,       label: 'Firmar' },
  { id: 'highlight', icon: Highlighter,   label: 'Resaltar' },
  { id: 'redact',    icon: EyeOff,        label: 'Redactar' },
]

const FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
  'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS',
  'Calibri', 'Cambria', 'Garamond', 'Palatino',
]

export default function EditorToolbar() {
  const {
    activeTool, setActiveTool, zoom, setZoom,
    file, editLayers, pageCount, fileName, pageBgs, blockBgs,
    currentPage, addTextBlock,
    addImage,
    activeShape, setActiveShape,
    brushSize, setBrushSize,
    brushColor, setBrushColor,
    brushType, setBrushType,
    selectedElement, selectedElementPage,
    updateTextBlock, commitExtractedEdit,
    undoEdit, redoEdit,
    mobilePagesOpen, mobilePropertiesOpen,
    setMobilePagesOpen, setMobilePropertiesOpen,
  } = usePdfStore()

  const [ocrRunning,   setOcrRunning]   = useState(false)
  const [ocrProgress,  setOcrProgress]  = useState(0)

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef(null)

  // Mirror selected element's current formatting in the toolbar
  const sel = selectedElement
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize,   setFontSize]   = useState(12)
  const [bold,       setBold]       = useState(false)
  const [italic,     setItalic]     = useState(false)
  const [underline,  setUnderline]  = useState(false)
  const [color,      setColor]      = useState('#000000')

  // Sync toolbar state when selection changes
  useEffect(() => {
    if (!sel) return
    const rawFamily = sel.fontFamily || 'Arial'
    const match = FONTS.find(f => rawFamily.toLowerCase().includes(f.toLowerCase()))
    setFontFamily(match || 'Arial')
    setFontSize(Math.round(sel.fontSize || 12))
    setBold(sel.fontBold   || false)
    setItalic(sel.fontItalic || false)
    setUnderline(sel.fontUnderline || false)
    setColor(sel.color || '#000000')
  }, [sel?.id, sel?.fontBold, sel?.fontItalic, sel?.fontSize, sel?.color])

  // Función que se ejecuta al seleccionar una imagen de tu computadora
  const handleImageUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      const base64Image = evento.target.result
      
      const nuevaImagen = {
        id: `img-${Date.now()}`,
        type: 'image',
        src: base64Image,
        x: 50,          // Posición X inicial en el lienzo
        y: 50,          // Posición Y inicial en el lienzo
        width: 150,     // Ancho inicial
        height: 150,    // Alto inicial
        isEdited: true
      }

      addImage(currentPage, nuevaImagen)
      toast.success('Imagen insertada correctamente')
    }
    reader.readAsDataURL(uploadedFile)
    e.target.value = null // Limpiar input
  }

  // Apply a formatting update to the selected element
  const applyFormat = (updates) => {
    if (!sel || !selectedElementPage) return

    if (sel.isExtracted && !sel.isEdited) {
      commitExtractedEdit(selectedElementPage, sel, sel.str)
      updateTextBlock(selectedElementPage, `edited-${sel.id}`, updates)
    } else {
      updateTextBlock(selectedElementPage, sel.id, updates)
    }
  }

  const handleFontFamily = (f) => {
    setFontFamily(f)
    const cssMap = {
      'Arial':              'Arial, "Noto Sans", Helvetica, sans-serif',
      'Helvetica':          'Helvetica, Arial, sans-serif',
      'Times New Roman':'"Times New Roman", "Noto Serif", Times, serif',
      'Georgia':            'Georgia, "Noto Serif", serif',
      'Courier New':    '"Courier New", Courier, monospace',
      'Verdana':            'Verdana, Arial, sans-serif',
      'Tahoma':             'Tahoma, Arial, sans-serif',
      'Trebuchet MS':   '"Trebuchet MS", Arial, sans-serif',
      'Calibri':            'Calibri, Arial, sans-serif',
      'Cambria':            'Cambria, Georgia, serif',
      'Garamond':           'Garamond, Georgia, serif',
      'Palatino':           '"Palatino Linotype", Georgia, serif',
    }
    applyFormat({ fontFamily: cssMap[f] || f, fontName: f })
  }

  const handleFontSize = (v) => {
    const n = Math.max(4, Math.min(200, Number(v)))
    setFontSize(n)
    applyFormat({ fontSize: n })
  }

  const handleBold = () => {
    const next = !bold
    setBold(next)
    applyFormat({ fontBold: next })
  }

  const handleItalic = () => {
    const next = !italic
    setItalic(next)
    applyFormat({ fontItalic: next })
  }

  const handleUnderline = () => {
    const next = !underline
    setUnderline(next)
    applyFormat({ fontUnderline: next })
  }

  const handleColor = (v) => {
    setColor(v)
    applyFormat({ color: v })
  }

  const handleUndo = () => {
    if (!undoEdit()) { toast('Nada que deshacer'); return }
    toast('Cambio deshecho', { duration: 800 })
  }

  const handleRedo = () => {
    if (!redoEdit()) { toast('Nothing to redo'); return }
    toast('Nada que rehacer', { duration: 800 })
  }

  const handleExport = async () => {
    if (!file) { toast.error('No PDF loaded'); return }
    const tid = toast.loading('Exporting PDF...')
    try {
      const bytes = await exportPdf(file, editLayers, pageCount, pageBgs, blockBgs)
      downloadBytes(bytes, `pdfzero-${fileName || 'edited.pdf'}`)
      toast.success('PDF downloaded!', { id: tid })
    } catch (e) {
      toast.error('Export failed: ' + e.message, { id: tid })
    }
  }

  const handleOcr = async () => {
    if (!file || ocrRunning) return
    setOcrRunning(true); setOcrProgress(0)
    const tid = toast.loading('Iniciando OCR...')
    try {
      const { canvas } = await renderPage(currentPage, 1)
      const words = await ocrCanvas(canvas, pct => {
        setOcrProgress(pct)
        toast.loading(`OCR: ${pct}%`, { id: tid })
      })
      if (!words.length) { toast.error('Ningún texto encontrado', { id: tid }); return }
      words.forEach(w => addTextBlock(currentPage, w))
      toast.success(`Encontrado ${words.length} palabras`, { id: tid })
    } catch (e) {
      toast.error('OCR failed: ' + e.message, { id: tid })
    } finally { setOcrRunning(false); setOcrProgress(0) }
  }

  const hasSelection = !!sel

  return (
    <div className={styles.toolbar}>
      {/* Input de archivo invisible que se activa al hacer clic en el botón de imagen */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleImageUpload}
      />

      {/* Mobile-only: toggle the Pages drawer */}
      <button
        className={`${styles.toolBtn} ${styles.mobileOnly} ${mobilePagesOpen ? styles.active : ''}`}
        onClick={() => setMobilePagesOpen(!mobilePagesOpen)}
        title="Pages" aria-label="Toggle pages panel"
      >
        <PanelLeft size={16} />
      </button>

      <DropZone compact />
      <div className={styles.sep} />

      {/* Drawing tools */}
      <div className={styles.toolGroup}>
        {TOOLS.map(({ id, icon: Icon, label }) => {
          const isImage = id === 'image'
          return (
            <button key={id}
              className={`${styles.toolBtn} ${activeTool === id ? styles.active : ''}`}
              onClick={() => {
                if (isImage) {
                  fileInputRef.current.click() // Dispara la selección de archivos
                  setActiveTool(id)
                } else {
                  setActiveTool(id)
                }
              }}
              title={label}
              aria-label={label}
            >
              <Icon size={15} />
            </button>
          )
        })}
      </div>

      {activeTool === 'shape' && (
        <div className={styles.toolGroup} style={{ marginLeft: '10px', background: '#f3f4f6', padding: '2px 8px', borderRadius: '6px' }}>
          <select 
            className={styles.select} 
            value={activeShape} 
            onChange={(e) => setActiveShape(e.target.value)}
            title="Tipo de forma"
          >
            <option value="rect">⬛ Cuadrado / Rectángulo</option>
            <option value="circle">⚫ Círculo / Óvalo</option>
            <option value="line">➖ Línea</option>
          </select>

          <input
            type="color"
            className={styles.colorPicker}
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            title="Color de la forma"
            style={{ marginLeft: '8px' }}
          />
        </div>
      )}

      {/* Opciones si está seleccionada la herramienta DIBUJAR */}
      {activeTool === 'draw' && (
        <div className={styles.toolGroup} style={{ marginLeft: '10px', background: '#f3f4f6', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          <select 
            className={styles.select} 
            value={brushType} 
            onChange={(e) => setBrushType(e.target.value)}
            title="Tipo de pincel"
          >
            <option value="solid">🖍️ Lápiz sólido</option>
            <option value="marker">🖊️ Marcador (Translúcido)</option>
          </select>

          <input
            type="color"
            className={styles.colorPicker}
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            title="Color del pincel"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Grosor: {brushSize}</span>
            <input
              type="range"
              min="1"
              max="30"
              value={brushSize}
              onChange={(e) => setBrushSize(e.target.value)}
              title="Tamaño del pincel"
              style={{ width: '80px' }}
            />
          </div>
        </div>
      )}

      <div className={`${styles.sep} ${styles.desktopOnly}`} />

      {/* Font family */}
      <select
        className={`${styles.select} ${styles.desktopOnly}`}
        value={fontFamily}
        onChange={e => handleFontFamily(e.target.value)}
        disabled={!hasSelection}
        title="Font family"
        aria-label="Font family"
      >
        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      {/* Font size */}
      <input
        type="number"
        className={`${styles.numInput} ${styles.desktopOnly}`}
        value={fontSize}
        min={4} max={200}
        disabled={!hasSelection}
        onChange={e => handleFontSize(e.target.value)}
        title="Font size"
        aria-label="Font size"
      />

      {/* Bold */}
      <button
        className={`${styles.fmtBtn} ${styles.desktopOnly} ${bold ? styles.fmtActive : ''}`}
        onClick={handleBold}
        disabled={!hasSelection}
        title="Bold"
        aria-label="Bold"
        aria-pressed={bold}
      >
        <Bold size={14} />
      </button>

      {/* Italic */}
      <button
        className={`${styles.fmtBtn} ${styles.desktopOnly} ${italic ? styles.fmtActive : ''}`}
        onClick={handleItalic}
        disabled={!hasSelection}
        title="Italic"
        aria-label="Italic"
        aria-pressed={italic}
      >
        <Italic size={14} />
      </button>

      {/* Underline */}
      <button
        className={`${styles.fmtBtn} ${styles.desktopOnly} ${underline ? styles.fmtActive : ''}`}
        onClick={handleUnderline}
        disabled={!hasSelection}
        title="Underline"
        aria-label="Underline"
        aria-pressed={underline}
      >
        <Underline size={14} />
      </button>

      <div className={`${styles.sep} ${styles.desktopOnly}`} />

      {/* Color */}
      <input
        type="color"
        className={`${styles.colorPicker} ${styles.desktopOnly}`}
        value={color}
        disabled={!hasSelection}
        onChange={e => handleColor(e.target.value)}
        title="Text color"
        aria-label="Text color"
      />

      <div className={styles.sep} />

      {/* Undo / Redo */}
      <button className={styles.toolBtn} onClick={handleUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
        <Undo2 size={15} />
      </button>
      <button className={styles.toolBtn} onClick={handleRedo} title="Redo (Ctrl+Y)" aria-label="Redo">
        <Redo2 size={15} />
      </button>

      <div className={styles.sep} />

      {/* Zoom */}
      <button className={styles.toolBtn} onClick={() => setZoom(zoom - 0.2)} title="Zoom out"><ZoomOut size={15} /></button>
      <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
      <button className={styles.toolBtn} onClick={() => setZoom(zoom + 0.2)} title="Zoom in"><ZoomIn size={15} /></button>

      <div className={styles.spacer} />

      <button
        className={`${styles.aiBtn} ${ocrRunning ? styles.aiBtnActive : ''}`}
        onClick={handleOcr} disabled={ocrRunning || !file}
      >
        {ocrRunning
          ? <><Loader2 size={13} className={styles.spin} /> OCR {ocrProgress}%</>
          : <><Scan size={13} /> Detectar texto</>}
      </button>

      <div className={styles.sep} />
      <div className={styles.sep} />

      {/* Mobile-only: toggle properties drawer */}
      <button
        className={`${styles.toolBtn} ${styles.mobileOnly} ${mobilePropertiesOpen ? styles.active : ''}`}
        onClick={() => setMobilePropertiesOpen(!mobilePropertiesOpen)}
        title="Properties" aria-label="Toggle properties panel"
      >
        <SlidersHorizontal size={16} />
      </button>

      <button className={styles.exportBtn} onClick={handleExport} disabled={!file}>
        <Download size={14} /> Descargar PDF
      </button>
    </div>
  )
}