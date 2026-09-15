import * as pdfjsLib from 'pdfjs-dist'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { downloadBytes } from './pdfExporter.js' // Reutilizamos tu función de descarga

// Asegurarnos de que el worker esté listo
pdfjsLib.GlobalWorkerOptions.workerSrc ||= new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

// 1. CONVERTIR A WORD (.docx)
export async function convertToWord(fileBuffer, fileName) {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer.slice(0) }).promise
    const docxParagraphs = []

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()

        docxParagraphs.push(new Paragraph({
            children: [new TextRun({ text: `--- PÁGINA ${i} ---`, bold: true, color: "888888" })],
        }))

        // Extraemos el texto. (Una versión básica que une los textos por línea)
        let currentY = null
        let currentLine = ""

        for (const item of content.items) {
            if (currentY !== item.transform[5] && currentLine !== "") {
                docxParagraphs.push(new Paragraph({ text: currentLine.trim() }))
                currentLine = ""
            }
            currentLine += item.str + " "
            currentY = item.transform[5]
        }
        if (currentLine) docxParagraphs.push(new Paragraph({ text: currentLine.trim() }))
        docxParagraphs.push(new Paragraph({ text: "" })) // Salto de línea
    }

    const doc = new Document({ sections: [{ properties: {}, children: docxParagraphs }] })
    const blob = await Packer.toBlob(doc)
    const arrayBuffer = await blob.arrayBuffer()
    downloadBytes(arrayBuffer, fileName.replace('.pdf', '.docx'))
}

// 2. CONVERTIR A EXCEL (.xlsx)
export async function convertToExcel(fileBuffer, fileName) {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer.slice(0) }).promise
    const workbook = XLSX.utils.book_new()

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()

        // Agrupamos el texto por coordenadas Y para intentar armar "filas"
        const rowsMap = {}
        content.items.forEach(item => {
            const y = Math.round(item.transform[5]) // Coordenada Y
            if (!rowsMap[y]) rowsMap[y] = []
            rowsMap[y].push({ text: item.str, x: item.transform[4] })
        })

        // Ordenamos las filas de arriba hacia abajo y las columnas de izq a der
        const sortedY = Object.keys(rowsMap).map(Number).sort((a, b) => b - a)
        const sheetData = sortedY.map(y => {
            const rowItems = rowsMap[y].sort((a, b) => a.x - b.x)
            return rowItems.map(item => item.text)
        })

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
        XLSX.utils.book_append_sheet(workbook, worksheet, `Página ${i}`)
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    downloadBytes(excelBuffer, fileName.replace('.pdf', '.xlsx'))
}

// 3. CONVERTIR A IMÁGENES ZIP (.png)
export async function convertToImages(fileBuffer, fileName) {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer.slice(0) }).promise
    const zip = new JSZip()
    const imgFolder = zip.folder("paginas_png")

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 }) // Escala 2 para buena calidad

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport }).promise

        // Convertir canvas a blob para meterlo al ZIP
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        imgFolder.file(`pagina_${i}.png`, blob)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipArrayBuffer = await zipBlob.arrayBuffer()
    downloadBytes(zipArrayBuffer, fileName.replace('.pdf', '.zip'))
}