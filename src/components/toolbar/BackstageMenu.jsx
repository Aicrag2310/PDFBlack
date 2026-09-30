import React, { useState, useEffect, useRef } from 'react'
import { 
  ArrowLeft, FolderOpen, Clock, Save, Printer, XSquare, MessageSquare, LogOut, FileText, 
  X, Image as ImageIcon, Send 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }
const fs = window.require ? window.require('fs') : null

export default function BackstageMenu({ onSectionChange }) {
  const [backstageTab, setBackstageTab] = useState('recientes')
  const [recentFiles, setRecentFiles] = useState([])
  const { setFile, file } = usePdfStore()
  const fileInputRef = useRef(null)

  // Estados para el Modal de Reporte de Errores
  const [showBugModal, setShowBugModal] = useState(false)
  const [bugMessage, setBugMessage] = useState('')
  const [bugImage, setBugImage] = useState(null)

  useEffect(() => {
    const savedRecents = JSON.parse(localStorage.getItem('aicrag_recent_files') || '[]')
    setRecentFiles(savedRecents)
  }, [])

  const addRecentFile = (name, filePath) => {
    let files = JSON.parse(localStorage.getItem('aicrag_recent_files') || '[]')
    files = files.filter(f => f.path !== filePath) 
    files.unshift({ name, path: filePath, date: new Date().toLocaleString('es-MX') })
    if (files.length > 15) files.pop() 
    localStorage.setItem('aicrag_recent_files', JSON.stringify(files))
    setRecentFiles(files)
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const filePath = selectedFile.path 
      addRecentFile(selectedFile.name, filePath)
      setFile(arrayBuffer, selectedFile.name, selectedFile.size)
      onSectionChange('home')
      toast.success('Documento abierto')
    } catch (error) {
      toast.error('Error al abrir el documento')
    }
    e.target.value = null
  }

  const handleOpenRecent = (filePath, fileName) => {
    if (!fs) return toast.error('Entorno no compatible')
    try {
      if (!fs.existsSync(filePath)) {
        toast.error('El archivo ya no existe o fue movido')
        const newFiles = recentFiles.filter(f => f.path !== filePath)
        setRecentFiles(newFiles)
        localStorage.setItem('aicrag_recent_files', JSON.stringify(newFiles))
        return
      }
      
      const buffer = fs.readFileSync(filePath)
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      
      addRecentFile(fileName, filePath)
      setFile(arrayBuffer, fileName, buffer.byteLength)
      onSectionChange('home')
      toast.success('Documento cargado')
    } catch (error) {
      toast.error('No se pudo leer el archivo')
    }
  }

  const triggerSave = () => {
    if (!file) return toast.error('No hay ningún documento abierto')
    document.dispatchEvent(new CustomEvent('trigger-global-save'))
    onSectionChange('home')
  }

  const triggerPrint = () => {
    if (!file) return toast.error('No hay ningún documento abierto')
    document.dispatchEvent(new CustomEvent('trigger-global-print'))
    onSectionChange('home')
  }

  // --- LÓGICA DEL MODAL DE REPORTES ---
  const handleBugImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (evento) => setBugImage(evento.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitBug = () => {
    if (!bugMessage.trim()) return toast.error('Por favor, describe el problema primero.')
    
    // Simulamos un envío (aquí luego puedes conectar tu API real, Firebase, Supabase, etc.)
    const sendPromise = new Promise(resolve => setTimeout(resolve, 1500))
    
    toast.promise(sendPromise, {
      loading: 'Enviando reporte...',
      success: '¡Reporte enviado! Gracias por ayudarnos a mejorar.',
      error: 'Hubo un error al enviar.',
    }).then(() => {
      setShowBugModal(false)
      setBugMessage('')
      setBugImage(null)
    })
  }

  const handleCloseApp = () => ipcRenderer?.send('force-close-app')

  return (
    <>
      <style>
        {`
          .backstage-btn {
            display: flex; align-items: center; gap: 12px; padding: 12px 20px;
            background: transparent; border: none; color: var(--tx-1); font-size: 14px;
            cursor: pointer; transition: all 0.2s ease; text-align: left; outline: none;
          }
          .backstage-btn:hover { background: var(--bg-hover, rgba(128,128,128,0.1)); color: var(--tx-1); }
          .backstage-btn.active { background: #f73a3a; color: #fff; font-weight: 500; }
          
          .recent-item {
            display: flex; align-items: center; gap: 16px; padding: 12px 16px;
            border-bottom: 1px solid var(--brd, rgba(128,128,128,0.2)); cursor: pointer; transition: background 0.2s;
          }
          .recent-item:hover { background: var(--bg-hover, rgba(128,128,128,0.1)); }
        `}
      </style>

      {/* CONTENEDOR PRINCIPAL BACKSTAGE */}
      <div style={{
        position: 'fixed', top: '42px', left: 0, right: 0, bottom: 0, 
        background: 'var(--bg-app, #f9fafb)', zIndex: 999998, display: 'flex'
      }}>
        
        <input 
          type="file" ref={fileInputRef} style={{ display: 'none' }} 
          accept="application/pdf" onChange={handleFileChange} 
        />

        {/* SIDEBAR IZQUIERDA */}
        <div style={{
          width: '260px', background: 'var(--bg-panel, #ffffff)', borderRight: '1px solid var(--brd)',
          display: 'flex', flexDirection: 'column', paddingTop: '10px'
        }}>
          <button className="backstage-btn" onClick={() => onSectionChange('home')} style={{ marginBottom: '10px' }}>
            <ArrowLeft size={20} /> <span style={{ fontSize: '16px' }}>Regresar</span>
          </button>
          
          <button className="backstage-btn" onClick={() => fileInputRef.current?.click()}><FolderOpen size={18} /> Abrir PDF</button>
          <button className={`backstage-btn ${backstageTab === 'recientes' ? 'active' : ''}`} onClick={() => setBackstageTab('recientes')}><Clock size={18} /> Recientes</button>
          
          <div style={{ margin: '15px 20px', borderBottom: '1px solid var(--brd)' }} />

          <button className="backstage-btn" onClick={triggerSave}><Save size={18} /> Guardar</button>
          <button className="backstage-btn" onClick={triggerPrint}><Printer size={18} /> Imprimir</button>
          <button className="backstage-btn" onClick={() => { 
            if(file) { setFile(null, null, 0); onSectionChange('home'); toast('Documento cerrado') }
            else toast.error('No hay documento abierto')
          }}><XSquare size={18} /> Cerrar documento</button>

          <div style={{ flex: 1 }} />

          <button className="backstage-btn" onClick={() => setShowBugModal(true)}><MessageSquare size={18} /> Comentarios / Errores</button>
          <button className="backstage-btn" onClick={handleCloseApp} style={{ color: '#ef4444' }}><LogOut size={18} /> Salir de Aicrag</button>
          
          <div style={{ padding: '20px', color: 'var(--tx-3)', fontSize: '12px', textAlign: 'center' }}>
            Aicrag Black PDF Editor v1.0.8
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL (DERECHA) */}
        <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', background: 'var(--bg-app)' }}>
          {backstageTab === 'recientes' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h1 style={{ color: 'var(--tx-1)', fontSize: '28px', fontWeight: '400', marginBottom: '30px' }}>Buenas noches</h1>
              <h2 style={{ color: 'var(--tx-1)', fontSize: '18px', fontWeight: '500', marginBottom: '16px', borderBottom: '1px solid var(--brd)', paddingBottom: '10px' }}>
                Archivos Recientes
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', padding: '10px 16px', color: 'var(--tx-2)', fontSize: '13px' }}>
                  <div style={{ flex: 1 }}>Nombre del documento</div>
                  <div style={{ width: '200px' }}>Fecha de modificación</div>
                </div>

                {recentFiles.length === 0 ? (
                  <div style={{ padding: '20px 16px', color: 'var(--tx-3)', fontSize: '14px' }}>
                    No hay archivos recientes.
                  </div>
                ) : (
                  recentFiles.map((f, i) => (
                    <div key={i} className="recent-item" onClick={() => handleOpenRecent(f.path, f.name)}>
                      <FileText size={24} color="#f73a3a" />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: 'var(--tx-1)', fontSize: '14px', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{f.name}</div>
                        <div style={{ color: 'var(--tx-2)', fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{f.path}</div>
                      </div>
                      <div style={{ width: '200px', color: 'var(--tx-2)', fontSize: '13px' }}>{f.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          MODAL FLOTANTE DE COMENTARIOS / BUGS
      ========================================= */}
      {showBugModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999999, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-panel)', width: '90%', maxWidth: '420px', 
            borderRadius: '12px', padding: '24px', border: '1px solid var(--brd)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--tx-1)', fontSize: '18px', fontWeight: '600' }}>
                Comentarios y Errores
              </h3>
              <button 
                onClick={() => setShowBugModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--tx-2)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--tx-2)', fontSize: '13px', margin: '0 0 16px 0' }}>
              ¿Encontraste un error o tienes una sugerencia? Cuéntanos los detalles para mejorar Aicrag Black PDF.
            </p>

            <textarea
              placeholder="Ej: Al intentar imprimir el PDF, la aplicación se cierra de forma inesperada..."
              value={bugMessage}
              onChange={e => setBugMessage(e.target.value)}
              style={{
                width: '100%', height: '120px', padding: '12px',
                background: 'var(--bg-card)', color: 'var(--tx-1)',
                border: '1px solid var(--brd)', borderRadius: '8px',
                resize: 'none', marginBottom: '16px', outline: 'none',
                fontFamily: 'inherit', fontSize: '14px'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                padding: '8px 12px', background: 'var(--bg-card)', color: 'var(--tx-1)',
                border: '1px solid var(--brd)', borderRadius: '6px', fontSize: '13px',
                transition: 'all 0.2s'
              }}>
                 <ImageIcon size={16} /> 
                 {bugImage ? 'Cambiar captura' : 'Adjuntar captura'}
                 <input type="file" hidden accept="image/*" onChange={handleBugImageUpload} />
              </label>

              {bugImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
                  <span>✓ Captura lista</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowBugModal(false)}
                style={{
                  padding: '10px 16px', background: 'transparent', color: 'var(--tx-1)',
                  border: '1px solid var(--brd)', borderRadius: '6px', fontWeight: '500', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitBug} 
                style={{
                  padding: '10px 20px', background: '#f73a3a', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Send size={16} /> Enviar reporte
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}