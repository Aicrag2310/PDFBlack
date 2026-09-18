import React from 'react'
import { FileText, Layers, Info, Lock, Droplets, EyeOff, Palette, Unlock } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import { addWatermark, downloadBytes, decryptPdf } from '../../lib/pdfExporter.js'
import { convertToWord, convertToExcel, convertToImages } from '../../lib/converters.js'
import styles from './PropertiesPanel.module.css'

export default function PropertiesPanel() {
  const {
    selectedElement, selectedElementPage,
    file, fileName, pageCount, editLayers,
    updateTextBlock, commitExtractedEdit,
  } = usePdfStore()

  const totalEdits = Object.values(editLayers || {}).reduce(
    (sum, layer) => sum + (layer.texts?.length || 0) + (layer.annotations?.length || 0) + (layer.images?.length || 0), 0
  )

  // Update a property on the selected element (works for both store & extracted)
  // 🛡️ FUNCIÓN AUXILIAR PARA ACTUALIZAR TEXTOS O IMÁGENES/FIRMAS
  const updateProp = (updates) => {
    if (!selectedElement || !selectedElementPage) return
    
    // Si es una imagen o firma
    if (selectedElement.type === 'image' || selectedElement.src) {
      usePdfStore.getState().updateImage(selectedElementPage, selectedElement.id, updates)
      // Actualizamos también el elemento seleccionado para que la UI responda al instante
      usePdfStore.getState().setSelectedElement({ ...selectedElement, ...updates }, selectedElementPage)
    } else {
      // Si es un texto
      const targetId = selectedElement.isExtracted && !selectedElement.isEdited
        ? `edited-${selectedElement.id}`
        : selectedElement.id
      
      if (selectedElement.isExtracted && !selectedElement.isEdited) {
        commitExtractedEdit(selectedElementPage, selectedElement, selectedElement.str)
      }
      updateTextBlock(selectedElementPage, targetId, updates)
    }
  }

  const handleWatermark = async () => {
    if (!file) return
    const text = window.prompt('Texto de la marca de agua:', 'CONFIDENCIAL')
    if (!text) return
    const tid = toast.loading('Agregando marca de agua...')
    try {
      const bytes = await addWatermark(file, text)
      downloadBytes(bytes, `watermarked-${fileName}`)
      toast.success('Downloaded!', { id: tid })
    } catch { toast.error('Failed', { id: tid }) }
  }

  // Clean font name for display
  const displayFont = (name) => {
    if (!name) return 'Unknown'
    return name
      .replace(/^[A-Z]{6}\+/, '')
      .replace(/-(Bold|Italic|Oblique|Regular)/gi, '')
      .replace(/^g_[a-z0-9]+_/i, '')
      .slice(0, 22)
  }

  const handleConvertToWord = async () => {
    if (!file) return
    const tid = toast.loading('Convirtiendo a Word...')
    try {
      await convertToWord(file, fileName || 'documento.pdf')
      toast.success('¡Word descargado!', { id: tid })
    } catch (e) {
      toast.error('Error al convertir', { id: tid })
      console.error(e)
    }
  }

  const handleConvertToExcel = async () => {
    if (!file) return
    const tid = toast.loading('Convirtiendo a Excel...')
    try {
      await convertToExcel(file, fileName || 'documento.pdf')
      toast.success('¡Excel descargado!', { id: tid })
    } catch (e) {
      toast.error('Error al convertir', { id: tid })
    }
  }

  const handleConvertToImages = async () => {
    if (!file) return
    const tid = toast.loading('Generando imágenes ZIP...')
    try {
      await convertToImages(file, fileName || 'documento.pdf')
      toast.success('¡ZIP descargado!', { id: tid })
    } catch (e) {
      toast.error('Error al convertir', { id: tid })
    }
  }

  const handleDecrypt = async () => {
    if (!file) return
    const password = window.prompt('Ingresa la contraseña actual del PDF para desbloquearlo:')
    if (!password) return // Si el usuario cancela, no hacemos nada

    const tid = toast.loading('Quitando contraseña...')
    try {
      const bytes = await decryptPdf(file, password)
      downloadBytes(bytes, `desbloqueado-${fileName}`)
      toast.success('¡PDF desencriptado con éxito!', { id: tid })
    } catch (e) {
      toast.error('Error: Contraseña incorrecta', { id: tid })
      console.error(e)
    }
  }
  

  return (
    <div className={styles.panel}>

      {/* Document info */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}><Info size={12} /> Documento</div>
        <div className={styles.row}><span className={styles.lbl}>Paginas</span><span className={styles.val}>{pageCount || '—'}</span></div>
        <div className={styles.row}><span className={styles.lbl}>Cambios</span><span className={styles.val}>{totalEdits}</span></div>
        <div className={styles.row}><span className={styles.lbl}>Archivo</span><span className={styles.val} style={{ fontSize: 10, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || '—'}</span></div>
      </div>

      {/* Selection properties — only when something is selected */}
      {selectedElement ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}><Layers size={12} /> Selección</div>

          {/* Detected font badge */}
          <div className={styles.detectedFont}>
            <Palette size={11} />
            {displayFont(selectedElement.fontName)}
            {selectedElement.isExtracted && !selectedElement.isEdited && (
              <span className={styles.extractedBadge}>PDF original</span>
            )}
          </div>

          {/* Text preview */}
          <div className={styles.textPreview}>
            {selectedElement.str?.slice(0, 60) || '(empty)'}
            {(selectedElement.str?.length || 0) > 60 ? '…' : ''}
          </div>

          {/* Font family */}
          <div className={styles.row}>
            <span className={styles.lbl}>Fuente</span>
            <select
              className={styles.ctrl}
              defaultValue="Helvetica"
              onChange={e => updateProp({ fontName: e.target.value })}
            >
              {['Helvetica', 'Times New Roman', 'Times-Roman', 'Courier New', 'Courier', 'Georgia', 'Arial'].map(f => (
                <option key={f} value={f}>{f.replace('Times-Roman','Times Roman')}</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div className={styles.row}>
            <span className={styles.lbl}>Tamaño</span>
            <input
              type="number" min={4} max={200}
              className={styles.numCtrl}
              defaultValue={Math.round(selectedElement.fontSize || 12)}
              onChange={e => updateProp({ fontSize: Math.max(4, Number(e.target.value)) })}
            />
          </div>

          {/* Color — shows the DETECTED color from PDF */}
          <div className={styles.row}>
            <span className={styles.lbl}>Color</span>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorCtrl}
                defaultValue={selectedElement.color || '#000000'}
                onChange={e => updateProp({ color: e.target.value })}
              />
              <span className={styles.colorHex}>{selectedElement.color || '#000000'}</span>
            </div>
          </div>

          {/* Position readout */}
          <div className={styles.row}>
            <span className={styles.lbl}>X</span>
            <span className={styles.val} style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(selectedElement.x)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.lbl}>Y</span>
            <span className={styles.val} style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(selectedElement.y)}</span>
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.sectionTitle}><Layers size={12} /> Selección</div>
          <div className={styles.emptyHint}>
            Haz clic en cualquier texto del PDF para seleccionarlo y, luego, haz doble clic para editarlo
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}><FileText size={12} /> Acciones</div>
        <div className={styles.actionList}>
          <button className={styles.actionBtn} onClick={handleWatermark}>
            <Droplets size={13} /> Agregar marca de agua
          </button>

          <button className={styles.actionBtn} onClick={handleDecrypt}>
            <Unlock size={13} /> Quitar contraseña
          </button>
        </div>
      </div>

      {/* Export as */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Convertir a</div>
        <div className={styles.actionList}>
          <button className={styles.actionBtn} onClick={handleConvertToWord}>
            📄 Word (.docx)
          </button>
          <button className={styles.actionBtn} onClick={handleConvertToExcel}>
            📊 Excel (.xlsx)
          </button>
          <button className={styles.actionBtn} onClick={handleConvertToImages}>
            🖼 Imágenes ZIP (.png)
          </button>
        </div>
      </div>

    </div>
  )
}
