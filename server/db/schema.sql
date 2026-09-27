-- Brand we monitor. One row per tracked brand.
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  brand_aliases TEXT NOT NULL DEFAULT '[]',
  language TEXT NOT NULL DEFAULT 'de',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_run_at TEXT
);

-- Search queries that simulate potential customer questions.
-- Each active query is sent to every available provider on every run.
CREATE TABLE IF NOT EXISTS queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per (client, query, provider, ran_at). Stores the full LLM
-- response for review plus the mention detection result.
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  ran_at TEXT NOT NULL DEFAULT (datetime('now')),
  mentioned INTEGER NOT NULL DEFAULT 0 CHECK (mentioned IN (0,1)),
  position INTEGER,
  snippet TEXT,
  response_full TEXT,
  ms INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_client_ran ON runs(client_id, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_query ON runs(query_id);
CREATE INDEX IF NOT EXISTS idx_queries_client ON queries(client_id);
