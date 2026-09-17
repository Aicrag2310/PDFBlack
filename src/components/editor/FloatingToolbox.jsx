import React, { useRef } from 'react'
import {
  MousePointer2, Type, Image, Pencil, Square, PenLine,
  Highlighter, EyeOff, Undo2, Redo2, ZoomIn, ZoomOut
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import styles from './FloatingToolbox.module.css'

const TOOLS = [
  { id: 'select',    icon: MousePointer2, label: 'Seleccionar y editar texto (V)' },
  { id: 'text',      icon: Type,          label: 'Añadir caja de texto (T)' },
  { id: 'image',     icon: Image,         label: 'Añadir imagen' },
  { id: 'draw',      icon: Pencil,        label: 'Dibujar a mano alzada (P)' },
  { id: 'shape',     icon: Square,        label: 'Insertar forma geométrica' },
  { id: 'sign',      icon: PenLine,       label: 'Firmar documento' },
  { id: 'highlight', icon: Highlighter,   label: 'Resaltar texto' },
  { id: 'redact',    icon: EyeOff,        label: 'Redactar / Censurar' },
]

export default function FloatingToolbox() {
  const {
    activeTool, setActiveTool,
    zoom, setZoom,
    undoEdit, redoEdit,
    file
  } = usePdfStore()

  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      const base64Image = evento.target.result
      const nuevaImagen = {
        id: `img-${Date.now()}`, type: 'image', src: base64Image,
        x: 50, y: 50, width: 150, height: 150, isEdited: true
      }
      // Llamamos directamente a la tienda para añadir la imagen
      const { currentPage, addImage } = usePdfStore.getState()
      addImage(currentPage, nuevaImagen)
      toast.success('Imagen insertada correctamente')
    }
    reader.readAsDataURL(uploadedFile)
    e.target.value = null 
  }

  const handleUndo = () => undoEdit() ? toast('Cambio deshecho', { duration: 800 }) : toast('Nada que deshacer')
  const handleRedo = () => redoEdit() ? toast('Cambio rehecho', { duration: 800 }) : toast('Nada que rehacer')

  if (!file) return null // Solo se muestra si hay un documento abierto

  return (
    <aside className={styles.floatingToolbox}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/png, image/jpeg, image/jpg" onChange={handleImageUpload} />

      {/* Herramientas Principales */}
      <div className={styles.toolSection}>
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`${styles.toolBtn} ${activeTool === id ? styles.active : ''}`}
            onClick={() => {
              if (id === 'image') {
                fileInputRef.current.click()
                setActiveTool(id)
              } else {
                setActiveTool(id)
              }
            }}
            title={label}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      <div className={styles.sep} />

      {/* Acciones Rápidas (Deshacer / Rehacer) */}
      <div className={styles.toolSection}>
        <button className={styles.toolBtn} onClick={handleUndo} title="Deshacer (Ctrl+Z)">
          <Undo2 size={17} />
        </button>
        <button className={styles.toolBtn} onClick={handleRedo} title="Rehacer (Ctrl+Y)">
          <Redo2 size={17} />
        </button>
      </div>

      <div className={styles.sep} />

      {/* Controles de Zoom Rápido */}
      <div className={styles.toolSection}>
        <button className={styles.toolBtn} onClick={() => setZoom(zoom + 0.2)} title="Acercar zoom">
          <ZoomIn size={17} />
        </button>
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button className={styles.toolBtn} onClick={() => setZoom(zoom - 0.2)} title="Alejar zoom">
          <ZoomOut size={17} />
        </button>
      </div>
    </aside>
  )
}