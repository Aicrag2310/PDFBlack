import React, { useEffect, useCallback, useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../store/pdfStore.js'
import { loadPdf, getPageBaseSize } from '../lib/pdfRenderer.js'
import Navbar from '../components/layout/Navbar.jsx'
import EditorToolbar from '../components/editor/EditorToolbar.jsx'
import PageThumbnails from '../components/editor/PageThumbnails.jsx'
import PdfCanvas from '../components/editor/PdfCanvas.jsx'
import PropertiesPanel from '../components/editor/PropertiesPanel.jsx'
import DropZone from '../components/ui/DropZone.jsx'
import styles from './Editor.module.css'
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

export default function Editor() {
  const {
    file, setPageCount, fileName, zoom, currentPage, setCurrentPage, pageCount,
    mobilePagesOpen, mobilePropertiesOpen,
    setMobilePagesOpen, closeMobilePanels,
    setZoom,
  } = usePdfStore()
  // pdfReady gates PdfCanvas — only render after loadPdf() fully resolves
  const [pdfReady, setPdfReady] = useState(false)

  // 📂 ESCUCHAR SI WINDOWS ABRE UN PDF DIRECTAMENTE CON LA APP
  useEffect(() => {
    if (!ipcRenderer) return

    const handleOpenPdfFromOS = async (event, filePath) => {
      try {
        console.log('Abriendo PDF desde el sistema operativo:', filePath)
        
        const fs = window.require ? window.require('fs') : null
        if (!fs) throw new Error('Módulo fs no disponible')

        // 1. Leer el archivo como Buffer de Node
        const buffer = fs.readFileSync(filePath)
        
        // 2. Convertir el Buffer exactamente a ArrayBuffer limpio (igual que DropZone)
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        
        // 3. Extraer el nombre del archivo
        const fileName = filePath.split('\\').pop().split('/').pop()

        // 4. Llamar a setFile exactamente igual que lo hace tu DropZone (arrayBuffer, name, size)
        const { setFile } = usePdfStore.getState()
        setFile(arrayBuffer, fileName, buffer.length)
        
        toast.success(`Abierto: ${fileName}`)
      } catch (error) {
        console.error('Error al abrir el PDF del sistema:', error)
        toast.error('No se pudo abrir el archivo desde el sistema')
      }
    }

    ipcRenderer.on('open-pdf-from-os', handleOpenPdfFromOS)

    return () => {
      ipcRenderer.removeAllListeners('open-pdf-from-os')
    }
  }, [])

  useEffect(() => {
    if (!file) { setPdfReady(false); return }
    setPdfReady(false)  // reset so PdfCanvas remounts cleanly

    loadPdf(file)
      .then(async (doc) => {
        setPageCount(doc.numPages)

        // On narrow screens, the default 100% zoom renders pages wider than
        // the viewport, forcing horizontal scroll just to read a line of text.
        // Auto-fit zoom to the available canvas width before the first paint
        // so mobile users land on a comfortably-readable view immediately.
        if (window.innerWidth <= 768) {
          try {
            const { width } = await getPageBaseSize(1)
            // .canvas has ~32px total horizontal padding (see Editor.module.css .wrapper)
            const available = window.innerWidth - 40
            const fitZoom = available / width
            setZoom(fitZoom)
          } catch (_) { /* fall back to default zoom if measurement fails */ }
        }

        // Small rAF delay so React can flush the pageCount/zoom state
        // before PdfCanvas triggers its first renderPage()
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setPdfReady(true))
        })
        toast.success(`Cargando ${doc.numPages} pagina${doc.numPages > 1 ? 's' : ''}`)
      })
      .catch((e) => toast.error('Error al cargar el PDF: ' + e.message))
  }, [file, setPageCount])

  const handleKeyDown = useCallback((e) => {
    // Don't steal keys while user is typing in a text block
    if (e.target.isContentEditable) return

    // Page navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (currentPage < pageCount) setCurrentPage(currentPage + 1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (currentPage > 1) setCurrentPage(currentPage - 1)
    }
  }, [currentPage, pageCount, setCurrentPage])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={styles.page}>
      <Navbar variant="app" />
      <EditorToolbar />

      <div className={styles.workspace}>
        {file ? (
          <>
            {/* Backdrop — tapping it closes whichever mobile drawer is open */}
            <div
              className={`${styles.backdrop} ${(mobilePagesOpen || mobilePropertiesOpen) ? styles.backdropShow : ''}`}
              onClick={closeMobilePanels}
            />

            <aside className={`${styles.leftPanel} ${mobilePagesOpen ? styles.mobileOpen : ''}`}>
              <button
                className={styles.drawerClose}
                onClick={closeMobilePanels}
                aria-label="Close pages panel"
              >
                <X size={16} />
              </button>
              <PageThumbnails />
            </aside>

            <main className={styles.canvas}>
              {/* Only mount PdfCanvas after loadPdf() has resolved */}
              {pdfReady && <PdfCanvas />}
              {!pdfReady && (
                <div className={styles.loadingCanvas}>
                  <div className={styles.loadingSpinner} />
                  <span>Cargando PDF…</span>
                </div>
              )}
            </main>

            <aside className={`${styles.rightPanel} ${mobilePropertiesOpen ? styles.mobileOpen : ''}`}>
              <button
                className={styles.drawerClose}
                onClick={closeMobilePanels}
                aria-label="Close properties panel"
              >
                <X size={16} />
              </button>
              <PropertiesPanel />
            </aside>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyContent}>
              <h2 className={styles.emptyTitle}>Abre un PDF para comenzar a editarlo</h2>
              <p className={styles.emptySub}>
                Los archivos se procesan completamente en tu navegador — nunca se suben a ningún lugar.
              </p>
              <DropZone />
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className={styles.statusBar}>
          <span className={styles.statusFile}>📄 {fileName}</span>
          <span className={styles.statusCenter}>Página {currentPage} de {pageCount}</span>
          <span className={styles.statusRight}>
            <span className={styles.privacyDot} />
            <span className={styles.statusRightText}>Derechos reservados por PDFBlack(Aicrag)</span>
          </span>
        </div>
      )}
    </div>
  )
}
