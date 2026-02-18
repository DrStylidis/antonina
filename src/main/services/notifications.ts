import { Notification } from 'electron'

export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}
