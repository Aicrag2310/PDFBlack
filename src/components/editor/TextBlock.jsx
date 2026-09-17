import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Trash2, Copy, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import styles from './TextBlock.module.css'

export default function TextBlock({
  block, pageNum,
  isExtracted = false,
  pageBg = 'white',
  getLocalBg,
  forceEdit = false,
  onEditStart,
  onEditEnd,
}) {
  const {
    selectedElement, setSelectedElement,
    updateTextBlock, removeTextBlock, commitExtractedEdit,
    zoom, activeTool
  } = usePdfStore()

  const divRef = useRef(null)
  const dragRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(block.str)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState({ x: block.x, y: block.y })
  const [dragging, setDragging] = useState(false)

  const isSelected = selectedElement?.id === block.id

  useEffect(() => { if (!dragging) setPos({ x: block.x, y: block.y }) }, [block.x, block.y, dragging])
  useEffect(() => { if (!editing) setDraftText(block.str) }, [block.str, editing])

  useEffect(() => {
    if (forceEdit && !editing) startEdit()
    else if (!forceEdit && editing) doCommit()
  }, [forceEdit])

  useEffect(() => {
    if (!editing || !divRef.current) return
    const el = divRef.current
    requestAnimationFrame(() => {
      el.focus()
      try {
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch (_) { }
    })
  }, [editing])

  useEffect(() => { if (!isSelected && editing) doCommit() }, [isSelected])

  const startEdit = () => {
    setEditing(true)
    onEditStart?.()
  }

  const doCommit = useCallback(() => {
    if (!editing) return
    setEditing(false)
    onEditEnd?.()
    const raw = divRef.current?.innerText ?? draftText
    const newStr = raw.replace(/\n+$/, '').replace(/\r/g, '')
    setDraftText(newStr)
    if (newStr === block.str) return

    if (isExtracted) {
      commitExtractedEdit(pageNum, block, newStr)
      toast.success('✓ Guardado', { duration: 1000 })
    } else {
      updateTextBlock(pageNum, block.id, { str: newStr })
    }
  }, [editing, draftText, block, isExtracted, pageNum, commitExtractedEdit, updateTextBlock, onEditEnd])

  const doCancel = useCallback(() => {
    setEditing(false)
    onEditEnd?.()
    setDraftText(block.str)
    if (divRef.current) divRef.current.innerText = block.str
  }, [block.str, onEditEnd])

  const handleClick = (e) => { e.stopPropagation(); if (!isSelected) setSelectedElement(block, pageNum) }
  const handleDoubleClick = (e) => { 
    e.stopPropagation(); 
    setSelectedElement(block, pageNum); 
    // Solo permitimos editar si la herramienta activa es texto o selección
    if (activeTool === 'select' || activeTool === 'text') startEdit() 
  }
  const handleMouseEnter = () => setHovered(true)
  const handleMouseLeave = () => setHovered(false)

  const handleKeyDown = (e) => {
    e.stopPropagation()
    if (e.key === 'Escape') { e.preventDefault(); doCancel() }
    if (e.key === 'Enter' && !e.shiftKey && editing) { e.preventDefault(); doCommit() }
  }

  const handleBlur = (e) => {
    if (divRef.current?.contains(e.relatedTarget)) return
    doCommit()
  }

  const handleMouseDown = (e) => {
    if (editing || (activeTool !== 'select' && activeTool !== 'text')) return
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { ox: e.clientX / zoom - pos.x, oy: e.clientY / zoom - pos.y }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => setPos({ x: e.clientX / zoom - dragRef.current.ox, y: e.clientY / zoom - dragRef.current.oy })
    const onUp = () => { setDragging(false); if (!isExtracted) updateTextBlock(pageNum, block.id, { x: pos.x, y: pos.y }) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, zoom, pos, pageNum, block.id, isExtracted, updateTextBlock])

  const fontFamily = block.fontFamily || 'Arial, Helvetica, sans-serif'
  const fontWeight = block.fontBold ? 700 : 400
  const fontStyle = block.fontItalic ? 'italic' : 'normal'
  const fontSize = Math.max(block.fontSize || 12, 4)

  const isUserAdded = !isExtracted || block.isEdited

  const localBg = useMemo(() => {
    if (getLocalBg) {
      const w = block.width || fontSize * draftText.length * 0.6
      const h = block.height || fontSize * 1.1
      return getLocalBg(pos.x, pos.y, w, h)
    }
    return pageBg || 'white'
  }, [getLocalBg, pos.x, pos.y, block.width, block.height, fontSize, draftText.length, pageBg])

  let opacity = 1
  let background = 'transparent'
  let cursor = 'default'

  if (isUserAdded) {
    opacity = 1
    background = localBg
    cursor = editing ? 'text' : 'grab'
  } else if (editing) {
    opacity = 1
    background = localBg
    cursor = 'text'
  } else if (isSelected || hovered) {
    opacity = 1
    background = hovered ? localBg : 'transparent'
    cursor = isSelected ? 'grab' : 'text'
  } else {
    opacity = 0
    background = 'transparent'
    cursor = 'default'
  }

  const isCommitted = isUserAdded && !editing && !isSelected
  
  // 🔥 EL SECRETO ANTI-SALTO: 
  // Cuando editamos, agregamos 4px de respiro (padding). 
  // Para que el texto no se mueva, compensamos con -4px (margin).
  const visualPad = editing ? 4 : (isCommitted ? 2 : 0)

  const glowShadow = editing 
    ? '0 0 0 2px #a855f7, 0 10px 25px rgba(0,0,0,0.15)' // Resplandor morado Premium
    : isSelected 
      ? '0 0 0 1.5px rgba(59,130,246,0.6)' // Borde azul sutil al seleccionar
      : hovered && !isExtracted
        ? '0 0 0 1px rgba(168,85,247,0.3)' // Borde lila sutil al pasar el ratón
        : isCommitted 
          ? `0 0 6px 4px ${localBg}` // Halo invisible que difumina los bordes
          : 'none'

  return (
    <div
      ref={divRef}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={editing}
      style={{
        position: 'absolute',
        // 🔒 Coordenadas exactas fijas. Ya no hay restas matemáticas aquí.
        left: pos.x,
        top: pos.y,
        
        // ⚖️ Compensación matemática perfecta
        padding: visualPad,
        margin: -visualPad, 
        
        minWidth: Math.max(fontSize * 0.75, 8),
        minHeight: Math.max(block.height || fontSize * 1.1, 6),
        
        lineHeight: 1,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        textDecoration: block.fontUnderline ? 'underline' : 'none',
        
        opacity,
        background,
        color: block.color || '#000000',
        borderRadius: editing ? 6 : (isCommitted ? 2 : 1),
        
        cursor,
        userSelect: editing ? 'text' : 'none',
        zIndex: editing ? 50 : block.isEdited ? 9 : isSelected ? 12 : 10,
        
        whiteSpace: 'pre',
        outline: 'none',
        boxSizing: 'content-box',
        transition: editing ? 'none' : 'box-shadow 0.15s ease, background 0.15s ease',
        boxShadow: glowShadow,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      title={editing ? undefined : 'Doble clic para editar'}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{draftText}</span>
    </div>
  )
}

// ── Context toolbar (se mantiene igual) ────────
export function TextContextToolbar({ block, pageNum, pos, onEdit }) {
  const { removeTextBlock, updateTextBlock, setSelectedElement, commitExtractedEdit } = usePdfStore()

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: Math.max(2, pos.y - 50),
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: '5px 6px',
        zIndex: 40,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        pointerEvents: 'all',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
      onClick={e => e.stopPropagation()}
    >
      {[
        { label: '✏️ Editar', action: () => onEdit(), },
        { label: null }, 
        {
          icon: <Copy size={16} />, title: 'Duplicar', action: () => {
            const clone = { ...block, id: `new-${Date.now()}`, x: pos.x + 14, y: pos.y + 14, isExtracted: false, isEdited: false, originalId: undefined }
            updateTextBlock(pageNum, clone.id, clone)
            toast.success('Duplicado')
          }
        },
        {
          icon: <Trash2 size={16} />, title: 'Delete', danger: true, action: () => {
            if (block.isExtracted || block.originalId) {
              // Si es un texto original del PDF, lo convertimos en un "borrador" dejándolo en blanco
              if (!block.isEdited) {
                commitExtractedEdit(pageNum, block, '')
              } else {
                updateTextBlock(pageNum, block.id, { str: '', opacity: 0 })
              }
              toast.success('Texto borrado del PDF')
            } else {
              // Si es un texto creado desde cero por ti, lo eliminamos por completo
              removeTextBlock(pageNum, block.id)
              toast.success('Eliminado')
            }
            setSelectedElement(null, null)
          }
        },
      ].map((item, i) => {
        if (item.label === null) return (
          <div key={i} style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 3px' }} />
        )
        return (
          <button key={i} title={item.title} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); item.action() }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              minWidth: 40, height: 40, padding: '0 12px',
              border: 'none', borderRadius: 7, background: 'transparent',
              color: item.danger ? '#f87171' : '#a1a1aa',
              fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            {item.label || item.icon}
          </button>
        )
      })}
    </div>
  )
}