import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

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
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html')
        console.log('Modo producción')
        console.log('Cargando:', indexPath)
        win.loadFile(indexPath)
    }

}


// ========================================
// AUTO-UPDATER
// ========================================

autoUpdater.on('checking-for-update', () => {
    console.log('Buscando actualizaciones...')
})

autoUpdater.on('update-available', (info) => {
    console.log('NUEVA ACTUALIZACIÓN:', info.version)

    dialog.showMessageBox({
        type: 'info',
        title: 'Aicrag PDF',
        message: `Hay una nueva versión disponible: ${info.version}`,
        detail: 'La actualización se descargará automáticamente.'
    })
})

autoUpdater.on('update-not-available', (info) => {
    console.log('No hay actualizaciones.')
    console.log('Versión actual:', app.getVersion())
    console.log('Versión remota:', info.version)

    dialog.showMessageBox({
        type: 'info',
        title: 'Aicrag PDF',
        message: 'No hay actualizaciones disponibles.',
        detail: `Versión instalada: ${app.getVersion()}`
    })
})

autoUpdater.on('error', (error) => {
    console.error('ERROR AUTO-UPDATER:', error)

    dialog.showErrorBox(
        'Error del actualizador',
        error?.message || String(error)
    )
})

autoUpdater.on('download-progress', (progress) => {
    console.log(
        `Descargando actualización: ${Math.round(progress.percent)}%`
    )
})

autoUpdater.on('update-downloaded', (info) => {
    console.log('Actualización descargada:', info.version)

    dialog.showMessageBox({
        type: 'info',
        title: 'Aicrag PDF',
        message: `La versión ${info.version} está lista.`,
        detail: 'La actualización se instalará al cerrar la aplicación.'
    })
})


// ========================================
// ELECTRON
// ========================================

app.whenReady().then(() => {
    console.log('VERSION DE ELECTRON:', app.getVersion())
    createWindow()

    setTimeout(() => {
        if (!process.env.VITE_DEV_SERVER_URL) {

            console.log('================================')
            console.log('COMPROBANDO ACTUALIZACIONES')
            console.log('Versión instalada:', app.getVersion())
            console.log('================================')

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