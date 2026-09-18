import { create } from 'zustand'

const MAX_HISTORY = 100

const cloneEditState = (s) => ({
  editLayers: JSON.parse(JSON.stringify(s.editLayers || {})),
  extractedEdits: JSON.parse(JSON.stringify(s.extractedEdits || {})),
})

const pushHistory = (s) => ({
  historyPast: [...s.historyPast, cloneEditState(s)].slice(-MAX_HISTORY),
  historyFuture: [],
})

export const usePdfStore = create((set, get) => ({
  defaultFont: 'Arial',
  defaultFontSize: 14,
  defaultTextColor: '#000000',
  defaultFontBold: false,
  defaultFontItalic: false,
  defaultFontUnderline: false,

  applyTextFormat: (format) => {
    // 1. Guardamos la preferencia global para los futuros textos
    set((s) => ({ ...s, ...format }))

    // Obtenemos el estado fresco
    const state = get()
    if (state.selectedElement && state.selectedElementPage) {
      const el = state.selectedElement
      const pageNum = state.selectedElementPage

      // 🧠 LA MAGIA CORREGIDA:
      // Si el texto NO tiene "isEdited: true", sabemos que es un texto virgen original del PDF.
      if (!el.isEdited) {
        // Primero, lo extraemos y lo pasamos a nuestra capa de edición flotante
        state.commitExtractedEdit(pageNum, el, el.str)
        
        // Segundo, aplicamos el color/fuente a la nueva versión que se acaba de crear (edited-...)
        // Usamos get() de nuevo para asegurarnos de tener la versión más reciente de la memoria
        get().updateTextBlock(pageNum, `edited-${el.id}`, format)
      } else {
        // Si ya era un texto agregado por ti, o ya había sido editado antes, se actualiza directo
        state.updateTextBlock(pageNum, el.id, format)
      }
    }
  },
  file: null,
  fileName: '',
  fileSize: 0,
  pageCount: 0,
  currentPage: 1,
  zoom: 1.0,

  tabs: [],
  activeTabId: null,

  savedSignatures: JSON.parse(localStorage.getItem('aicrag-signatures') || '[]'),
  isSignatureModalOpen: false,
  pendingSignature: null,
  setSignatureModalOpen: (isOpen) => set({ isSignatureModalOpen: isOpen }),
  setPendingSignature: (sig) => set({ pendingSignature: sig }),
  
  saveSignature: (signature) => set((state) => {
    const newSignatures = [...state.savedSignatures, signature]
    localStorage.setItem('aicrag-signatures', JSON.stringify(newSignatures))
    return { savedSignatures: newSignatures }
  }),
  
  deleteSignature: (id) => set((state) => {
    const newSignatures = state.savedSignatures.filter(s => s.id !== id)
    localStorage.setItem('aicrag-signatures', JSON.stringify(newSignatures))
    return { savedSignatures: newSignatures }
  }),
  

  openTab: (fileData, name) => {
    const newTabId = `tab-${Date.now()}`
    const newTab = {
      id: newTabId,
      file: fileData,
      fileName: name || 'Documento.pdf',
      pageCount: 0,
      currentPage: 1,
      zoom: 1.0,
      editLayers: {},
      pageBgs: {},
      blockBgs: {},
      selectedElement: null,
      selectedElementPage: null,
      searchText: ''
    }
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTabId,
      ...newTab
    }))
  },

  switchTab: (tabId) => {
    const state = get()
    // Guardamos el estado actual en la pestaña que vamos a abandonar antes de cambiar
    const updatedTabs = state.tabs.map(tab => {
      if (tab.id === state.activeTabId) {
        return {
          ...tab,
          editLayers: state.editLayers,
          pageBgs: state.pageBgs,
          blockBgs: state.blockBgs,
          zoom: state.zoom,
          currentPage: state.currentPage
        }
      }
      return tab
    })

    const targetTab = updatedTabs.find(t => t.id === tabId)
    if (!targetTab) return

    set({
      tabs: updatedTabs,
      activeTabId: tabId,
      file: targetTab.file,
      fileName: targetTab.fileName,
      pageCount: targetTab.pageCount,
      currentPage: targetTab.currentPage,
      zoom: targetTab.zoom,
      editLayers: targetTab.editLayers,
      pageBgs: targetTab.pageBg || {},
      blockBgs: targetTab.blockBgs || {},
      selectedElement: null,
      selectedElementPage: null
    })
  },

  closeTab: (tabId) => {
    const state = get()
    const remainingTabs = state.tabs.filter(t => t.id !== tabId)
    
    if (remainingTabs.length === 0) {
      // Si cierran la última pestaña, limpiamos todo
      set({ tabs: [], activeTabId: null, file: null, fileName: '', pageCount: 0, editLayers: {} })
      return
    }

    // Si cerramos la pestaña activa, saltamos a la de al lado
    if (state.activeTabId === tabId) {
      const nextTab = remainingTabs[remainingTabs.length - 1]
      state.switchTab(nextTab.id)
    }

    set({ tabs: remainingTabs })
  },

  // editLayers[pageNum] = { texts: [], annotations: [] }
  editLayers: {},

  // extractedEdits[pageNum][originalId] = newStr  — tracks committed edits
  extractedEdits: {},
  historyPast: [],
  historyFuture: [],

  selectedElement: null,
  selectedElementPage: null,
  pageBgs: {},
  // blockBgs[pageNum][blockId] = locally-sampled bg color for one edited
  // block — lets the exporter whiteout each block with its own accurate
  // color (matters on watermarks/seals/colored regions) instead of one
  // flat page-wide color.
  blockBgs: {},
  activeTool: "select",

  activeShape: "rect",        // 'rect', 'circle', 'line'
  brushSize: 5,               // Grosor del pincel por defecto
  brushColor: "#e84545",      // Color rojo por defecto para dibujar/formas
  brushType: "solid",

  setActiveShape: (shape) => set({ activeShape: shape }),
  setBrushSize: (size) => set({ brushSize: Number(size) }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushType: (type) => set({ brushType: type }),

  // Mobile drawer visibility — Pages (left) and Properties (right) panels
  // become slide-in overlays below a 768px breakpoint. Only one open at a time.
  mobilePagesOpen: false,
  mobilePropertiesOpen: false,

  setFile: (arrayBuffer, name, size, updateCurrentTab = false) => {
    const state = get() 
    
    // Si es una actualización de la pestaña actual (ej. reordenar, rotar, borrar página)
    if (updateCurrentTab && state.activeTabId) {
      const updatedTabs = state.tabs.map(tab => {
        if (tab.id === state.activeTabId) {
          return {
            ...tab,
            file: arrayBuffer,
            pageCount: tab.pageCount // o se recalculará según corresponda
          }
        }
        return tab
      })
      
      set({
        tabs: updatedTabs,
        file: arrayBuffer,
        fileName: name || state.fileName,
      })
      return
    }

    // Si es un archivo completamente nuevo, se crea la pestaña como antes:
    const newTabId = `tab-${Date.now()}`
    const newTab = {
      id: newTabId,
      file: arrayBuffer,
      fileName: name || 'Documento.pdf',
      pageCount: 0,
      currentPage: 1,
      zoom: 1.0,
      editLayers: {},
      pageBgs: {},
      blockBgs: {},
    }

    set({
      tabs: [...state.tabs, newTab],
      activeTabId: newTabId,
      file: arrayBuffer,
      fileName: name || 'Documento.pdf',
      editLayers: {},
      pageBgs: {},
      blockBgs: {},
      currentPage: 1,
      zoom: 1.0,
      selectedElement: null
    })
  },
  setPageCount: (pageCount) => set({ pageCount }),
  setCurrentPage: (p) => set({ currentPage: p, selectedElement: null, selectedElementPage: null }),
  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(3.0, Math.round(z * 100) / 100)) }),
  setActiveTool: (t) => set({ activeTool: t, selectedElement: null, selectedElementPage: null }),
  setPageBg: (pageNum, bg) => set(s => ({ pageBgs: { ...s.pageBgs, [pageNum]: bg } })),
  // Bulk-merge per-block local backgrounds for one page in a single update
  setBlockBgs: (pageNum, bgMap) => set(s => ({
    blockBgs: { ...s.blockBgs, [pageNum]: { ...(s.blockBgs[pageNum] || {}), ...bgMap } }
  })),
  setSelectedElement: (el, page) => set({ selectedElement: el, selectedElementPage: page }),

  setMobilePagesOpen: (open) => set({
    mobilePagesOpen: open,
    mobilePropertiesOpen: open ? false : get().mobilePropertiesOpen,
  }),
  setMobilePropertiesOpen: (open) => set({
    mobilePropertiesOpen: open,
    mobilePagesOpen: open ? false : get().mobilePagesOpen,
  }),
  closeMobilePanels: () => set({ mobilePagesOpen: false, mobilePropertiesOpen: false }),

  getLayer: (pageNum) => {
    const { editLayers } = get()
    return editLayers[pageNum] || { texts: [], annotations: [] }
  },

  // Add a brand-new user text box
  addTextBlock: (pageNum, block) => set((s) => {
    const layer = s.editLayers[pageNum] || { texts: [], annotations: [] }
    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: { ...layer, texts: [...layer.texts, block] },
      },
    }
  }),

  // Update a user-added block in the layer
  updateTextBlock: (pageNum, id, updates) => set((s) => {
    const layer = s.editLayers[pageNum]
    if (!layer) return {}
    const existing = layer.texts.find(t => t.id === id)
    if (!existing) return {}
    const updated = { ...existing, ...updates }
    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: {
          ...layer,
          texts: layer.texts.map(t => t.id === id ? updated : t),
        },
      },
      ...(s.selectedElement?.id === id && s.selectedElementPage === pageNum
        ? { selectedElement: updated }
        : {}),
    }
  }),

  removeTextBlock: (pageNum, id) => set((s) => {
    const layer = s.editLayers[pageNum]
    if (!layer) return {}
    if (!layer.texts.some(t => t.id === id)) return {}
    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: { ...layer, texts: layer.texts.filter(t => t.id !== id) },
      },
      ...(s.selectedElement?.id === id && s.selectedElementPage === pageNum
        ? { selectedElement: null, selectedElementPage: null }
        : {}),
    }
  }),

  // Called when user finishes editing an EXTRACTED block.
  // Stores the edit in editLayers AND marks original for whiteout on export.
  // Carries ALL original block metadata (font, size, color, position) so export
  // can reproduce the text in the correct style and position.
  commitExtractedEdit: (pageNum, originalBlock, newStr) => set((s) => {
    const layer = s.editLayers[pageNum] || { texts: [], annotations: [] }
    const edits = s.extractedEdits[pageNum] || {}
    const editId = `edited-${originalBlock.id}`

    // All original style info preserved — only str changes
    const editedBlock = {
      // Position & size from original
      x: originalBlock.x,
      y: originalBlock.y,
      width: originalBlock.width,
      height: originalBlock.height,
      // Font metadata — critical for export
      fontSize: originalBlock.fontSize,
      fontName: originalBlock.fontName,
      fontFamily: originalBlock.fontFamily,
      fontBold: originalBlock.fontBold,
      fontItalic: originalBlock.fontItalic,
      fontUnderline: originalBlock.fontUnderline,
      stdFont: originalBlock.stdFont,
      baselineOffset: originalBlock.baselineOffset,
      ascent: originalBlock.ascent,
      descent: originalBlock.descent,
      scaleX: originalBlock.scaleX,
      scaleY: originalBlock.scaleY,
      rotation: originalBlock.rotation || 0,
      lineHeight: originalBlock.lineHeight,
      editBox: originalBlock.editBox,
      glyphs: originalBlock.glyphs,
      kerning: originalBlock.kerning,
      kerningSource: originalBlock.kerningSource,
      // Color from original
      color: originalBlock.color || '#000000',
      colorSpace: originalBlock.colorSpace || 'DeviceRGB',
      fillOpacity: originalBlock.fillOpacity ?? 1,
      textRenderingMode: originalBlock.textRenderingMode ?? 0,
      charSpacing: originalBlock.charSpacing ?? 0,
      wordSpacing: originalBlock.wordSpacing ?? 0,
      horizontalScale: originalBlock.horizontalScale ?? 1,
      fontResource: originalBlock.fontResource,
      internalFontName: originalBlock.internalFontName,
      embeddedFontName: originalBlock.embeddedFontName,
      fontWeight: originalBlock.fontWeight,
      fontStyle: originalBlock.fontStyle,
      // Edited string
      str: newStr,
      // Flags
      id: editId,
      originalId: originalBlock.id,
      originalStr: originalBlock.str,
      isEdited: true,
      isExtracted: false,
      // Preserve children info for multi-fragment whiteout
      children: originalBlock.children,
      originalX: originalBlock.x,
      originalY: originalBlock.y,
      originalWidth: originalBlock.width,
      originalHeight: originalBlock.height,
      originalFontSize: originalBlock.fontSize,
      originalBaselineOffset: originalBlock.baselineOffset,
      originalLineHeight: originalBlock.lineHeight,
      maxEditWidth: originalBlock.maxEditWidth ?? originalBlock.width,
      maxEditHeight: originalBlock.maxEditHeight ?? originalBlock.height,
      exportStrategy: 'overlay-fit',
      visualDriftScore: null,
    }

    const existing = layer.texts.find(t => t.id === editId)
    const nextEditedBlock = existing
      ? {
        ...existing,
        str: newStr,
        originalX: existing.originalX ?? originalBlock.x,
        originalY: existing.originalY ?? originalBlock.y,
        originalWidth: existing.originalWidth ?? originalBlock.width,
        originalHeight: existing.originalHeight ?? originalBlock.height,
        originalFontSize: existing.originalFontSize ?? originalBlock.fontSize,
        originalBaselineOffset: existing.originalBaselineOffset ?? originalBlock.baselineOffset,
        originalLineHeight: existing.originalLineHeight ?? originalBlock.lineHeight,
        maxEditWidth: existing.maxEditWidth ?? originalBlock.maxEditWidth ?? originalBlock.width,
        maxEditHeight: existing.maxEditHeight ?? originalBlock.maxEditHeight ?? originalBlock.height,
        editBox: existing.editBox ?? originalBlock.editBox,
        glyphs: existing.glyphs ?? originalBlock.glyphs,
        kerning: existing.kerning ?? originalBlock.kerning,
        fontResource: existing.fontResource ?? originalBlock.fontResource,
      }
      : editedBlock
    const newTexts = existing
      ? layer.texts.map(t => t.id === editId ? nextEditedBlock : t)
      : [...layer.texts, nextEditedBlock]

    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: { ...layer, texts: newTexts },
      },
      extractedEdits: {
        ...s.extractedEdits,
        [pageNum]: { ...edits, [originalBlock.id]: newStr },
      },
      selectedElement: nextEditedBlock,
      selectedElementPage: pageNum,
    }
  }),

  addAnnotation: (pageNum, annotation) => set((s) => {
    const layer = s.editLayers[pageNum] || { texts: [], annotations: [] }
    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: { ...layer, annotations: [...layer.annotations, annotation] },
      },
    }
  }),

  undoEdit: () => {
    let didUndo = false
    set((s) => {
      const previous = s.historyPast[s.historyPast.length - 1]
      if (!previous) return {}
      didUndo = true
      return {
        editLayers: previous.editLayers,
        extractedEdits: previous.extractedEdits,
        historyPast: s.historyPast.slice(0, -1),
        historyFuture: [cloneEditState(s), ...s.historyFuture].slice(0, MAX_HISTORY),
        selectedElement: null,
        selectedElementPage: null,
      }
    })
    return didUndo
  },

  redoEdit: () => {
    let didRedo = false
    set((s) => {
      const next = s.historyFuture[0]
      if (!next) return {}
      didRedo = true
      return {
        editLayers: next.editLayers,
        extractedEdits: next.extractedEdits,
        historyPast: [...s.historyPast, cloneEditState(s)].slice(-MAX_HISTORY),
        historyFuture: s.historyFuture.slice(1),
        selectedElement: null,
        selectedElementPage: null,
      }
    })
    return didRedo
  },

  addImage: (pageNum, imageBlock) => set((s) => {
    // Asegurarnos de que la capa tenga un arreglo de images
    const layer = s.editLayers[pageNum] || { texts: [], annotations: [], images: [] }
    const currentImages = layer.images || []

    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: { ...layer, images: [...currentImages, imageBlock] },
      },
      // Seleccionamos la imagen automáticamente al crearla para poder moverla
      selectedElement: imageBlock,
      selectedElementPage: pageNum,
    }
  }),

  updateImage: (pageNum, id, updates) => set((s) => {
    const layer = s.editLayers[pageNum]
    if (!layer || !layer.images) return {}

    const existing = layer.images.find(img => img.id === id)
    if (!existing) return {}

    const updated = { ...existing, ...updates }

    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: {
          ...layer,
          images: layer.images.map(img => img.id === id ? updated : img),
        },
      },
      // Actualizar el elemento seleccionado si es el que estamos moviendo
      ...(s.selectedElement?.id === id && s.selectedElementPage === pageNum
        ? { selectedElement: updated }
        : {}),
    }
  }),

  removeImage: (pageNum, id) => set((s) => {
    const layer = s.editLayers[pageNum]
    if (!layer || !layer.images) return {}

    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: { ...layer, images: layer.images.filter(img => img.id !== id) },
      },
      ...(s.selectedElement?.id === id && s.selectedElementPage === pageNum
        ? { selectedElement: null, selectedElementPage: null }
        : {}),
    }
  }),

  updateAnnotation: (pageNum, id, updates) => set((s) => {
    const layer = s.editLayers[pageNum]
    if (!layer || !layer.annotations) return {}

    const existing = layer.annotations.find(a => a.id === id)
    if (!existing) return {}
    const updated = { ...existing, ...updates }

    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: {
          ...layer,
          annotations: layer.annotations.map(a => a.id === id ? updated : a),
        },
      },
      // Si la anotación que estamos moviendo está seleccionada, actualizamos el panel
      ...(s.selectedElement?.id === id ? { selectedElement: updated } : {}),
    }
  }),

  removeAnnotation: (pageNum, id) => set((s) => {
    const layer = s.editLayers[pageNum]
    if (!layer || !layer.annotations) return {}

    return {
      ...pushHistory(s),
      editLayers: {
        ...s.editLayers,
        [pageNum]: {
          ...layer,
          annotations: layer.annotations.filter(a => a.id !== id)
        },
      },
      ...(s.selectedElement?.id === id ? { selectedElement: null, selectedElementPage: null } : {}),
    }
  }),

  searchText: '',
  setSearchText: (text) => set({ searchText: text }),

  reset: () => set({
    file: null, fileName: '', fileSize: 0, pageCount: 0, currentPage: 1,
    zoom: 1.0, editLayers: {}, extractedEdits: {}, selectedElement: null,
    selectedElementPage: null, activeTool: "select", pageBgs: {}, blockBgs: {},
    historyPast: [], historyFuture: [],
    mobilePagesOpen: false, mobilePropertiesOpen: false,
  }),
}))

// ── pageBgs added separately so we don't rewrite the whole store ──
// We store detected background colors per page so export can use correct whiteout
