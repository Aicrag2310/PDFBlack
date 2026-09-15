import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null

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

    if (process.env.VITE_DEV_SERVER_URL) {
        console.log('Modo desarrollo')
        console.log('Vite URL:', process.env.VITE_DEV_SERVER_URL)

        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html')

        console.log('Modo producción')
        console.log('Cargando:', indexPath)

        mainWindow.loadFile(indexPath)
    }

}

/*
|--------------------------------------------------------------------------
| AUTO-UPDATER
|--------------------------------------------------------------------------
*/

autoUpdater.on('checking-for-update', () => {
    console.log('================================')
    console.log('COMPROBANDO ACTUALIZACIONES')
    console.log(`Versión instalada: ${app.getVersion()}`)
    console.log('================================')

    if (mainWindow) {
        mainWindow.webContents.send('update-checking')
    }
})


autoUpdater.on('update-available', (info) => {
    console.log('================================')
    console.log('NUEVA ACTUALIZACIÓN')
    console.log(`Versión: ${info.version}`)
    console.log('================================')

    if (mainWindow) {
        mainWindow.webContents.send('update-available', {
            version: info.version,
            releaseNotes: info.releaseNotes || '',
            releaseDate: info.releaseDate || '',
        })
    }
})


autoUpdater.on('update-not-available', (info) => {
    console.log('No hay actualizaciones disponibles.')

    if (mainWindow) {
        mainWindow.webContents.send('update-not-available', {
            version: info.version,
        })
    }
})


autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent)

    console.log(
        `Descargando actualización: ${percent}%`
    )

    if (mainWindow) {
        mainWindow.webContents.send('update-progress', {
            percent,
            transferred: progress.transferred,
            total: progress.total,
            bytesPerSecond: progress.bytesPerSecond,
        })
    }
})


autoUpdater.on('update-downloaded', (info) => {
    console.log('================================')
    console.log('ACTUALIZACIÓN DESCARGADA')
    console.log(`Versión: ${info.version}`)
    console.log('================================')

    if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', {
            version: info.version,
            releaseNotes: info.releaseNotes || '',
        })
    }
})


autoUpdater.on('error', (error) => {
    console.error('ERROR AUTO-UPDATER:', error)

    if (mainWindow) {
        mainWindow.webContents.send('update-error', {
            message: error?.message || 'Error desconocido al actualizar.',
        })
    }
})


/*
|--------------------------------------------------------------------------
| IPC - ACCIONES DEL USUARIO
|--------------------------------------------------------------------------
*/

ipcMain.handle('update-download', async () => {
    console.log('Usuario aceptó descargar la actualización.')

    try {
        await autoUpdater.downloadUpdate()

        return {
            success: true,
        }
    } catch (error) {
        console.error(
            'Error al descargar actualización:',
            error
        )

        return {
            success: false,
            error: error?.message || 'No se pudo descargar la actualización.',
        }
    }
})


ipcMain.handle('update-install', () => {
    console.log('Instalando actualización...')

    autoUpdater.quitAndInstall()

    return {
        success: true,
    }
})


/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
*/

app.whenReady().then(() => {
    createWindow()

    setTimeout(() => {
        if (!process.env.VITE_DEV_SERVER_URL) {
            console.log('Iniciando comprobación de actualizaciones...')

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