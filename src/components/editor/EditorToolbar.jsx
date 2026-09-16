import React, { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
  MousePointer2, Type, Image, Pencil, Square, PenLine,
  Highlighter, EyeOff, Undo2, Redo2, ZoomIn, ZoomOut,
  Download, Scan, Loader2, Bold, Italic, Underline,
  PanelLeft, Search, ChevronUp, ChevronDown, X, 
  BrainCircuit, Printer, FileText, Volume2, Pause
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import { exportPdf, downloadBytes } from '../../lib/pdfExporter.js'
import { renderPage } from '../../lib/pdfRenderer.js'
import { ocrCanvas } from '../../lib/ocrEngine.js'
import DropZone from '../ui/DropZone.jsx'
import styles from './EditorToolbar.module.css'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

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
    currentPage, setCurrentPage, addTextBlock,
    addImage, activeShape, setActiveShape,
    brushSize, setBrushSize, brushColor, setBrushColor, brushType, setBrushType,
    selectedElement, selectedElementPage,
    searchText, setSearchText,
    updateTextBlock, commitExtractedEdit,
    undoEdit, redoEdit, mobilePagesOpen, setMobilePagesOpen
  } = usePdfStore()

  // Estados de IA, OCR y Lector de Voz
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [aiSummarizing, setAiSummarizing] = useState(false)
  
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false)

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Estados de Búsqueda
  const [showSearch, setShowSearch] = useState(false)
  const [searchMatches, setSearchMatches] = useState([])
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)
  const [isSearching, setIsSearching] = useState(false)

  // Referencias (Memoria para inputs y portapapeles)
  const fileInputRef = useRef(null)
  const clipboardRef = useRef(null)

  // Sincronización de estilos del elemento seleccionado
  const sel = selectedElement
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState(12)
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)
  const [color, setColor] = useState('#000000')

  useEffect(() => {
    if (!sel) return
    const rawFamily = sel.fontFamily || 'Arial'
    const match = FONTS.find(f => rawFamily.toLowerCase().includes(f.toLowerCase()))
    setFontFamily(match || 'Arial')
    setFontSize(Math.round(sel.fontSize || 12))
    setBold(sel.fontBold || false)
    setItalic(sel.fontItalic || false)
    setUnderline(sel.fontUnderline || false)
    setColor(sel.color || '#000000')
  }, [sel?.id, sel?.fontBold, sel?.fontItalic, sel?.fontSize, sel?.color])

  /* ─────────────────────────────────────────────────────────
     ⌨️ ATAJOS DE TECLADO GLOBALES
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // 🛡️ ESCUDO: Si escribe en un input, no interrumpimos
      const isTyping = e.target.tagName.toLowerCase() === 'input' || 
                       e.target.tagName.toLowerCase() === 'textarea' ||
                       e.target.isContentEditable;

      // Ctrl + F: Búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault(); setShowSearch(true); return;
      }
      // Ctrl + P: Imprimir
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        if (file) handlePrint()
        else toast.error('No hay documento para imprimir')
        return
      }

      if (isTyping) return

      // Ctrl + Z: Deshacer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo() 
        else handleUndo()
      }
      // Ctrl + Y: Rehacer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault(); handleRedo();
      }
      // Ctrl + C: Copiar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedElement) {
        e.preventDefault()
        clipboardRef.current = { ...selectedElement }
        toast.success('Copiado', { duration: 1000 })
      }
      // Ctrl + V: Pegar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboardRef.current) {
        e.preventDefault()
        const newElement = {
          ...clipboardRef.current,
          id: `copy-${Date.now()}`,
          x: clipboardRef.current.x + 20,
          y: clipboardRef.current.y + 20,
          isEdited: true 
        }
        if (newElement.type === 'image') addImage(currentPage, newElement)
        else addTextBlock(currentPage, newElement)
        toast.success('Pegado', { duration: 1000 })
      }
      // Ctrl + X: Cortar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && selectedElement) {
        e.preventDefault()
        clipboardRef.current = { ...selectedElement }
        updateTextBlock(currentPage, selectedElement.id, { opacity: 0, text: '' }) 
        toast.success('Cortado', { duration: 1000 })
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts)
    return () => window.removeEventListener('keydown', handleGlobalShortcuts)
  }, [file, currentPage, selectedElement, addTextBlock, addImage, updateTextBlock])

  /* ─────────────────────────────────────────────────────────
     📥 MANEJO DE CIERRE Y GUARDADO NATIVO
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!ipcRenderer) return

    const handleRequestClose = () => {
      const state = usePdfStore.getState()
      const totalEdits = Object.values(state.editLayers || {}).reduce(
        (sum, layer) => sum + (layer.texts?.length || 0) + (layer.annotations?.length || 0), 0
      )
      if (state.file && totalEdits > 0) ipcRenderer.send('show-save-dialog')
      else ipcRenderer.send('force-close-app')
    }

    ipcRenderer.on('request-close-status', handleRequestClose)
    return () => ipcRenderer.removeAllListeners('request-close-status')
  }, [])

  useEffect(() => {
    if (!ipcRenderer) return

    const handleSaveAndClose = async () => {
      const tid = toast.loading('Preparando archivo para guardar...')
      try {
        const bytes = await exportPdf(file, editLayers, pageCount, pageBgs, blockBgs)
        toast.dismiss(tid)
        
        const result = await ipcRenderer.invoke(
          'save-file-natively', 
          bytes, 
          `pdfzero-${fileName || 'edited.pdf'}`
        )
        
        if (result.success) ipcRenderer.send('force-close-app')
        else if (result.canceled) toast('Cierre cancelado. La app sigue abierta.', { icon: 'ℹ️' })
        else toast.error('Error al guardar: ' + result.error)
      } catch (e) {
        toast.error('Error al generar PDF: ' + e.message, { id: tid })
      }
    }

    ipcRenderer.on('trigger-save-and-close', handleSaveAndClose)
    return () => ipcRenderer.removeAllListeners('trigger-save-and-close')
  }, [file, editLayers, pageCount, pageBgs, blockBgs, fileName])

  /* ─────────────────────────────────────────────────────────
     HERRAMIENTAS DE EDICIÓN Y FORMATO
  ───────────────────────────────────────────────────────── */
  const handleImageUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return
    const reader = new FileReader()
    reader.onload = (evento) => {
      addImage(currentPage, {
        id: `img-${Date.now()}`, type: 'image', src: evento.target.result,
        x: 50, y: 50, width: 150, height: 150, isEdited: true
      })
      toast.success('Imagen insertada correctamente')
    }
    reader.readAsDataURL(uploadedFile)
    e.target.value = null 
  }

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
      'Arial': 'Arial, "Noto Sans", Helvetica, sans-serif',
      'Helvetica': 'Helvetica, Arial, sans-serif',
      'Times New Roman':'"Times New Roman", "Noto Serif", Times, serif',
      'Georgia': 'Georgia, "Noto Serif", serif',
      'Courier New': '"Courier New", Courier, monospace',
      'Verdana': 'Verdana, Arial, sans-serif',
      'Tahoma': 'Tahoma, Arial, sans-serif',
      'Trebuchet MS': '"Trebuchet MS", Arial, sans-serif',
      'Calibri': 'Calibri, Arial, sans-serif',
      'Cambria': 'Cambria, Georgia, serif',
      'Garamond': 'Garamond, Georgia, serif',
      'Palatino': '"Palatino Linotype", Georgia, serif',
    }
    applyFormat({ fontFamily: cssMap[f] || f, fontName: f })
  }

  const handleFontSize = (v) => {
    const n = Math.max(4, Math.min(200, Number(v)))
    setFontSize(n)
    applyFormat({ fontSize: n })
  }

  const handleBold = () => { setBold(!bold); applyFormat({ fontBold: !bold }) }
  const handleItalic = () => { setItalic(!italic); applyFormat({ fontItalic: !italic }) }
  const handleUnderline = () => { setUnderline(!underline); applyFormat({ fontUnderline: !underline }) }
  const handleColor = (v) => { setColor(v); applyFormat({ color: v }) }

  const handleUndo = () => undoEdit() ? toast('Cambio deshecho') : toast('Nada que deshacer')
  const handleRedo = () => redoEdit() ? toast('Cambio rehecho') : toast('Nada que rehacer')

  /* ─────────────────────────────────────────────────────────
     IMPRESIÓN Y EXPORTACIÓN WEB
  ───────────────────────────────────────────────────────── */
  const handleExport = async () => {
    if (!file) { toast.error('No hay PDF cargado'); return }
    const tid = toast.loading('Exportando PDF...')
    try {
      const bytes = await exportPdf(file, editLayers, pageCount, pageBgs, blockBgs)
      downloadBytes(bytes, `pdfzero-${fileName || 'edited.pdf'}`)
      toast.success('¡PDF descargado con éxito!', { id: tid })
    } catch (e) {
      toast.error('Fallo al exportar: ' + e.message, { id: tid })
    }
  }

  const handlePrint = async () => {
    if (!file) { toast.error('No hay PDF cargado'); return }
    const tid = toast.loading('Preparando impresión...')
    try {
      const bytes = await exportPdf(file, editLayers, pageCount, pageBgs, blockBgs)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = url
      document.body.appendChild(iframe)
      
      iframe.onload = () => {
        toast.dismiss(tid)
        iframe.contentWindow.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, 10000)
      }
    } catch (e) {
      toast.error('Error al imprimir: ' + e.message, { id: tid })
    }
  }

  /* ─────────────────────────────────────────────────────────
     🔍 BÚSQUEDA
  ───────────────────────────────────────────────────────── */
  const handleRealSearch = async (e) => {
    if (e.key === 'Enter' && searchText.trim() !== '') {
      setIsSearching(true)
      const tid = toast.loading('Buscando en el documento...')
      
      try {
        const pdfBytes = file instanceof ArrayBuffer ? file.slice(0) : await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument(pdfBytes).promise
        let foundPages = []

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map(item => item.str).join(' ')
          if (pageText.toLowerCase().includes(searchText.toLowerCase())) foundPages.push(i)
        }

        setSearchMatches(foundPages)
        if (foundPages.length > 0) {
          setCurrentMatchIdx(0)
          setCurrentPage(foundPages[0]) 
          toast.success(`Se encontraron ${foundPages.length} coincidencias`, { id: tid })
        } else {
          toast.error('No se encontró el texto', { id: tid })
        }
      } catch (error) {
        toast.error('Error al buscar', { id: tid })
      } finally {
        setIsSearching(false)
      }
    }
  }

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length
    setCurrentMatchIdx(nextIdx)
    setCurrentPage(searchMatches[nextIdx])
  }

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length
    setCurrentMatchIdx(prevIdx)
    setCurrentPage(searchMatches[prevIdx])
  }

  /* ─────────────────────────────────────────────────────────
     ✨ IA: RESUMEN Y LECTURA
  ───────────────────────────────────────────────────────── */
  const handleAISummary = async () => {
    if (!file) return
    setAiSummarizing(true)
    const tid = toast.loading('Extrayendo texto para la IA...', { style: { minWidth: '250px' }})
    
    try {
      const pdfBytes = file instanceof ArrayBuffer ? file.slice(0) : await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument(pdfBytes).promise
      let fullText = ''
      
      const pagesToRead = Math.min(pdf.numPages, 3)
      for (let i = 1; i <= pagesToRead; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        fullText += textContent.items.map(item => item.str).join(' ') + '\n'
      }

      toast.loading('Analizando con IA...', { id: tid })

      // CLAVE SEGURA (VITE INYECTA EL .ENV AQUÍ)
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Analiza este documento y dame un resumen profesional de máximo 10 líneas destacando lo más importante:\n\n${fullText}` }]
          }]
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'Error en la API de Google')
      }
      
      const data = await response.json()
      if (!data.candidates || data.candidates.length === 0) throw new Error('La IA no devolvió ningún resumen')
      
      setSummaryText(data.candidates[0].content.parts[0].text)
      setShowSummaryModal(true)
      toast.success('¡Resumen generado!', { id: tid })
    } catch (error) {
      console.error('Error detallado de IA:', error)
      toast.error(`La IA falló: ${error.message}`, { id: tid })
    } finally {
      setAiSummarizing(false)
    }
  }

  const toggleSummaryVoice = () => {
    if (!window.speechSynthesis) return toast.error('Voz no soportada')
    
    if (isSpeakingSummary) {
      window.speechSynthesis.cancel()
      setIsSpeakingSummary(false)
    } else {
      const utterance = new SpeechSynthesisUtterance(summaryText)
      utterance.lang = 'es-MX'
      utterance.onstart = () => setIsSpeakingSummary(true)
      utterance.onend = () => setIsSpeakingSummary(false)
      utterance.onerror = () => setIsSpeakingSummary(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  const toggleReadAloud = async () => {
    if (!window.speechSynthesis) return toast.error('Sistema de voz no soportado.')
    if (isSpeaking && !isPaused) { window.speechSynthesis.pause(); setIsPaused(true); return; }
    if (isSpeaking && isPaused) { window.speechSynthesis.resume(); setIsPaused(false); return; }
    if (!file) return;
    
    const tid = toast.loading('Preparando lectura...');
    try {
      const pdfBytes = file instanceof ArrayBuffer ? file.slice(0) : await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(pdfBytes).promise;
      const page = await pdf.getPage(currentPage);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');

      if (!pageText.trim()) { toast.error('No hay texto para leer.', { id: tid }); return; }
      toast.dismiss(tid);
      
      const utterance = new SpeechSynthesisUtterance(pageText);
      utterance.lang = 'es-MX';
      utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      toast.error('Error al leer: ' + error.message, { id: tid });
      setIsSpeaking(false);
    }
  }

  const stopReadAloud = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false); setIsPaused(false);
    }
  }

  useEffect(() => {
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); }
  }, [])

  /* ─────────────────────────────────────────────────────────
     💾 DESCARGAS DE IA Y OCR
  ───────────────────────────────────────────────────────── */
  const downloadSummaryTxt = () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Resumen_Aicrag_${fileName || 'PDF'}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSummaryWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Resumen Aicrag PDF</title></head>
      <body style="font-family: Arial, sans-serif;">
        <h2>Resumen del Documento</h2>
        <p style="font-size: 14px; line-height: 1.5;">${summaryText.replace(/\n/g, '<br>')}</p>
      </body>
      </html>
    `
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Resumen_Aicrag_${fileName || 'PDF'}.doc`; a.click()
    URL.revokeObjectURL(url)
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
      toast.success(`Encontradas ${words.length} palabras`, { id: tid })
    } catch (e) {
      toast.error('OCR falló: ' + e.message, { id: tid })
    } finally { setOcrRunning(false); setOcrProgress(0) }
  }

  const hasSelection = !!sel

  return (
    <div className={styles.toolbar}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/png, image/jpeg, image/jpg" onChange={handleImageUpload} />

      <button className={`${styles.toolBtn} ${styles.mobileOnly} ${mobilePagesOpen ? styles.active : ''}`} onClick={() => setMobilePagesOpen(!mobilePagesOpen)}>
        <PanelLeft size={16} />
      </button>

      <DropZone compact />
      <div className={styles.sep} />

      <button className={styles.toolBtn} onClick={() => setShowSearch(true)} title="Buscar texto (Ctrl+F)"><Search size={15} /></button>
      <div className={styles.sep} />

      {/* Herramientas Principales */}
      <div className={styles.toolGroup}>
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button key={id}
            className={`${styles.toolBtn} ${activeTool === id ? styles.active : ''}`}
            onClick={() => {
              if (id === 'image') { fileInputRef.current.click(); setActiveTool(id) } 
              else { setActiveTool(id) }
            }}
            title={label}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {activeTool === 'shape' && (
        <div className={styles.toolGroup} style={{ marginLeft: '10px', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px' }}>
          <select className={styles.select} value={activeShape} onChange={(e) => setActiveShape(e.target.value)} title="Tipo de forma">
            <option value="rect">⬛ Cuadrado / Rectángulo</option>
            <option value="circle">⚫ Círculo / Óvalo</option>
            <option value="line">➖ Línea</option>
          </select>
          <input type="color" className={styles.colorPicker} value={brushColor} onChange={(e) => setBrushColor(e.target.value)} title="Color de la forma" style={{ marginLeft: '8px' }} />
        </div>
      )}

      {activeTool === 'draw' && (
        <div className={styles.toolGroup} style={{ marginLeft: '10px', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select className={styles.select} value={brushType} onChange={(e) => setBrushType(e.target.value)} title="Tipo de pincel">
            <option value="solid">🖍️ Lápiz sólido</option>
            <option value="marker">🖊️ Marcador</option>
          </select>
          <input type="color" className={styles.colorPicker} value={brushColor} onChange={(e) => setBrushColor(e.target.value)} title="Color del pincel" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Grosor: {brushSize}</span>
            <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} title="Tamaño del pincel" style={{ width: '80px' }} />
          </div>
        </div>
      )}

      <div className={`${styles.sep} ${styles.desktopOnly}`} />

      {/* Formato de Texto */}
      <select className={`${styles.select} ${styles.desktopOnly}`} value={fontFamily} onChange={e => handleFontFamily(e.target.value)} disabled={!hasSelection}>
        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <input type="number" className={`${styles.numInput} ${styles.desktopOnly}`} value={fontSize} min={4} max={200} disabled={!hasSelection} onChange={e => handleFontSize(e.target.value)} />
      <button className={`${styles.fmtBtn} ${styles.desktopOnly} ${bold ? styles.fmtActive : ''}`} onClick={handleBold} disabled={!hasSelection}><Bold size={14} /></button>
      <button className={`${styles.fmtBtn} ${styles.desktopOnly} ${italic ? styles.fmtActive : ''}`} onClick={handleItalic} disabled={!hasSelection}><Italic size={14} /></button>
      <button className={`${styles.fmtBtn} ${styles.desktopOnly} ${underline ? styles.fmtActive : ''}`} onClick={handleUnderline} disabled={!hasSelection}><Underline size={14} /></button>
      <div className={`${styles.sep} ${styles.desktopOnly}`} />
      <input type="color" className={`${styles.colorPicker} ${styles.desktopOnly}`} value={color} disabled={!hasSelection} onChange={e => handleColor(e.target.value)} />

      {/* Undo / Redo */}
      <div className={styles.sep} />
      <button className={styles.toolBtn} onClick={handleUndo} title="Deshacer (Ctrl+Z)"><Undo2 size={15} /></button>
      <button className={styles.toolBtn} onClick={handleRedo} title="Rehacer (Ctrl+Y)"><Redo2 size={15} /></button>

      {/* Zoom */}
      <div className={styles.sep} />
      <button className={styles.toolBtn} onClick={() => setZoom(zoom - 0.2)} title="Alejar"><ZoomOut size={15} /></button>
      <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
      <button className={styles.toolBtn} onClick={() => setZoom(zoom + 0.2)} title="Acercar"><ZoomIn size={15} /></button>

      <div className={styles.spacer} />

      {/* Controles de Lector de Voz */}
      <div className={styles.toolGroup} style={{ marginLeft: '8px', background: 'var(--bg-card)', padding: '2px 4px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button className={`${styles.toolBtn} ${isSpeaking && !isPaused ? styles.active : ''}`} onClick={toggleReadAloud} disabled={!file} title={isSpeaking && !isPaused ? "Pausar lectura" : "Leer página (TTS)"}>
          {isSpeaking && !isPaused ? <Pause size={15} /> : <Volume2 size={15} />}
        </button>
        {isSpeaking && (
          <button className={styles.toolBtn} onClick={stopReadAloud} title="Detener lectura"><Square size={14} fill="#ef4444" color="#ef4444" /></button>
        )}
      </div>

      {/* Botones de IA, OCR y Exportar */}
      <button className={`${styles.aiBtn} ${styles.aiBtnPurple}`} onClick={handleAISummary} disabled={aiSummarizing || !file}>
        <BrainCircuit size={13} /> Resumir PDF
      </button>

      <button className={`${styles.aiBtn} ${ocrRunning ? styles.aiBtnActive : ''}`} onClick={handleOcr} disabled={ocrRunning || !file} style={{ marginLeft: '8px' }}>
        {ocrRunning ? <><Loader2 size={13} className={styles.spin} /> OCR {ocrProgress}%</> : <><Scan size={13} /> Extraer Texto</>}
      </button>

      <div className={styles.sep} />

      <button className={styles.exportBtn} onClick={handleExport} disabled={!file}>
        <Download size={14} /> Guardar
      </button>
      <button className={styles.exportBtn} onClick={handlePrint} disabled={!file} style={{ background: 'var(--bg-hover)', color: 'var(--tx-1)' }}>
        <Printer size={14} /> Imprimir
      </button>


      {/* =========================================
          ISLA FLOTANTE DE BÚSQUEDA
      ========================================= */}
      {showSearch && (
        <div className={styles.floatingSearch}>
          <Search size={16} className={styles.searchIcon} />
          <input
            autoFocus type="text" placeholder="Escribe para buscar y Enter..."
            value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={handleRealSearch} disabled={isSearching}
          />
          {searchMatches.length > 0 && (
            <span className={styles.matchCount}>{currentMatchIdx + 1} de {searchMatches.length}</span>
          )}
          <div className={styles.searchNavFloat}>
            <button onClick={handlePrevMatch} disabled={!searchMatches.length} title="Anterior"><ChevronUp size={16} /></button>
            <button onClick={handleNextMatch} disabled={!searchMatches.length} title="Siguiente"><ChevronDown size={16} /></button>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <button className={styles.closeBtnFloat} onClick={() => { setShowSearch(false); setSearchMatches([]); setSearchText(''); }} title="Cerrar (Esc)"><X size={16} /></button>
          </div>
        </div>
      )}


      {/* =========================================
          PANTALLA DE CARGA GLOBAL (BLOQUEO SUAVE)
      ========================================= */}
      {aiSummarizing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999, // "Nivel Dios" para tapar toda la app
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)', // Fondo oscuro con cristal
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'wait' // Cambia el puntero al relojito de arena
        }}>
          <Loader2 size={60} color="#a855f7" className={styles.spin} />
          <h2 style={{ color: '#fff', marginTop: '24px', letterSpacing: '0.5px' }}>
            Generando Resumen...
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>
            No cierres la ventana, la IA está procesando el texto.
          </p>
        </div>
      )}


      {/* =========================================
          MODAL DE RESUMEN IA
      ========================================= */}
      {showSummaryModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-card, #18181b)', width: '90%', maxWidth: '600px',
            borderRadius: '16px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--tx-1, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BrainCircuit size={20} color="#a855f7" /> Resumen Inteligente
              </h3>
              <button 
                onClick={() => { window.speechSynthesis?.cancel(); setIsSpeakingSummary(false); setShowSummaryModal(false); }} 
                style={{ background: 'transparent', border: 'none', color: 'var(--tx-3)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={summaryText} onChange={(e) => setSummaryText(e.target.value)}
              style={{
                width: '100%', height: '200px', padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: 'var(--tx-2, #ddd)', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit', outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <button 
                onClick={toggleSummaryVoice}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', 
                  background: isSpeakingSummary ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)', 
                  color: isSpeakingSummary ? '#ef4444' : 'var(--tx-1)', 
                  border: `1px solid ${isSpeakingSummary ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, 
                  cursor: 'pointer', transition: 'all 0.2s' 
                }}
              >
                {isSpeakingSummary ? <Square size={16} fill="#ef4444" /> : <Volume2 size={16} />}
                {isSpeakingSummary ? 'Detener' : 'Leer en voz alta'}
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={downloadSummaryTxt} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--tx-1)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  <FileText size={16} /> TXT
                </button>
                <button onClick={downloadSummaryWord} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                  <Download size={16} /> Word
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}