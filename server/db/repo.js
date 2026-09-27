// Repository layer. Every exported function is one prepared statement or a
// small transaction. No ORM — plain SQL behind named functions.
import { db } from './index.js'

const stmts = {
  listClients: db.prepare(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM queries q WHERE q.client_id = c.id) AS queries_count,
      (SELECT COUNT(*) FROM runs r
         WHERE r.client_id = c.id
           AND r.ran_at >= datetime('now', '-30 days')
           AND r.error IS NULL) AS runs_30d,
      (SELECT COUNT(*) FROM runs r
         WHERE r.client_id = c.id
           AND r.ran_at >= datetime('now', '-30 days')
           AND r.error IS NULL
           AND r.mentioned = 1) AS mentions_30d
    FROM clients c
    ORDER BY c.hostname
  `),
  getClient: db.prepare(`SELECT * FROM clients WHERE id = ?`),
  getClientByHost: db.prepare(`SELECT * FROM clients WHERE hostname = ?`),
  insertClient: db.prepare(`
    INSERT INTO clients (hostname, url, name, description, brand_aliases, language)
    VALUES (@hostname, @url, @name, @description, @brand_aliases, @language)
  `),
  updateClient: db.prepare(`
    UPDATE clients
    SET name          = COALESCE(@name, name),
        description   = COALESCE(@description, description),
        brand_aliases = COALESCE(@brand_aliases, brand_aliases),
        status        = COALESCE(@status, status)
    WHERE id = @id
  `),
  deleteClient: db.prepare(`DELETE FROM clients WHERE id = ?`),
  touchClientRun: db.prepare(`UPDATE clients SET last_run_at = datetime('now') WHERE id = ?`),

  listActiveQueries: db.prepare(`SELECT * FROM queries WHERE client_id = ? AND active = 1 ORDER BY id`),
  listAllQueries:    db.prepare(`SELECT * FROM queries WHERE client_id = ? ORDER BY id`),
  getQuery:          db.prepare(`SELECT * FROM queries WHERE id = ?`),
  insertQuery:       db.prepare(`INSERT INTO queries (client_id, text) VALUES (?, ?)`),
  updateQuery:       db.prepare(`
    UPDATE queries
    SET text   = COALESCE(@text, text),
        active = COALESCE(@active, active)
    WHERE id = @id
  `),
  deleteQuery:        db.prepare(`DELETE FROM queries WHERE id = ?`),
  deleteAllQueries:   db.prepare(`DELETE FROM queries WHERE client_id = ?`),

  insertRun: db.prepare(`
    INSERT INTO runs
      (client_id, query_id, provider, mentioned, position, snippet, response_full, ms, cost_usd, error)
    VALUES
      (@client_id, @query_id, @provider, @mentioned, @position, @snippet, @response_full, @ms, @cost_usd, @error)
  `),
  getRun: db.prepare(`
    SELECT r.*, q.text AS query_text FROM runs r
    JOIN queries q ON q.id = r.query_id
    WHERE r.id = ?
  `),
  recentRuns: db.prepare(`
    SELECT r.*, q.text AS query_text FROM runs r
    JOIN queries q ON q.id = r.query_id
    WHERE r.client_id = ?
    ORDER BY r.ran_at DESC
    LIMIT ? OFFSET ?
  `),
  countRuns: db.prepare(`SELECT COUNT(*) AS n FROM runs WHERE client_id = ?`),
  statsByProvider: db.prepare(`
    SELECT provider,
           COUNT(*)        AS total,
           SUM(mentioned)  AS mentions,
           SUM(cost_usd)   AS cost,
           MAX(ran_at)     AS last_run
    FROM runs
    WHERE client_id = ?
      AND ran_at >= datetime('now', '-30 days')
      AND error IS NULL
    GROUP BY provider
    ORDER BY provider
  `),
  totalsLast30d: db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(mentioned) AS mentions,
           SUM(cost_usd)  AS cost
    FROM runs
    WHERE client_id = ?
      AND ran_at >= datetime('now', '-30 days')
      AND error IS NULL
  `),
}

// Bulk insert with a transaction — used by generateQueries.
const insertQueriesTx = db.transaction((clientId, texts) => {
  for (const text of texts) stmts.insertQuery.run(clientId, text)
})
const replaceQueriesTx = db.transaction((clientId, texts) => {
  stmts.deleteAllQueries.run(clientId)
  for (const text of texts) stmts.insertQuery.run(clientId, text)
})

// ─── clients ───────────────────────────────────────────────────────
export function listClients() { return stmts.listClients.all() }
export function getClient(id) { return stmts.getClient.get(id) }
export function getClientByHost(host) { return stmts.getClientByHost.get(host) }
export function insertClient(row) {
  const info = stmts.insertClient.run({
    hostname: row.hostname,
    url: row.url,
    name: row.name,
    description: row.description ?? null,
    brand_aliases: row.brand_aliases ?? '[]',
    language: row.language ?? 'de',
  })
  return getClient(info.lastInsertRowid)
}
export function updateClient(id, patch) {
  stmts.updateClient.run({
    id,
    name: patch.name ?? null,
    description: patch.description ?? null,
    brand_aliases: patch.brand_aliases ?? null,
    status: patch.status ?? null,
  })
  return getClient(id)
}
export function deleteClient(id) { return stmts.deleteClient.run(id).changes > 0 }
export function touchClientRun(id) { stmts.touchClientRun.run(id) }

// ─── queries ───────────────────────────────────────────────────────
export function listActiveQueries(clientId) { return stmts.listActiveQueries.all(clientId) }
export function listAllQueries(clientId)    { return stmts.listAllQueries.all(clientId) }
export function getQuery(id)                { return stmts.getQuery.get(id) }
export function insertQuery(clientId, text) {
  const info = stmts.insertQuery.run(clientId, text)
  return getQuery(info.lastInsertRowid)
}
export function insertQueries(clientId, texts) { insertQueriesTx(clientId, texts) }
export function replaceQueries(clientId, texts) {
  replaceQueriesTx(clientId, texts)
  return texts.length
}
export function updateQuery(id, patch) {
  stmts.updateQuery.run({
    id,
    text: patch.text ?? null,
    active: patch.active === undefined ? null : (patch.active ? 1 : 0),
  })
  return getQuery(id)
}
export function deleteQuery(id) { return stmts.deleteQuery.run(id).changes > 0 }

// ─── runs ──────────────────────────────────────────────────────────
export function insertRun(row) {
  const info = stmts.insertRun.run({
    client_id: row.client_id,
    query_id: row.query_id,
    provider: row.provider,
    mentioned: row.mentioned ? 1 : 0,
    position: row.position ?? null,
    snippet: row.snippet ?? null,
    response_full: row.response_full ?? null,
    ms: row.ms ?? 0,
    cost_usd: row.cost_usd ?? 0,
    error: row.error ?? null,
  })
  return info.lastInsertRowid
}
export function getRun(id) { return stmts.getRun.get(id) }
export function recentRuns(clientId, limit = 50, offset = 0) {
  return stmts.recentRuns.all(clientId, limit, offset)
}
export function countRuns(clientId) { return stmts.countRuns.get(clientId).n }
export function statsByProvider(clientId) { return stmts.statsByProvider.all(clientId) }
export function totalsLast30d(clientId)  { return stmts.totalsLast30d.get(clientId) }
