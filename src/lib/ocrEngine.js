import { createWorker } from 'tesseract.js'

let worker = null

// Guardamos la función de progreso en una variable fuera del worker
// Esto nos permite actualizar la UI de React sin tener que apagar y prender el OCR
let currentOnProgress = null

export async function initOcr() {
  if (!worker) {
    // Sintaxis oficial y correcta para Tesseract v5
    // 'spa' (Español), 1 (Modo de motor), y el objeto de configuración
    worker = await createWorker('spa', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && currentOnProgress) {
          currentOnProgress(Math.round(m.progress * 100))
        }
      }
    })
  }
  return worker
}

export async function ocrCanvas(canvas, onProgress) {
  // Conectamos la barra de progreso de React al OCR
  currentOnProgress = onProgress

  // Arrancamos o reutilizamos el worker (¡ahora es instantáneo después de la primera vez!)
  const w = await initOcr()
  const { data } = await w.recognize(canvas)

  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  const words = []
  for (const block of data.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const word of line.words || []) {
          if (!word.text.trim() || word.confidence < 30) continue

          words.push({
            id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            str: word.text,
            // Ajuste perfecto para pantallas Retina/HD
            x: word.bbox.x0 / dpr,
            y: word.bbox.y0 / dpr,
            width: (word.bbox.x1 - word.bbox.x0) / dpr,
            height: (word.bbox.y1 - word.bbox.y0) / dpr,
            fontSize: Math.max(((word.bbox.y1 - word.bbox.y0) / dpr) * 0.8, 8),
            fontName: 'Helvetica',
            color: '#000000',
            confidence: word.confidence,
            fromOcr: true,
          })
        }
      }
    }
  }
  return words
}

export async function terminateOcr() {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}