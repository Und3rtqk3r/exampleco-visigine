// Synchronous SQLite initialization. On startup ensure the data directory
// exists, open the DB, and run schema.sql (idempotent CREATE IF NOT EXISTS).
import Database from 'better-sqlite3'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const defaultPath = resolve(here, '..', 'data', 'examplevisi.db')
const dbPath = process.env.DB_PATH ? resolve(process.env.DB_PATH) : defaultPath

mkdirSync(dirname(dbPath), { recursive: true })

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')   // better concurrent reads
db.pragma('foreign_keys = ON')    // enforce ON DELETE CASCADE

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
db.exec(schema)

console.log(`[db] opened ${dbPath}`)
