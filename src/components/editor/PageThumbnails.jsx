import React, { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, RotateCcw, Copy, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import { renderThumbnail } from '../../lib/pdfRenderer.js'
import { rotatePdf, removePageFromPdf, addPageToPdf, importPageFromPdf, movePageInternal } from '../../lib/pdfExporter.js'
import styles from './PageThumbnails.module.css'

// 🗄️ Caché global en memoria para guardar las miniaturas ya renderizadas por pestaña/archivo
const thumbnailCache = {}

export default function PageThumbnails() {
  const { pageCount, currentPage, setCurrentPage, file, setFile, fileName, activeTabId } = usePdfStore()
  const [thumbs, setThumbs] = useState({})
  const [contextMenu, setContextMenu] = useState(null)
  const activeThumbRef = useRef(null)

  // 🚀 CARGA OPTIMIZADA DE MINIATURAS CON CACHÉ
  useEffect(() => {
    if (!file || !pageCount) return
    
    if (!window.__activePdfBuffers) window.__activePdfBuffers = {}
    window.__activePdfBuffers[activeTabId] = file

    // Si ya tenemos miniaturas cacheadas para esta pestaña, las cargamos al instante
    if (thumbnailCache[activeTabId] && Object.keys(thumbnailCache[activeTabId]).length >= pageCount) {
      setThumbs(thumbnailCache[activeTabId])
      return
    }

    let isMounted = true
    const currentThumbs = { ...(thumbnailCache[activeTabId] || {}) }
    setThumbs(currentThumbs)

    // Renderizamos solo las miniaturas que falten de forma secuencial o ligera para no trabar la UI
    const loadThumbsGradually = async () => {
      for (let i = 1; i <= pageCount; i++) {
        if (!isMounted) break
        if (!currentThumbs[i]) {
          try {
            const dataUrl = await renderThumbnail(i)
            if (isMounted && dataUrl) {
              currentThumbs[i] = dataUrl
              thumbnailCache[activeTabId] = { ...currentThumbs }
              setThumbs({ ...currentThumbs })
            }
          } catch (e) {
            console.error(`Error renderizando miniatura ${i}:`, e)
          }
        }
      }
    }

    loadThumbsGradually()

    return () => { isMounted = false }
  }, [file, pageCount, activeTabId])

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ block: 'nearest' })
  }, [currentPage])

  const handleRightClick = (e, pageNum) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, pageNum })
  }

  const closeMenu = () => setContextMenu(null)

  // Limpiar caché de esta pestaña cuando se modifique (rotar, borrar, mover)
  const invalidateCache = () => {
    delete thumbnailCache[activeTabId]
  }

  const handleRotate = async (pageNum) => {
    if (!file) return
    try {
      const bytes = await rotatePdf(file, pageNum, 90)
      invalidateCache()
      setFile(bytes, fileName, bytes.byteLength, true)
      toast.success('Página rotada 90°')
    } catch { toast.error('Error al rotar página') }
    closeMenu()
  }

  const handleDelete = async (pageNum) => {
    if (!file || pageCount <= 1) {
      toast.error('El PDF debe tener al menos una página')
      return
    }
    try {
      const bytes = await removePageFromPdf(file, pageNum)
      invalidateCache()
      setFile(bytes, fileName, bytes.byteLength, true)
      if (currentPage > pageNum && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
      toast.success('Página eliminada')
    } catch { toast.error('Error al eliminar página') }
    closeMenu()
  }

  const handleAddPage = async () => {
    if (!file) return
    try {
      const bytes = await addPageToPdf(file, pageCount)
      invalidateCache()
      setFile(bytes, fileName, bytes.byteLength, true)
      toast.success('Página blanca añadida')
    } catch { toast.error('Error al añadir página') }
  }

  const handleDragStart = (e, pageNum) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      sourcePage: pageNum,
      sourceTabId: activeTabId,
      fileName: fileName
    }))
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copyMove'
  }

  const handleDrop = async (e, targetPageNum) => {
    e.preventDefault()
    closeMenu()

    try {
      const rawData = e.dataTransfer.getData('application/json')
      if (!rawData) return
      const data = JSON.parse(rawData)

      if (data.sourceTabId !== activeTabId && window.__activePdfBuffers?.[data.sourceTabId]) {
        const sourceFileBuffer = window.__activePdfBuffers[data.sourceTabId]
        const bytes = await importPageFromPdf(sourceFileBuffer, data.sourcePage, file, targetPageNum)
        invalidateCache()
        // Invalidamos también la pestaña de origen por si acaso
        delete thumbnailCache[data.sourceTabId]
        setFile(bytes, fileName, bytes.byteLength, true)
        toast.success(`Página ${data.sourcePage} integrada con éxito`)
        return
      }

      if (data.sourcePage === targetPageNum) return

      const bytes = await movePageInternal(file, data.sourcePage, targetPageNum)
      invalidateCache()
      setFile(bytes, fileName, bytes.byteLength, true)
      setCurrentPage(targetPageNum)
      toast.success(`Página movida a la posición ${targetPageNum}`)
    } catch (error) {
      console.error('Error en Drag & Drop:', error)
      toast.error('No se pudo procesar la página')
    }
  }

  return (
    <div className={styles.panel} onClick={closeMenu}>
      <div className={styles.header}>
        <span className={styles.label}>Páginas</span>
        <span className={styles.count}>{pageCount}</span>
      </div>

      <div className={styles.list}>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
          <div
            key={num}
            ref={currentPage === num ? activeThumbRef : null}
            className={`${styles.thumb} ${currentPage === num ? styles.active : ''}`}
            onClick={() => setCurrentPage(num)}
            onContextMenu={(e) => handleRightClick(e, num)}
            draggable
            onDragStart={(e) => handleDragStart(e, num)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, num)}
          >
            {thumbs[num]
              ? <img src={thumbs[num]} alt={`Página ${num}`} className={styles.thumbImg} />
              : <div className={`skeleton ${styles.thumbSkeleton}`} />
            }
            <span className={styles.pageNum}>{num}</span>

            <button
              className={styles.deleteThumbBtn}
              onClick={(e) => { e.stopPropagation(); handleDelete(num) }}
              title="Eliminar página"
            >
              <Trash2 size={12} />
            </button>

            <button
              className={styles.kebabBtn}
              onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, pageNum: num }) }}
              aria-label={`Opciones de página ${num}`}
            >
              <MoreVertical size={13} />
            </button>
          </div>
        ))}
      </div>

      <button className={styles.addBtn} onClick={handleAddPage}>
        <Plus size={14} />
        Añadir página blanca
      </button>

      {contextMenu && (
        <div
          className={styles.ctxMenu}
          style={{
            top: Math.max(8, contextMenu.y - 60),
            left: Math.min(Math.max(8, contextMenu.x - 180), window.innerWidth - 188),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleRotate(contextMenu.pageNum)}><RotateCcw size={13} /> Rotar 90°</button>
          <button onClick={() => { toast('Próximamente duplicar'); closeMenu() }}><Copy size={13} /> Duplicar</button>
          <div className={styles.ctxDivider} />
          <button onClick={() => handleDelete(contextMenu.pageNum)} className={styles.ctxDanger}><Trash2 size={13} /> Eliminar página</button>
        </div>
      )}
    </div>
  )
}