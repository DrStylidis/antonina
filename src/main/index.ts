import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { registerAllHandlers } from './ipc'
import { loadConfig } from './services/config'
import { startScheduler, stopScheduler } from './services/scheduler'
import { closeDb } from './services/db'
import { shutdown as shutdownMCP } from './services/agent/mcp-client'
import { createTray, destroyTray } from './services/tray'
import { initApiKey } from './ipc/settings'

// Disable GPU acceleration for VM/headless environments
app.disableHardwareAcceleration()

// Load .env manually (avoids dotenv dependency issues with Electron)
try {
  // In packaged app: .env is in Resources via extraResources
  // In dev: .env is at project root (../../ relative to out/main/)
  const envPaths = [
    join(process.resourcesPath || '', '.env'),
    join(__dirname, '../../.env')
  ]
  const envPath = envPaths.find(p => existsSync(p))
  if (envPath) {
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  }
} catch {
  // Silently ignore .env loading errors
}

let mainWindow: BrowserWindow | null = null

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

function getWindowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState {
  try {
    const data = readFileSync(getWindowStatePath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return { width: 1400, height: 900 }
  }
}

function saveWindowState(win: BrowserWindow): void {
  const isMaximized = win.isMaximized()
  const bounds = win.getBounds()
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized
  }
  try {
    mkdirSync(join(app.getPath('userData')), { recursive: true })
    writeFileSync(getWindowStatePath(), JSON.stringify(state))
  } catch {
    // Silently ignore write errors
  }
}

function createWindow(): void {
  const windowState = loadWindowState()

  mainWindow = new BrowserWindow({
    ...(windowState.x !== undefined && windowState.y !== undefined
      ? { x: windowState.x, y: windowState.y }
      : {}),
    width: windowState.width,
    height: windowState.height,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    vibrancy: 'sidebar',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Save window state on resize/move
  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.on('browser-window-created', (_, window) => {
    // Prevent new window navigation
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  })

  // Load config (creates default if missing)
  loadConfig()

  registerAllHandlers()

  // Load API key from DB (persisted across restarts)
  initApiKey()

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
        ]
      }
    })
  })

  createWindow()

  // Create menu bar tray
  createTray()

  // Start background scheduler after window is ready
  startScheduler()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopScheduler()
  destroyTray()
  shutdownMCP().catch(() => {})
  closeDb()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
