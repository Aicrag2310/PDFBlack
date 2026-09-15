import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
    const win = new BrowserWindow({
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

    win.maximize()

    if (process.env.VITE_DEV_SERVER_URL) {
        console.log('Modo desarrollo')
        console.log('Vite URL:', process.env.VITE_DEV_SERVER_URL)

        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html')

        console.log('Modo producción')
        console.log('Cargando:', indexPath)

        win.loadFile(indexPath)
    }

    // Temporalmente activado para depuración
    // win.webContents.openDevTools()

    win.webContents.on('did-finish-load', () => {
        console.log('Aicrag PDF terminó de cargar')
    })

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('ERROR AL CARGAR:', errorCode, errorDescription)
    })

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log('[Renderer]', message)
    })
}

app.whenReady().then(() => {
    createWindow()

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