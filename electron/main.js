import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null

// 🛑 1. BLOQUEO DE INSTANCIA ÚNICA (Evita que la app se abra en bucle y congele la PC)
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine) => {
        // Si alguien intenta abrir otra ventana o un PDF por doble clic con la app ya abierta:
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()

            // Buscar si pasaron un archivo PDF en los argumentos de la segunda instancia
            const pdfArg = commandLine.find(arg => arg && typeof arg === 'string' && arg.toLowerCase().includes('.pdf'))
            if (pdfArg) {
                const filePath = pdfArg.replace(/^["'](.+)["']$/, '$1')
                console.log('Abriendo segundo PDF desde el sistema:', filePath)
                mainWindow.webContents.send('open-pdf-from-os', filePath)
            }
        }
    })
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    mainWindow.maximize()
    mainWindow.webContents.openDevTools()
    // 📂 1. Capturar la ruta del PDF de forma robusta al iniciar (con comillas limpias)
    let fileToOpen = null
    if (process.platform === 'win32') {
        const pdfArg = process.argv.find(arg => arg && typeof arg === 'string' && arg.toLowerCase().includes('.pdf'))
        if (pdfArg) {
            fileToOpen = pdfArg.replace(/^["'](.+)["']$/, '$1')
        }
    }

    if (process.env.VITE_DEV_SERVER_URL) {
        console.log('Modo desarrollo')
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html')
        console.log('Modo producción')
        console.log('Cargando:', indexPath)
        mainWindow.loadFile(indexPath)
    }

    // 📂 2. Asegurarnos de enviar el archivo cuando el renderer esté 100% listo con un pequeño respiro
    mainWindow.webContents.on('did-finish-load', () => {
        if (fileToOpen) {
            console.log('Enviando PDF inicial al frontend para abrir:', fileToOpen)
            setTimeout(() => {
                mainWindow.webContents.send('open-pdf-from-os', fileToOpen)
            }, 500)
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

/*
|--------------------------------------------------------------------------
| AUTO-UPDATER
|--------------------------------------------------------------------------
*/

autoUpdater.on('checking-for-update', () => {
    console.log('Comprobando actualizaciones...')
})

autoUpdater.on('update-available', (info) => {
    console.log('Nueva actualización encontrada:', info.version)
    if (mainWindow) {
        mainWindow.webContents.send('update-available', { version: info.version })
    }
})

autoUpdater.on('update-not-available', () => {
    console.log('Sin actualizaciones.')
})

autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-progress', { percent: Math.round(progress.percent) })
    }
})

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', { version: info.version })
    }
})

autoUpdater.on('error', (error) => {
    console.error('Error en auto-updater:', error)
})

ipcMain.handle('update-download', async () => {
    try {
        await autoUpdater.downloadUpdate()
        return { success: true }
    } catch (error) {
        return { success: false, error: error?.message }
    }
})

ipcMain.handle('update-install', () => {
    autoUpdater.quitAndInstall()
    return { success: true }
})


/*
|--------------------------------------------------------------------------
| INICIO DE LA APLICACIÓN
|--------------------------------------------------------------------------
*/

app.whenReady().then(() => {
    createWindow()

    setTimeout(() => {
        if (!process.env.VITE_DEV_SERVER_URL) {
            autoUpdater.checkForUpdates()
        }
    }, 3000)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})