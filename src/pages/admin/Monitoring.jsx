import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── helpers ────────────────────────────────────────────────────────

function formatRelative(iso) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'))
  const diff = Date.now() - d.getTime()
  if (Number.isNaN(diff)) return iso
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} h`
  const dd = Math.floor(h / 24)
  return `vor ${dd} T`
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })
}

function pct(rate) {
  if (rate == null) return '—'
  return `${Math.round(rate * 100)}%`
}

function aliasesToArray(input) {
  return String(input || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function highlightMentions(text, client) {
  if (!text || !client) return text
  let aliases = []
  if (Array.isArray(client.brand_aliases)) aliases = client.brand_aliases
  else if (typeof client.brand_aliases === 'string') {
    try { aliases = JSON.parse(client.brand_aliases) || [] } catch { /* keep [] */ }
  }
  const tokens = [client.name, client.hostname?.split('.')[0], ...aliases]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s.length >= 3)
    .filter((v, i, a) => a.indexOf(v) === i)
  if (!tokens.length) return text
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  const lowerTokens = new Set(tokens.map((t) => t.toLowerCase()))
  return parts.map((p, i) =>
    lowerTokens.has(p.toLowerCase())
      ? <mark key={i} className="mon-mark">{p}</mark>
      : <span key={i}>{p}</span>
  )
}

// ─── modal shell ────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="mon-modal-backdrop" onClick={onClose}>
      <div
        className={`mon-modal${wide ? ' mon-modal--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mon-modal__head">
          <h3>{title}</h3>
          <button type="button" className="mon-modal__close" onClick={onClose} aria-label="Schließen">×</button>
        </header>
        <div className="mon-modal__body">{children}</div>
      </div>
    </div>
  )
}

// ─── add client modal ──────────────────────────────────────────────

function AddClientModal({ call, onCreated, onClose }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setBusy(true); setError(null)
    try {
      const r = await call('/api/admin/monitoring/clients', { method: 'POST', body: JSON.stringify({ url: url.trim() }) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) setError(data?.error || 'Marke konnte nicht angelegt werden.')
      else onCreated(data)
    } catch (err) {
      if (err.code !== 'AUTH_LOST') setError('Anfrage fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Marke hinzufügen" onClose={onClose}>
      <form className="mon-form" onSubmit={submit}>
        <label className="mon-label">URL der Website</label>
        <input
          type="text"
          className="admin-input"
          placeholder="deine-website.de"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
        <p className="mon-hint">
          Wir analysieren die Seite kurz, um Name, Beschreibung und Sprache zu übernehmen.
          Das kann ein paar Sekunden dauern.
        </p>
        {error && <div className="admin-error admin-error--inline">{error}</div>}
        <div className="mon-form__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={busy}>Abbrechen</button>
          <button type="submit" className="admin-btn" disabled={busy || !url.trim()}>
            {busy ? 'Marke wird analysiert…' : 'Anlegen'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── response modal ────────────────────────────────────────────────

function ResponseModal({ run, client, onClose }) {
  return (
    <Modal title={`Antwort: ${run.provider}`} onClose={onClose} wide>
      <div className="mon-resp">
        <div className="mon-resp__meta">
          <span><strong>Query:</strong> {run.query_text}</span>
          <span><strong>Zeit:</strong> {formatTime(run.ran_at)}</span>
          <span><strong>Treffer:</strong> {run.mentioned ? 'ja' : 'nein'}</span>
          <span><strong>ms:</strong> {run.ms}</span>
          <span><strong>cost:</strong> ${Number(run.cost_usd || 0).toFixed(6)}</span>
          {run.error && <span className="mon-resp__err"><strong>error:</strong> {run.error}</span>}
        </div>
        <div className="mon-resp__body">
          {run.response_full
            ? highlightMentions(run.response_full, client)
            : <em>Keine Antwort verfügbar.</em>}
        </div>
      </div>
    </Modal>
  )
}

// ─── list view ─────────────────────────────────────────────────────

function ClientList({ call, providerModes, onSelect, refreshKey, onRefresh }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [runningId, setRunningId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await call('/api/admin/monitoring/clients')
      const data = await r.json().catch(() => ({}))
      if (!r.ok) setError(data?.error || 'Daten konnten nicht geladen werden.')
      else setClients(data.clients || [])
    } catch (err) {
      if (err.code !== 'AUTH_LOST') setError('Daten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [call])

  useEffect(() => { load() }, [load, refreshKey])

  async function triggerRun(id) {
    setRunningId(id)
    try {
      const r = await call(`/api/admin/monitoring/clients/${id}/run`, { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        alert(data?.error || 'Lauf fehlgeschlagen.')
      } else {
        load()
      }
    } catch (err) {
      if (err.code !== 'AUTH_LOST') alert('Lauf fehlgeschlagen.')
    } finally {
      setRunningId(null)
    }
  }

  const realCount = Object.values(providerModes || {}).filter((m) => m === 'real').length
  const totalCount = Object.keys(providerModes || {}).length

  return (
    <div className="mon-pane">
      <div className="mon-list__head">
        <div>
          <h2 className="mon-h">Marken</h2>
          <p className="mon-sub">
            {totalCount > 0 && (
              <span>Provider aktiv: <strong>{realCount}/{totalCount}</strong>
                {realCount < totalCount && ' — Rest läuft auf Mock-Provider'}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="admin-btn" onClick={() => setAddOpen(true)}>+ Marke hinzufügen</button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Name</th>
              <th>Queries</th>
              <th>Letzter Lauf</th>
              <th>Trefferquote (30T)</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="admin-empty-row">Lädt…</td></tr>
            )}
            {!loading && clients.length === 0 && (
              <tr><td colSpan={7} className="admin-empty-row">Noch keine Marken — oben „+ Marke hinzufügen“ klicken.</td></tr>
            )}
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="admin-cell--mono">{c.hostname}</td>
                <td>{c.name}</td>
                <td>{c.queries_count}</td>
                <td>{formatRelative(c.last_run_at)}</td>
                <td>
                  {c.mention_rate_30d == null
                    ? '—'
                    : <span>{c.mentions_30d}/{c.runs_30d} <em className="mon-rate">({pct(c.mention_rate_30d)})</em></span>}
                </td>
                <td>
                  <span className={`mon-status mon-status--${c.status}`}>{c.status}</span>
                </td>
                <td>
                  <button
                    type="button"
                    className="admin-btn admin-btn--small"
                    disabled={runningId === c.id || c.queries_count === 0 || c.status !== 'active'}
                    onClick={() => triggerRun(c.id)}
                  >
                    {runningId === c.id ? 'läuft…' : 'Lauf'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--small admin-btn--ghost"
                    onClick={() => onSelect(c.id)}
                  >Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <AddClientModal
          call={call}
          onClose={() => setAddOpen(false)}
          onCreated={(c) => { setAddOpen(false); onSelect(c.id); onRefresh?.() }}
        />
      )}
    </div>
  )
}

// ─── detail view ───────────────────────────────────────────────────

function ClientDetail({ call, clientId, onBack, onChange }) {
  const [client, setClient] = useState(null)
  const [queries, setQueries] = useState([])
  const [runs, setRuns] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyAction, setBusyAction] = useState(null) // 'run' | 'generate' | etc.
  const [savingClient, setSavingClient] = useState(false)
  const [responseModalRun, setResponseModalRun] = useState(null)

  // Editable client fields (local copies; saved via PATCH on demand).
  const [nameDraft, setNameDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')
  const [aliasesDraft, setAliasesDraft] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        call(`/api/admin/monitoring/clients/${clientId}`),
        call(`/api/admin/monitoring/clients/${clientId}/queries`),
        call(`/api/admin/monitoring/clients/${clientId}/runs?limit=50`),
        call(`/api/admin/monitoring/clients/${clientId}/stats`),
      ])
      const [j1, j2, j3, j4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()])
      if (!r1.ok) throw new Error(j1?.error || 'Marke nicht gefunden.')
      setClient(j1)
      setQueries(j2.queries || [])
      setRuns(j3.runs || [])
      setStats(j4)
      setNameDraft(j1.name || '')
      setDescDraft(j1.description || '')
      setAliasesDraft((j1.brand_aliases || []).join(', '))
    } catch (err) {
      if (err.code !== 'AUTH_LOST') setError(err.message || 'Fehler beim Laden.')
    } finally {
      setLoading(false)
    }
  }, [call, clientId])

  useEffect(() => { loadAll() }, [loadAll])

  async function saveClient() {
    setSavingClient(true)
    try {
      const r = await call(`/api/admin/monitoring/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: nameDraft.trim(),
          description: descDraft.trim() || null,
          brand_aliases: aliasesToArray(aliasesDraft),
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) alert(data?.error || 'Speichern fehlgeschlagen.')
      else {
        setClient(data)
        onChange?.()
      }
    } catch (err) {
      if (err.code !== 'AUTH_LOST') alert('Speichern fehlgeschlagen.')
    } finally {
      setSavingClient(false)
    }
  }

  async function setStatus(status) {
    try {
      const r = await call(`/api/admin/monitoring/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (r.ok) {
        const data = await r.json()
        setClient(data)
        onChange?.()
      }
    } catch (err) { /* swallow */ }
  }

  async function deleteClient() {
    if (!confirm('Marke wirklich löschen? Alle Queries und Läufe werden mitgelöscht.')) return
    try {
      const r = await call(`/api/admin/monitoring/clients/${clientId}`, { method: 'DELETE' })
      if (r.ok) {
        onChange?.()
        onBack()
      }
    } catch (err) { /* swallow */ }
  }

  async function regenerateQueries() {
    if (!confirm('Alle Queries werden ersetzt. Fortfahren?')) return
    setBusyAction('generate')
    try {
      const r = await call(`/api/admin/monitoring/clients/${clientId}/generate-queries`, { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) alert(data?.error || 'Generierung fehlgeschlagen.')
      else {
        await loadAll()
        if (data.warning) alert(`Hinweis: ${data.warning}`)
      }
    } catch (err) {
      if (err.code !== 'AUTH_LOST') alert('Generierung fehlgeschlagen.')
    } finally {
      setBusyAction(null)
    }
  }

  async function addQuery() {
    const text = prompt('Neue Query:')
    if (!text || !text.trim()) return
    try {
      const r = await call(`/api/admin/monitoring/clients/${clientId}/queries`, {
        method: 'POST', body: JSON.stringify({ text: text.trim() }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) alert(data?.error || 'Hinzufügen fehlgeschlagen.')
      else loadAll()
    } catch (err) { /* swallow */ }
  }

  async function editQuery(q) {
    const text = prompt('Query bearbeiten:', q.text)
    if (text == null || text.trim() === q.text) return
    try {
      const r = await call(`/api/admin/monitoring/queries/${q.id}`, {
        method: 'PATCH', body: JSON.stringify({ text: text.trim() }),
      })
      if (r.ok) loadAll()
    } catch (err) { /* swallow */ }
  }

  async function toggleQuery(q) {
    try {
      const r = await call(`/api/admin/monitoring/queries/${q.id}`, {
        method: 'PATCH', body: JSON.stringify({ active: !q.active }),
      })
      if (r.ok) loadAll()
    } catch (err) { /* swallow */ }
  }

  async function deleteQuery(q) {
    if (!confirm(`Query löschen?\n\n„${q.text}“`)) return
    try {
      const r = await call(`/api/admin/monitoring/queries/${q.id}`, { method: 'DELETE' })
      if (r.ok) loadAll()
    } catch (err) { /* swallow */ }
  }

  async function startRun() {
    setBusyAction('run')
    try {
      const r = await call(`/api/admin/monitoring/clients/${clientId}/run`, { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) alert(data?.error || 'Lauf fehlgeschlagen.')
      else {
        await loadAll()
        onChange?.()
      }
    } catch (err) {
      if (err.code !== 'AUTH_LOST') alert('Lauf fehlgeschlagen.')
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) return <div className="mon-pane"><p>Lädt…</p></div>
  if (error)   return <div className="mon-pane"><div className="admin-error">{error}</div><button className="admin-btn admin-btn--ghost" onClick={onBack}>← Zurück</button></div>
  if (!client) return <div className="mon-pane"><p>Marke nicht gefunden.</p></div>

  const activeQueries = queries.filter((q) => q.active).length
  const totalQueries = queries.length

  return (
    <div className="mon-pane">
      <div className="mon-detail__head">
        <button type="button" className="admin-btn admin-btn--ghost admin-btn--small" onClick={onBack}>← Zurück</button>
        <h2 className="mon-h">{client.hostname} <span className="mon-sub">— {client.name}</span></h2>
        <span className={`mon-status mon-status--${client.status}`}>{client.status}</span>
        <div className="mon-detail__actions">
          {client.status === 'active' && (
            <button type="button" className="admin-btn admin-btn--small admin-btn--ghost" onClick={() => setStatus('paused')}>Pausieren</button>
          )}
          {client.status === 'paused' && (
            <button type="button" className="admin-btn admin-btn--small" onClick={() => setStatus('active')}>Aktivieren</button>
          )}
          <button type="button" className="admin-btn admin-btn--small admin-btn--ghost" onClick={deleteClient}>Löschen</button>
        </div>
      </div>

      <section className="mon-section">
        <h3 className="mon-section__title">Stammdaten</h3>
        <div className="mon-field"><label>Name</label>
          <input type="text" className="admin-input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
        </div>
        <div className="mon-field"><label>Beschreibung</label>
          <textarea className="admin-input mon-textarea" value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={3} />
        </div>
        <div className="mon-field"><label>Aliase (kommagetrennt)</label>
          <input type="text" className="admin-input" placeholder="ExampleCo, Exampleco, ..." value={aliasesDraft} onChange={(e) => setAliasesDraft(e.target.value)} />
        </div>
        <div className="mon-field__actions">
          <button type="button" className="admin-btn" disabled={savingClient} onClick={saveClient}>
            {savingClient ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </section>

      <section className="mon-section">
        <div className="mon-section__head">
          <h3 className="mon-section__title">Queries ({activeQueries} aktiv / {totalQueries})</h3>
          <div className="mon-section__actions">
            <button type="button" className="admin-btn admin-btn--small admin-btn--ghost" onClick={addQuery}>+ Hinzufügen</button>
            <button type="button" className="admin-btn admin-btn--small" disabled={busyAction === 'generate'} onClick={regenerateQueries}>
              {busyAction === 'generate' ? 'Generiert…' : 'Per LLM neu generieren'}
            </button>
          </div>
        </div>
        {queries.length === 0
          ? <p className="admin-empty">Noch keine Queries. „Per LLM neu generieren“ klicken oder manuell hinzufügen.</p>
          : (
            <ul className="mon-queries">
              {queries.map((q) => (
                <li key={q.id} className="mon-query">
                  <input type="checkbox" checked={q.active === 1} onChange={() => toggleQuery(q)} title="Aktiv?" />
                  <span className={`mon-query__text${q.active ? '' : ' mon-query__text--inactive'}`}>{q.text}</span>
                  <button type="button" className="admin-btn admin-btn--small admin-btn--ghost" onClick={() => editQuery(q)}>Bearbeiten</button>
                  <button type="button" className="admin-btn admin-btn--small admin-btn--ghost" onClick={() => deleteQuery(q)}>×</button>
                </li>
              ))}
            </ul>
          )}
        <div className="mon-section__cta">
          <button type="button" className="admin-btn" disabled={busyAction === 'run' || activeQueries === 0 || client.status !== 'active'} onClick={startRun}>
            {busyAction === 'run' ? 'Lauf läuft…' : 'Monitoring-Lauf starten'}
          </button>
        </div>
      </section>

      <section className="mon-section">
        <h3 className="mon-section__title">Letzte 30 Tage</h3>
        {stats?.byProvider?.length
          ? (
            <table className="admin-table mon-table--compact">
              <thead>
                <tr><th>Provider</th><th>Treffer</th><th>Quote</th><th>Cost</th><th>Letzter Lauf</th></tr>
              </thead>
              <tbody>
                {stats.byProvider.map((p) => (
                  <tr key={p.provider}>
                    <td className="admin-cell--mono">{p.provider}</td>
                    <td>{p.mentions}/{p.total}</td>
                    <td>{pct(p.mention_rate)}</td>
                    <td>${p.cost.toFixed(6)}</td>
                    <td>{formatRelative(p.last_run)}</td>
                  </tr>
                ))}
                <tr className="mon-table__total">
                  <td><strong>Gesamt</strong></td>
                  <td><strong>{stats.totalMentions30d}/{stats.totalRuns30d}</strong></td>
                  <td><strong>{pct(stats.mentionRate30d)}</strong></td>
                  <td><strong>${stats.totalCost30d.toFixed(6)}</strong></td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          )
          : <p className="admin-empty">Noch keine Läufe in den letzten 30 Tagen.</p>}
      </section>

      <section className="mon-section">
        <h3 className="mon-section__title">Run-Verlauf ({runs.length})</h3>
        {runs.length === 0
          ? <p className="admin-empty">Noch keine Läufe.</p>
          : (
            <div className="admin-table-wrap">
              <table className="admin-table mon-table--compact">
                <thead>
                  <tr><th>Zeit</th><th>Query</th><th>Provider</th><th>Treffer</th><th>ms</th><th>Cost</th><th>Aktion</th></tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className={r.error ? 'admin-row--err' : ''}>
                      <td>{formatTime(r.ran_at)}</td>
                      <td className="mon-cell--ellipsis" title={r.query_text}>{r.query_text}</td>
                      <td className="admin-cell--mono">{r.provider}</td>
                      <td>{r.mentioned ? '✓' : '✗'}{r.error ? ` (${r.error})` : ''}</td>
                      <td>{r.ms}</td>
                      <td>${Number(r.cost_usd || 0).toFixed(6)}</td>
                      <td><button type="button" className="admin-btn admin-btn--small admin-btn--ghost" onClick={() => setResponseModalRun(r)}>Antwort ansehen</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {responseModalRun && (
        <ResponseModal
          run={responseModalRun}
          client={client}
          onClose={() => setResponseModalRun(null)}
        />
      )}
    </div>
  )
}

// ─── tab root ──────────────────────────────────────────────────────

export default function MonitoringTab({ call }) {
  const [providerModes, setProviderModes] = useState({})
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Pull provider modes once so the list can show "real vs mock" coverage.
  useEffect(() => {
    let cancelled = false
    call('/api/admin/monitoring/clients')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setProviderModes(data?.providerModes || {}) })
      .catch(() => { /* swallow */ })
    return () => { cancelled = true }
  }, [call])

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  if (selectedClientId) {
    return (
      <ClientDetail
        call={call}
        clientId={selectedClientId}
        onBack={() => { setSelectedClientId(null); bumpRefresh() }}
        onChange={bumpRefresh}
      />
    )
  }
  return (
    <ClientList
      call={call}
      providerModes={providerModes}
      refreshKey={refreshKey}
      onSelect={setSelectedClientId}
      onRefresh={bumpRefresh}
    />
  )
}
