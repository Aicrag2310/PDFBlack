import React, { useEffect, useState } from 'react'
import {
  Download,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

import './UpdateModal.css'

const { ipcRenderer } = window.require
  ? window.require('electron')
  : { ipcRenderer: null }


function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB'

  const mb = bytes / 1024 / 1024

  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${mb.toFixed(1)} MB`
}


function parseReleaseNotes(notes) {
  if (!notes) return []

  if (Array.isArray(notes)) {
    return notes
      .map(item => {
        if (typeof item === 'string') return item

        return (
          item?.note ||
          item?.body ||
          item?.text ||
          ''
        )
      })
      .filter(Boolean)
  }

  if (typeof notes === 'string') {
    return notes
      .replace(/<[^>]*>/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line =>
        line
          .replace(/^[-*]\s*/, '')
          .replace(/^#+\s*/, '')
      )
  }

  return []
}


export default function UpdateModal() {
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState('available')

  const [version, setVersion] = useState('')
  const [releaseNotes, setReleaseNotes] = useState([])

  const [progress, setProgress] = useState(0)
  const [transferred, setTransferred] = useState(0)
  const [total, setTotal] = useState(0)

  const [error, setError] = useState('')


  useEffect(() => {
    if (!ipcRenderer) {
      console.warn(
        'ipcRenderer no está disponible.'
      )

      return
    }


    const handleChecking = () => {
      console.log(
        '[Updater UI] Buscando actualización...'
      )
    }


    const handleAvailable = (event, info) => {
      console.log(
        '[Updater UI] Nueva versión:',
        info.version
      )

      setVersion(info.version)

      setReleaseNotes(
        parseReleaseNotes(info.releaseNotes)
      )

      setProgress(0)
      setTransferred(0)
      setTotal(0)

      setError('')
      setStatus('available')
      setVisible(true)
    }


    const handleProgress = (event, info) => {
      setProgress(info.percent || 0)
      setTransferred(info.transferred || 0)
      setTotal(info.total || 0)

      setStatus('downloading')
      setVisible(true)
    }


    const handleDownloaded = (event, info) => {
      console.log(
        '[Updater UI] Actualización descargada:',
        info.version
      )

      setVersion(info.version)

      setReleaseNotes(
        parseReleaseNotes(info.releaseNotes)
      )

      setProgress(100)

      setStatus('downloaded')
      setVisible(true)
    }


    const handleError = (event, info) => {
      console.error(
        '[Updater UI] Error:',
        info.message
      )

      setError(
        info.message ||
        'No se pudo completar la actualización.'
      )

      setStatus('error')
      setVisible(true)
    }


    ipcRenderer.on(
      'update-checking',
      handleChecking
    )

    ipcRenderer.on(
      'update-available',
      handleAvailable
    )

    ipcRenderer.on(
      'update-progress',
      handleProgress
    )

    ipcRenderer.on(
      'update-downloaded',
      handleDownloaded
    )

    ipcRenderer.on(
      'update-error',
      handleError
    )


    return () => {
      ipcRenderer.removeListener(
        'update-checking',
        handleChecking
      )

      ipcRenderer.removeListener(
        'update-available',
        handleAvailable
      )

      ipcRenderer.removeListener(
        'update-progress',
        handleProgress
      )

      ipcRenderer.removeListener(
        'update-downloaded',
        handleDownloaded
      )

      ipcRenderer.removeListener(
        'update-error',
        handleError
      )
    }
  }, [])


  const handleCancel = () => {
    setVisible(false)
    setStatus('available')
  }


  const handleDownload = async () => {
    if (!ipcRenderer) return

    setError('')
    setStatus('downloading')
    setProgress(0)

    const result = await ipcRenderer.invoke(
      'update-download'
    )

    if (!result?.success) {
      setError(
        result?.error ||
        'No se pudo descargar la actualización.'
      )

      setStatus('error')
    }
  }


  const handleInstall = async () => {
    if (!ipcRenderer) return

    await ipcRenderer.invoke(
      'update-install'
    )
  }


  if (!visible) {
    return null
  }


  return (
    <div className="update-overlay">

      <div className="update-modal">

        {status === 'available' && (
          <>
            <div className="update-icon">
              <Download size={26} />
            </div>

            <h2>
              Nueva actualización disponible
            </h2>

            <div className="update-version">
              Aicrag PDF {version}
            </div>

            <p className="update-description">
              Hay una nueva versión de Aicrag PDF
              disponible para instalar.
            </p>


            {releaseNotes.length > 0 && (
              <div className="update-notes">

                <div className="update-notes-title">
                  ¿Qué hay de nuevo?
                </div>

                <ul>
                  {releaseNotes.map(
                    (note, index) => (
                      <li key={index}>
                        {note}
                      </li>
                    )
                  )}
                </ul>

              </div>
            )}


            <div className="update-actions">

              <button
                className="update-button-secondary"
                onClick={handleCancel}
              >
                <X size={16} />
                Cancelar
              </button>

              <button
                className="update-button-primary"
                onClick={handleDownload}
              >
                <Download size={16} />
                Actualizar e instalar
              </button>

            </div>
          </>
        )}


        {status === 'downloading' && (
          <>
            <div className="update-icon downloading">
              <Loader2
                size={27}
                className="update-spin"
              />
            </div>

            <h2>
              Descargando actualización
            </h2>

            <div className="update-version">
              Aicrag PDF {version}
            </div>

            <p className="update-description">
              Descargando los archivos necesarios...
            </p>


            <div className="update-progress-container">

              <div className="update-progress-header">
                <span>
                  Descargando...
                </span>

                <strong>
                  {Math.round(progress)}%
                </strong>
              </div>

              <div className="update-progress">
                <div
                  className="update-progress-bar"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="update-progress-info">
                {formatBytes(transferred)}
                {' / '}
                {formatBytes(total)}
              </div>

            </div>

            <p className="update-warning">
              No cierres Aicrag PDF mientras se
              descarga la actualización.
            </p>
          </>
        )}


        {status === 'downloaded' && (
          <>
            <div className="update-icon success">
              <CheckCircle2 size={28} />
            </div>

            <h2>
              Actualización lista
            </h2>

            <div className="update-version">
              Aicrag PDF {version}
            </div>

            <p className="update-description">
              La actualización se descargó
              correctamente y está lista para
              instalarse.
            </p>


            {releaseNotes.length > 0 && (
              <div className="update-notes">

                <div className="update-notes-title">
                  Cambios incluidos
                </div>

                <ul>
                  {releaseNotes.map(
                    (note, index) => (
                      <li key={index}>
                        {note}
                      </li>
                    )
                  )}
                </ul>

              </div>
            )}


            <div className="update-actions">

              <button
                className="update-button-primary update-install"
                onClick={handleInstall}
              >
                <RefreshCw size={16} />
                Reiniciar e instalar
              </button>

            </div>
          </>
        )}


        {status === 'error' && (
          <>
            <div className="update-icon error">
              <AlertCircle size={28} />
            </div>

            <h2>
              Error al actualizar
            </h2>

            <p className="update-description">
              No se pudo completar la actualización.
            </p>

            <div className="update-error">
              {error}
            </div>

            <div className="update-actions">

              <button
                className="update-button-secondary"
                onClick={handleCancel}
              >
                Cerrar
              </button>

            </div>
          </>
        )}

      </div>
    </div>
  )
}