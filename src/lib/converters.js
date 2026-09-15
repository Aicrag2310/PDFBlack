import * as pdfjsLib from 'pdfjs-dist'

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Textbox
} from 'docx'

import * as XLSX from 'xlsx'
import JSZip from 'jszip'

import { downloadBytes } from './pdfExporter.js'


// ============================================================
// PDF.JS WORKER
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc ||= new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()


// ============================================================
// UTILIDADES
// ============================================================

const POINTS_PER_INCH = 72
const TWIPS_PER_POINT = 20


function pointsToInches(points) {
    return points / POINTS_PER_INCH
}


function pointsToTwips(points) {
    return Math.round(points * TWIPS_PER_POINT)
}


function getFontSize(item) {
    const transform = item.transform || []

    const a = Number(transform[0]) || 0
    const b = Number(transform[1]) || 0

    const size = Math.sqrt(
        (a * a) +
        (b * b)
    )

    // Evitar tamaños absurdos
    return Math.max(
        6,
        Math.min(
            72,
            size || 10
        )
    )
}


function isBoldFont(fontName = '') {
    return /bold|black|heavy|semibold|demi/i.test(
        fontName
    )
}


function groupTextByLine(items) {
    const lines = []

    const sorted = [...items]
        .filter(item => item.str && item.str.trim())
        .sort((a, b) => {
            const ay = a.transform[5]
            const by = b.transform[5]

            // PDF usa Y desde abajo.
            // Ordenamos de arriba hacia abajo.
            if (Math.abs(ay - by) > 3) {
                return by - ay
            }

            const ax = a.transform[4]
            const bx = b.transform[4]

            return ax - bx
        })

    for (const item of sorted) {
        const y = item.transform[5]

        let line = lines.find(
            current =>
                Math.abs(current.y - y) <= 3
        )

        if (!line) {
            line = {
                y,
                items: []
            }

            lines.push(line)
        }

        line.items.push(item)
    }

    // Ordenar elementos de cada línea
    for (const line of lines) {
        line.items.sort(
            (a, b) =>
                a.transform[4] -
                b.transform[4]
        )
    }

    return lines.sort(
        (a, b) =>
            b.y - a.y
    )
}


function createTextBoxFromLine(
    line,
    pageHeight
) {
    if (!line.items.length) {
        return null
    }

    const firstItem = line.items[0]

    const firstX =
        Number(firstItem.transform[4]) || 0

    const baseY =
        Number(firstItem.transform[5]) || 0

    const fontSize =
        getFontSize(firstItem)

    // ----------------------------------------------------------
    // Calculamos la posición vertical.
    //
    // PDF:
    //     Y empieza abajo
    //
    // Word:
    //     top empieza arriba
    // ----------------------------------------------------------

    const top =
        pageHeight -
        baseY -
        (fontSize * 1.2)

    // ----------------------------------------------------------
    // Calculamos el ancho total
    // ----------------------------------------------------------

    let right = firstX

    for (const item of line.items) {
        const x =
            Number(item.transform[4]) || 0

        const width =
            Number(item.width) || 0

        right = Math.max(
            right,
            x + width
        )
    }

    let width =
        right -
        firstX +
        8

    // Evitar dimensiones inválidas
    width = Math.max(
        width,
        20
    )

    const height =
        Math.max(
            fontSize * 1.5,
            14
        )

    // ----------------------------------------------------------
    // Creamos los TextRuns
    // ----------------------------------------------------------

    const children = []

    for (
        let index = 0;
        index < line.items.length;
        index++
    ) {
        const item =
            line.items[index]

        const text =
            item.str || ''

        if (!text) {
            continue
        }

        const itemFontSize =
            getFontSize(item)

        const fontName =
            item.fontName || ''

        const isBold =
            isBoldFont(fontName)

        // Si los elementos están separados
        // agregamos espacio cuando corresponde.
        if (
            index > 0 &&
            !text.startsWith(' ')
        ) {
            children.push(
                new TextRun({
                    text: ' '
                })
            )
        }

        children.push(
            new TextRun({
                text,
                bold: isBold,
                size: Math.round(
                    itemFontSize * 2
                ),
                font: 'Arial'
            })
        )
    }

    if (!children.length) {
        return null
    }

    // ----------------------------------------------------------
    // TextBox flotante
    // ----------------------------------------------------------

    return new Textbox({
        children,

        style: {
            width: `${pointsToInches(width)}in`,
            height: `${pointsToInches(height)}in`,

            position: 'absolute',

            left: `${pointsToInches(firstX)}in`,
            top: `${pointsToInches(top)}in`,

            wrapStyle: 'none'
        }
    })
}


// ============================================================
// 1. CONVERTIR PDF A WORD EDITABLE
// ============================================================

export async function convertToWord(
    fileBuffer,
    fileName
) {
    console.log(
        '========================================'
    )

    console.log(
        'AICRAG PDF - CONVERSIÓN A WORD EDITABLE'
    )

    console.log(
        '========================================'
    )

    const pdf =
        await pdfjsLib.getDocument({
            data: fileBuffer.slice(0)
        }).promise

    const sections = []

    // ==========================================================
    // Procesar cada página
    // ==========================================================

    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {
        console.log(
            `Procesando página ${pageNumber} de ${pdf.numPages}...`
        )

        const page =
            await pdf.getPage(pageNumber)

        // --------------------------------------------------------
        // Tamaño real de la página PDF
        // --------------------------------------------------------

        const viewBox =
            page.view

        const pageWidth =
            Math.abs(
                viewBox[2] -
                viewBox[0]
            )

        const pageHeight =
            Math.abs(
                viewBox[3] -
                viewBox[1]
            )

        console.log(
            'Tamaño:',
            pageWidth,
            'x',
            pageHeight
        )

        // --------------------------------------------------------
        // Obtener texto
        // --------------------------------------------------------

        const content =
            await page.getTextContent()

        const textItems =
            content.items.filter(
                item =>
                    item.str &&
                    item.str.trim()
            )

        // ========================================================
        // PÁGINA CON TEXTO
        // ========================================================

        if (textItems.length > 0) {
            console.log(
                `Página ${pageNumber}: ${textItems.length} elementos de texto`
            )

            const lines =
                groupTextByLine(
                    textItems
                )

            const children = []

            for (const line of lines) {
                const textBox =
                    createTextBoxFromLine(
                        line,
                        pageHeight
                    )

                if (textBox) {
                    children.push(
                        textBox
                    )
                }
            }

            // ------------------------------------------------------
            // Si por alguna razón no conseguimos TextBox
            // ------------------------------------------------------

            if (!children.length) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text:
                                    textItems
                                        .map(item => item.str)
                                        .join(' ')
                            })
                        ]
                    })
                )
            }

            // ------------------------------------------------------
            // Crear sección de esta página
            // ------------------------------------------------------

            sections.push({
                properties: {
                    page: {
                        size: {
                            width:
                                pointsToTwips(
                                    pageWidth
                                ),

                            height:
                                pointsToTwips(
                                    pageHeight
                                )
                        },

                        margin: {
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0
                        }
                    }
                },

                children
            })

            continue
        }

        // ========================================================
        // PÁGINA SIN TEXTO
        // ========================================================

        console.log(
            `Página ${pageNumber}: no contiene texto`
        )

        console.log(
            'Se insertará como imagen.'
        )

        const viewport =
            page.getViewport({
                scale: 2
            })

        const canvas =
            document.createElement(
                'canvas'
            )

        canvas.width =
            Math.ceil(
                viewport.width
            )

        canvas.height =
            Math.ceil(
                viewport.height
            )

        const ctx =
            canvas.getContext(
                '2d'
            )

        if (!ctx) {
            throw new Error(
                `No se pudo crear el canvas de la página ${pageNumber}.`
            )
        }

        // Fondo blanco
        ctx.fillStyle =
            '#FFFFFF'

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        )

        await page.render({
            canvasContext: ctx,
            viewport
        }).promise

        const imageBlob =
            await new Promise(
                (resolve, reject) => {
                    canvas.toBlob(
                        blob => {
                            if (blob) {
                                resolve(blob)
                            } else {
                                reject(
                                    new Error(
                                        `No se pudo convertir la página ${pageNumber} a PNG.`
                                    )
                                )
                            }
                        },
                        'image/png',
                        1
                    )
                }
            )

        const imageBuffer =
            await imageBlob.arrayBuffer()

        const imageWidth =
            Math.min(
                600,
                pageWidth
            )

        const imageHeight =
            imageWidth *
            (
                pageHeight /
                pageWidth
            )

        const children = [
            new Paragraph({
                children: [
                    new ImageRun({
                        type: 'png',

                        data: imageBuffer,

                        transformation: {
                            width: imageWidth,
                            height: imageHeight
                        }
                    })
                ]
            })
        ]

        sections.push({
            properties: {
                page: {
                    size: {
                        width:
                            pointsToTwips(
                                pageWidth
                            ),

                        height:
                            pointsToTwips(
                                pageHeight
                            )
                    },

                    margin: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    }
                }
            },

            children
        })
    }

    // ==========================================================
    // Crear documento Word
    // ==========================================================

    console.log(
        'Creando documento Word...'
    )

    const doc =
        new Document({
            sections
        })

    const blob =
        await Packer.toBlob(
            doc
        )

    const arrayBuffer =
        await blob.arrayBuffer()

    // ==========================================================
    // Descargar
    // ==========================================================

    downloadBytes(
        arrayBuffer,
        fileName.replace(
            /\.pdf$/i,
            '.docx'
        )
    )

    console.log(
        'Word generado correctamente.'
    )
}


// ============================================================
// 2. CONVERTIR PDF A EXCEL
// ============================================================

export async function convertToExcel(
    fileBuffer,
    fileName
) {
    const pdf =
        await pdfjsLib.getDocument({
            data: fileBuffer.slice(0)
        }).promise

    const workbook =
        XLSX.utils.book_new()

    for (
        let i = 1;
        i <= pdf.numPages;
        i++
    ) {
        const page =
            await pdf.getPage(i)

        const content =
            await page.getTextContent()

        const rowsMap = {}

        content.items.forEach(
            item => {
                const y =
                    Math.round(
                        item.transform[5]
                    )

                if (!rowsMap[y]) {
                    rowsMap[y] = []
                }

                rowsMap[y].push({
                    text: item.str,
                    x: item.transform[4]
                })
            }
        )

        const sortedY =
            Object.keys(rowsMap)
                .map(Number)
                .sort(
                    (a, b) =>
                        b - a
                )

        const sheetData =
            sortedY.map(y => {
                const rowItems =
                    rowsMap[y].sort(
                        (a, b) =>
                            a.x - b.x
                    )

                return rowItems.map(
                    item => item.text
                )
            })

        const worksheet =
            XLSX.utils.aoa_to_sheet(
                sheetData
            )

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            `Página ${i}`
        )
    }

    const excelBuffer =
        XLSX.write(
            workbook,
            {
                bookType: 'xlsx',
                type: 'array'
            }
        )

    downloadBytes(
        excelBuffer,
        fileName.replace(
            /\.pdf$/i,
            '.xlsx'
        )
    )
}


// ============================================================
// 3. CONVERTIR PDF A IMÁGENES
// ============================================================

export async function convertToImages(
    fileBuffer,
    fileName
) {
    const pdf =
        await pdfjsLib.getDocument({
            data: fileBuffer.slice(0)
        }).promise

    const zip =
        new JSZip()

    const imgFolder =
        zip.folder(
            'paginas_png'
        )

    for (
        let i = 1;
        i <= pdf.numPages;
        i++
    ) {
        const page =
            await pdf.getPage(i)

        const viewport =
            page.getViewport({
                scale: 2
            })

        const canvas =
            document.createElement(
                'canvas'
            )

        const ctx =
            canvas.getContext(
                '2d'
            )

        if (!ctx) {
            throw new Error(
                `No se pudo crear el canvas de la página ${i}.`
            )
        }

        canvas.width =
            Math.ceil(
                viewport.width
            )

        canvas.height =
            Math.ceil(
                viewport.height
            )

        await page.render({
            canvasContext: ctx,
            viewport
        }).promise

        const blob =
            await new Promise(
                (resolve, reject) => {
                    canvas.toBlob(
                        result => {
                            if (result) {
                                resolve(result)
                            } else {
                                reject(
                                    new Error(
                                        `No se pudo convertir la página ${i} a PNG.`
                                    )
                                )
                            }
                        },
                        'image/png'
                    )
                }
            )

        imgFolder.file(
            `pagina_${i}.png`,
            blob
        )
    }

    const zipBlob =
        await zip.generateAsync({
            type: 'blob'
        })

    const zipArrayBuffer =
        await zipBlob.arrayBuffer()

    downloadBytes(
        zipArrayBuffer,
        fileName.replace(
            /\.pdf$/i,
            '.zip'
        )
    )
}