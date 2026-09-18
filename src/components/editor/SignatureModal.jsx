import React, { useRef, useState, useEffect } from 'react'
import {
  X,
  PenTool,
  Image as ImageIcon,
  Type,
  Trash2,
  Check,
  UploadCloud,
  RotateCcw,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfStore } from '../../store/pdfStore.js'
import styles from './SignatureModal.module.css'

const SIGNATURE_FONTS = [
  {
    id: 'dancing',
    name: 'Dancing Script',
    family: "'Dancing Script', cursive"
  },
  {
    id: 'great-vibes',
    name: 'Great Vibes',
    family: "'Great Vibes', cursive"
  },
  {
    id: 'pacifico',
    name: 'Pacifico',
    family: "'Pacifico', cursive"
  },
  {
    id: 'caveat',
    name: 'Caveat',
    family: "'Caveat', cursive"
  },
  {
    id: 'allura',
    name: 'Allura',
    family: "'Allura', cursive"
  },
  {
    id: 'satisfy',
    name: 'Satisfy',
    family: "'Satisfy', cursive"
  }
]

const SIGNATURE_COLORS = [
  '#111111',
  '#1d4ed8',
  '#0f766e',
  '#b91c1c'
]

export default function SignatureModal() {
  const {
    isSignatureModalOpen,
    setSignatureModalOpen,
    saveSignature
  } = usePdfStore()

  const [activeTab, setActiveTab] = useState('draw')
  const [signatureName, setSignatureName] = useState('Mi Firma')
  const [signatureColor, setSignatureColor] = useState('#111111')
  const [brushSize, setBrushSize] = useState(3)

  const [typedText, setTypedText] = useState('')
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].id)
  const [fontSize, setFontSize] = useState(56)

  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const [uploadedImage, setUploadedImage] = useState(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  const canvasRef = useRef(null)
  const typedCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  /*
   * ---------------------------------------------------------
   * CANVAS DE FIRMA DIBUJADA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = signatureColor
    ctx.lineWidth = brushSize
  }, [signatureColor, brushSize, activeTab, isSignatureModalOpen])

  const getCanvasPosition = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (event) => {
    if (activeTab !== 'draw') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasPosition(event)

    ctx.beginPath()
    ctx.moveTo(x, y)

    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (event) => {
    if (!isDrawing || activeTab !== 'draw') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasPosition(event)

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current

    if (!canvas) return

    const ctx = canvas.getContext('2d')

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    setHasDrawn(false)
  }

  /*
   * ---------------------------------------------------------
   * FIRMA ESCRITA
   * ---------------------------------------------------------
   */

  const getSelectedFont = () => {
    return (
      SIGNATURE_FONTS.find(
        font => font.id === selectedFont
      ) || SIGNATURE_FONTS[0]
    )
  }

  useEffect(() => {
    if (
      activeTab !== 'type' ||
      !typedCanvasRef.current
    ) {
      return
    }

    const canvas = typedCanvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    if (!typedText.trim()) return

    const font = getSelectedFont()

    ctx.fillStyle = signatureColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${fontSize}px ${font.family}`

    ctx.fillText(
      typedText,
      canvas.width / 2,
      canvas.height / 2
    )
  }, [
    typedText,
    selectedFont,
    signatureColor,
    fontSize,
    activeTab
  ])

  /*
   * ---------------------------------------------------------
   * PROCESAMIENTO DE IMAGEN
   * ---------------------------------------------------------
   *
   * Intenta detectar el fondo tomando como referencia
   * los píxeles de las esquinas.
   *
   * Esto permite trabajar con fondos blancos, grises,
   * rojos y otros colores uniformes.
   */

  const processAndColorizeImage = (
    dataUrl,
    targetColor
  ) => {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', {
            willReadFrequently: true
          })

          canvas.width = img.width
          canvas.height = img.height

          ctx.drawImage(img, 0, 0)

          const imageData = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          )

          const data = imageData.data

          /*
           * Tomamos varios píxeles de las esquinas
           * para determinar el color predominante
           * del fondo.
           */

          const samples = []

          const points = [
            [0, 0],
            [canvas.width - 1, 0],
            [0, canvas.height - 1],
            [
              canvas.width - 1,
              canvas.height - 1
            ],
            [
              Math.floor(canvas.width / 2),
              0
            ],
            [
              0,
              Math.floor(canvas.height / 2)
            ],
            [
              canvas.width - 1,
              Math.floor(canvas.height / 2)
            ],
            [
              Math.floor(canvas.width / 2),
              canvas.height - 1
            ]
          ]

          points.forEach(([x, y]) => {
            const index =
              (y * canvas.width + x) * 4

            samples.push({
              r: data[index],
              g: data[index + 1],
              b: data[index + 2]
            })
          })

          const background = samples.reduce(
            (acc, color) => ({
              r: acc.r + color.r,
              g: acc.g + color.g,
              b: acc.b + color.b
            }),
            { r: 0, g: 0, b: 0 }
          )

          background.r = Math.round(
            background.r / samples.length
          )

          background.g = Math.round(
            background.g / samples.length
          )

          background.b = Math.round(
            background.b / samples.length
          )

          /*
           * Color seleccionado
           */

          const hex = targetColor.replace('#', '')

          const rTarget = parseInt(
            hex.substring(0, 2),
            16
          )

          const gTarget = parseInt(
            hex.substring(2, 4),
            16
          )

          const bTarget = parseInt(
            hex.substring(4, 6),
            16
          )

          /*
           * Determina qué tan parecido es un píxel
           * al fondo.
           */

          const colorDistance = (
            r1,
            g1,
            b1,
            r2,
            g2,
            b2
          ) => {
            return Math.sqrt(
              Math.pow(r1 - r2, 2) +
              Math.pow(g1 - g2, 2) +
              Math.pow(b1 - b2, 2)
            )
          }

          for (
            let i = 0;
            i < data.length;
            i += 4
          ) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const alpha = data[i + 3]

            if (alpha < 10) {
              data[i + 3] = 0
              continue
            }

            const distance = colorDistance(
              r,
              g,
              b,
              background.r,
              background.g,
              background.b
            )

            /*
             * Fondo muy parecido al color de las
             * esquinas.
             */
            if (distance < 55) {
              data[i + 3] = 0
              continue
            }

            /*
             * Si es ligeramente parecido al fondo,
             * hacemos transparencia progresiva.
             */
            if (distance < 100) {
              const opacity =
                Math.min(
                  255,
                  Math.max(
                    0,
                    ((distance - 55) / 45) * 255
                  )
                )

              data[i + 3] = opacity
            }

            /*
             * Todo lo que quedó como tinta
             * toma el color seleccionado.
             */
            data[i] = rTarget
            data[i + 1] = gTarget
            data[i + 2] = bTarget
          }

          ctx.putImageData(
            imageData,
            0,
            0
          )

          resolve(
            canvas.toDataURL('image/png')
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(
          new Error(
            'No se pudo procesar la imagen'
          )
        )
      }

      img.src = dataUrl
    })
  }

  /*
   * ---------------------------------------------------------
   * SUBIR IMAGEN
   * ---------------------------------------------------------
   */

  const handleFileUpload = event => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(
        'Selecciona una imagen válida'
      )
      return
    }

    const reader = new FileReader()

    reader.onload = async e => {
      try {
        setIsProcessingImage(true)

        toast.loading(
          'Detectando y eliminando fondo...',
          {
            id: 'signature-processing'
          }
        )

        const cleanImage =
          await processAndColorizeImage(
            e.target.result,
            signatureColor
          )

        setUploadedImage(cleanImage)

        toast.success(
          'Fondo eliminado correctamente',
          {
            id: 'signature-processing'
          }
        )
      } catch (error) {
        console.error(
          'Error procesando firma:',
          error
        )

        toast.error(
          'No fue posible procesar la imagen',
          {
            id: 'signature-processing'
          }
        )
      } finally {
        setIsProcessingImage(false)
      }
    }

    reader.readAsDataURL(file)

    /*
     * Permite seleccionar nuevamente
     * la misma imagen.
     */
    event.target.value = ''
  }

  /*
   * ---------------------------------------------------------
   * CREAR FIRMA DESDE TEXTO
   * ---------------------------------------------------------
   */

  const createTypedSignature = () => {
    const canvas = typedCanvasRef.current

    if (!canvas || !typedText.trim()) {
      return null
    }

    return canvas.toDataURL('image/png')
  }

  /*
   * ---------------------------------------------------------
   * GUARDAR FIRMA
   * ---------------------------------------------------------
   */

  const handleSave = async () => {
    if (!signatureName.trim()) {
      toast.error(
        'Asigna un nombre a la firma'
      )
      return
    }

    let finalDataUrl = ''

    try {
      /*
       * DIBUJAR
       */
      if (
        activeTab === 'draw'
      ) {
        if (!hasDrawn) {
          toast.error(
            'Dibuja tu firma primero'
          )
          return
        }

        const rawCanvas =
          canvasRef.current.toDataURL(
            'image/png'
          )

        finalDataUrl =
          await processAndColorizeImage(
            rawCanvas,
            signatureColor
          )
      }

      /*
       * ESCRIBIR
       */
      else if (
        activeTab === 'type'
      ) {
        if (!typedText.trim()) {
          toast.error(
            'Escribe tu nombre primero'
          )
          return
        }

        finalDataUrl =
          createTypedSignature()
      }

      /*
       * SUBIR IMAGEN
       */
      else if (activeTab === 'upload') {
        if (!uploadedImage) {
          toast.error(
            'Sube una imagen de firma primero'
          )
          return
        }

        // La imagen ya fue procesada al momento de subirla.
        // No volver a eliminar el fondo.
        finalDataUrl = uploadedImage
      }

      if (!finalDataUrl) {
        toast.error(
          'No se pudo crear la firma'
        )
        return
      }

      const newSignature = {
        id: `sig-${Date.now()}`,
        name: signatureName.trim(),
        dataUrl: finalDataUrl,
        color: signatureColor
      }

      saveSignature(newSignature)

      toast.success(
        'Firma guardada correctamente'
      )

      closeModal()
    } catch (error) {
      console.error(
        'Error guardando firma:',
        error
      )

      toast.error(
        'No fue posible guardar la firma'
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * CERRAR
   * ---------------------------------------------------------
   */

  const closeModal = () => {
    setSignatureModalOpen(false)

    clearCanvas()

    setUploadedImage(null)

    setTypedText('')

    setSignatureName(
      'Mi Firma'
    )

    setActiveTab('draw')

    setSignatureColor(
      '#111111'
    )

    setBrushSize(3)

    setFontSize(56)

    setSelectedFont(
      SIGNATURE_FONTS[0].id
    )
  }

  if (!isSignatureModalOpen) {
    return null
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div
      className={styles.overlay}
      onMouseDown={closeModal}
    >
      <div
        className={styles.modal}
        onMouseDown={e =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <header className={styles.header}>

          <div className={styles.headerLeft}>

            <div className={styles.headerIcon}>
              <PenTool size={18} />
            </div>

            <div>
              <h2>
                Firmar documento
              </h2>

              <span>
                Crea o selecciona una firma
              </span>
            </div>

          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeModal}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

        </header>

        {/* CONTENT */}

        <div className={styles.content}>

          {/* SIDEBAR */}

          <aside className={styles.sidebar}>

            <div className={styles.sidebarTitle}>
              CREAR FIRMA
            </div>

            <button
              type="button"
              className={`${styles.toolButton} ${
                activeTab === 'draw'
                  ? styles.toolButtonActive
                  : ''
              }`}
              onClick={() =>
                setActiveTab('draw')
              }
            >
              <PenTool size={18} />

              <span>
                Dibujar
              </span>
            </button>

            <button
              type="button"
              className={`${styles.toolButton} ${
                activeTab === 'type'
                  ? styles.toolButtonActive
                  : ''
              }`}
              onClick={() =>
                setActiveTab('type')
              }
            >
              <Type size={18} />

              <span>
                Escribir
              </span>
            </button>

            <button
              type="button"
              className={`${styles.toolButton} ${
                activeTab === 'upload'
                  ? styles.toolButtonActive
                  : ''
              }`}
              onClick={() =>
                setActiveTab('upload')
              }
            >
              <ImageIcon size={18} />

              <span>
                Imagen
              </span>
            </button>

            <div className={styles.divider} />

            {/* NAME */}

            <div className={styles.sidebarSection}>

              <label className={styles.label}>
                Nombre de la firma
              </label>

              <input
                type="text"
                className={styles.textInput}
                value={signatureName}
                onChange={e =>
                  setSignatureName(
                    e.target.value
                  )
                }
                placeholder="Ej. Firma personal"
                maxLength={40}
              />

            </div>

            {/* COLOR */}

            <div className={styles.sidebarSection}>

              <label className={styles.label}>
                Color
              </label>

              <div className={styles.colors}>

                {SIGNATURE_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.colorButton} ${
                      signatureColor === color
                        ? styles.colorButtonActive
                        : ''
                    }`}
                    style={{
                      '--signature-color':
                        color
                    }}
                    onClick={() =>
                      setSignatureColor(
                        color
                      )
                    }
                    aria-label={`Color ${color}`}
                  >
                    <span />
                  </button>
                ))}

                <label
                  className={
                    styles.customColor
                  }
                  title="Color personalizado"
                >
                  <input
                    type="color"
                    value={signatureColor}
                    onChange={e =>
                      setSignatureColor(
                        e.target.value
                      )
                    }
                  />

                  <span
                    style={{
                      backgroundColor:
                        signatureColor
                    }}
                  />
                </label>

              </div>

            </div>

            {/* DRAW SETTINGS */}

            {activeTab === 'draw' && (
              <div
                className={
                  styles.sidebarSection
                }
              >

                <div
                  className={
                    styles.settingHeader
                  }
                >
                  <label className={styles.label}>
                    Grosor
                  </label>

                  <span>
                    {brushSize}px
                  </span>
                </div>

                <input
                  className={styles.range}
                  type="range"
                  min="1"
                  max="8"
                  value={brushSize}
                  onChange={e =>
                    setBrushSize(
                      Number(e.target.value)
                    )
                  }
                />

              </div>
            )}

          </aside>

          {/* WORKSPACE */}

          <main className={styles.workspace}>

            <div className={styles.workspaceHeader}>

              <div>
                <h3>
                  {activeTab === 'draw' &&
                    'Dibuja tu firma'}

                  {activeTab === 'type' &&
                    'Escribe tu firma'}

                  {activeTab === 'upload' &&
                    'Carga una imagen'}
                </h3>

                <p>
                  {activeTab === 'draw' &&
                    'Dibuja dentro del área utilizando el mouse o touch.'}

                  {activeTab === 'type' &&
                    'Escribe tu nombre y selecciona un estilo manuscrito.'}

                  {activeTab === 'upload' &&
                    'El fondo de la imagen se eliminará automáticamente.'}
                </p>
              </div>

            </div>

            {/* DRAW */}

            {activeTab === 'draw' && (
              <div className={styles.signatureWorkspace}>

                <div
                  className={
                    styles.canvasFrame
                  }
                >

                  <div
                    className={
                      styles.paperHint
                    }
                  >
                    Firme aquí
                  </div>

                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={300}
                    className={styles.canvas}
                    onMouseDown={
                      startDrawing
                    }
                    onMouseMove={
                      draw
                    }
                    onMouseUp={
                      stopDrawing
                    }
                    onMouseLeave={
                      stopDrawing
                    }
                    onTouchStart={e => {
                      e.preventDefault()

                      const touch =
                        e.touches[0]

                      startDrawing({
                        clientX:
                          touch.clientX,
                        clientY:
                          touch.clientY
                      })
                    }}
                    onTouchMove={e => {
                      e.preventDefault()

                      if (
                        !isDrawing
                      ) {
                        return
                      }

                      const touch =
                        e.touches[0]

                      draw({
                        clientX:
                          touch.clientX,
                        clientY:
                          touch.clientY
                      })
                    }}
                    onTouchEnd={
                      stopDrawing
                    }
                  />

                </div>

                <button
                  type="button"
                  className={
                    styles.secondaryAction
                  }
                  onClick={clearCanvas}
                >
                  <RotateCcw
                    size={15}
                  />

                  Borrar trazo
                </button>

              </div>
            )}

            {/* TYPE */}

            {activeTab === 'type' && (
              <div className={styles.typeWorkspace}>

                <div
                  className={
                    styles.typeControls
                  }
                >

                  <div
                    className={
                      styles.typeInputGroup
                    }
                  >

                    <label>
                      Escribe tu nombre
                    </label>

                    <input
                      type="text"
                      value={typedText}
                      onChange={e =>
                        setTypedText(
                          e.target.value
                        )
                      }
                      placeholder="Alejandro García"
                      className={
                        styles.signatureTextInput
                      }
                      maxLength={50}
                      autoFocus
                    />

                  </div>

                  <div
                    className={
                      styles.typeInputGroup
                    }
                  >

                    <label>
                      Estilo
                    </label>

                    <div
                      className={
                        styles.selectWrapper
                      }
                    >

                      <select
                        value={selectedFont}
                        onChange={e =>
                          setSelectedFont(
                            e.target.value
                          )
                        }
                        className={
                          styles.fontSelect
                        }
                      >
                        {SIGNATURE_FONTS.map(
                          font => (
                            <option
                              key={font.id}
                              value={font.id}
                            >
                              {font.name}
                            </option>
                          )
                        )}
                      </select>

                      <ChevronDown
                        size={16}
                        className={
                          styles.selectIcon
                        }
                      />

                    </div>

                  </div>

                  <div
                    className={
                      styles.typeInputGroup
                    }
                  >

                    <div
                      className={
                        styles.settingHeader
                      }
                    >
                      <label>
                        Tamaño
                      </label>

                      <span>
                        {fontSize}px
                      </span>
                    </div>

                    <input
                      className={
                        styles.range
                      }
                      type="range"
                      min="30"
                      max="90"
                      value={fontSize}
                      onChange={e =>
                        setFontSize(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                  </div>

                </div>

                <div
                  className={
                    styles.fontPreviewGrid
                  }
                >

                  {SIGNATURE_FONTS.map(font => (
                    <button
                      key={font.id}
                      type="button"
                      className={`${styles.fontCard} ${
                        selectedFont ===
                        font.id
                          ? styles.fontCardActive
                          : ''
                      }`}
                      onClick={() =>
                        setSelectedFont(
                          font.id
                        )
                      }
                    >

                      <span
                        className={
                          styles.fontName
                        }
                      >
                        {font.name}
                      </span>

                      <span
                        className={
                          styles.fontSample
                        }
                        style={{
                          fontFamily:
                            font.family,
                          color:
                            signatureColor
                        }}
                      >
                        {typedText ||
                          'Alejandro García'}
                      </span>

                    </button>
                  ))}

                </div>

                <div
                  className={
                    styles.typedPreviewFrame
                  }
                >

                  <span
                    className={
                      styles.previewLabel
                    }
                  >
                    VISTA PREVIA
                  </span>

                  <canvas
                    ref={typedCanvasRef}
                    width={760}
                    height={280}
                    className={
                      styles.typedCanvas
                    }
                  />

                </div>

              </div>
            )}

            {/* UPLOAD */}

            {activeTab === 'upload' && (
              <div
                className={
                  styles.uploadWorkspace
                }
              >

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className={
                    styles.hiddenInput
                  }
                  onChange={
                    handleFileUpload
                  }
                />

                {!uploadedImage ? (
                  <button
                    type="button"
                    className={
                      styles.dropZone
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      isProcessingImage
                    }
                  >

                    <div
                      className={
                        styles.uploadIcon
                      }
                    >
                      <UploadCloud
                        size={25}
                      />
                    </div>

                    <strong>
                      Seleccionar imagen
                    </strong>

                    <span>
                      PNG, JPG o WEBP
                    </span>

                    <small>
                      El fondo se eliminará
                      automáticamente
                    </small>

                  </button>
                ) : (
                  <div
                    className={
                      styles.imagePreview
                    }
                  >

                    <div
                      className={
                        styles.imagePreviewHeader
                      }
                    >
                      <div>
                        <strong>
                          Firma detectada
                        </strong>

                        <span>
                          Fondo transparente
                        </span>
                      </div>

                      <button
                        type="button"
                        className={
                          styles.secondaryAction
                        }
                        onClick={() =>
                          setUploadedImage(
                            null
                          )
                        }
                      >
                        <Trash2
                          size={15}
                        />

                        Cambiar imagen
                      </button>

                    </div>

                    <div
                      className={
                        styles.imageCanvas
                      }
                    >

                      <img
                        src={uploadedImage}
                        alt="Firma procesada"
                      />

                    </div>

                  </div>
                )}

              </div>
            )}

          </main>

        </div>

        {/* FOOTER */}

        <footer className={styles.footer}>

          <div
            className={
              styles.footerInfo
            }
          >
            <span
              className={
                styles.statusDot
              }
            />

            Firma digital
          </div>

          <div
            className={
              styles.footerActions
            }
          >

            <button
              type="button"
              className={
                styles.cancelButton
              }
              onClick={closeModal}
            >
              Cancelar
            </button>

            <button
              type="button"
              className={
                styles.saveButton
              }
              onClick={handleSave}
              disabled={
                isProcessingImage
              }
            >
              <Check size={17} />

              Guardar firma
            </button>

          </div>

        </footer>

      </div>
    </div>
  )
}