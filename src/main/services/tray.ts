import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { getPendingApprovals } from './db/agent'

let tray: Tray | null = null

type TrayState = 'idle' | 'working' | 'attention'

export function createTray(): void {
  // Create a simple 16x16 template image programmatically
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAABl0RVh0U29mdHdhcmUAZ25vbWUtc2NyZWVuc2hvdO8Dvz4AAABPSURBVDiNY2AYBaNgFIwCigFjUhUwMjIy/P//n0EYl0ImJiYGBgYGBmFiNOMCTMgcYjUTBUbBKBgFVAIMDAwMjIyMDMI4FTAxMTEwMDAAAC3pCj3cmfFkAAAAAElFTkSuQmCC',
      'base64'
    )
  )
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Antonina')

  updateTrayMenu()

  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const win = windows[0]
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

export function updateTrayState(state: TrayState): void {
  if (!tray) return

  const titles: Record<TrayState, string> = {
    idle: 'Antonina',
    working: 'Antonina (working...)',
    attention: 'Antonina (needs attention)'
  }

  tray.setToolTip(titles[state])
  updateTrayMenu()
}

function updateTrayMenu(): void {
  if (!tray) return

  const pending = getPendingApprovals()

  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: `Antonina${pending.length > 0 ? ` (${pending.length} pending)` : ''}`,
      enabled: false
    },
    { type: 'separator' }
  ]

  // Show up to 3 pending approvals
  if (pending.length > 0) {
    pending.slice(0, 3).forEach(item => {
      menuItems.push({
        label: item.title.substring(0, 50),
        click: () => {
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].show()
            windows[0].focus()
          }
        }
      })
    })
    menuItems.push({ type: 'separator' })
  }

  menuItems.push(
    {
      label: 'Open Antonina',
      click: () => {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].show()
          windows[0].focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  )

  tray.setContextMenu(Menu.buildFromTemplate(menuItems))
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
