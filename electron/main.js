import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { autoUpdater } from 'electron-updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
        }
    })

    win.maximize()

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // Comprobar actualizaciones cuando la ventana esté lista (en producción)
    win.once('ready-to-show', () => {
        if (!process.env.VITE_DEV_SERVER_URL) {
            autoUpdater.checkForUpdatesAndNotify()
        }
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall()
})