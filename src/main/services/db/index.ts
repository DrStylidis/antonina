import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { createSchema } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    // Try new name first, fall back to old name for migration
    const newDbPath = join(app.getPath('userData'), 'antonina.db')
    const oldDbPath = join(app.getPath('userData'), 'founder-assistant.db')
    const { existsSync, renameSync } = require('fs')
    if (!existsSync(newDbPath) && existsSync(oldDbPath)) {
      renameSync(oldDbPath, newDbPath)
    }
    const dbPath = newDbPath
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    createSchema(db)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
