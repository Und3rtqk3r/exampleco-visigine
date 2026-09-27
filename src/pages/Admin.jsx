import { useCallback, useEffect, useRef, useState } from 'react'
import MonitoringTab from './admin/Monitoring.jsx'
import './Admin.css'

const TOKEN_KEY = 'examplevisi_admin_token'

// ─── helpers ────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return '–'
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function severityRowClass(passed, severity) {
  if (passed) return ''
  if (severity === 'high') return 'admin-row--fail-high'
  if (severity === 'medium') return 'admin-row--fail-medium'
  return 'admin-row--fail-low'
}

function groupOf(id) {
  if (!id) return '–'
  const dot = id.indexOf('.')
  return dot > 0 ? id.slice(0, dot) : id
}

// ─── sub-components ─────────────────────────────────────────────────────

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="admin-section">
      <button type="button" className="admin-section__toggle" onClick={() => setOpen((v) => !v)}>
        <span className="admin-section__caret">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="admin-section__body">{children}</div>}
    </div>
  )
}

function ChecksTable({ checks }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table--sticky">
        <thead>
          <tr>
            <th>Group</th>
            <th>ID</th>
            <th>Severity</th>
            <th>Pass</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.id} className={severityRowClass(c.passed, c.severity)}>
              <td className="admin-cell--mono">{groupOf(c.id)}</td>
              <td className="admin-cell--mono">{c.id}</td>
              <td className="admin-cell--mono">{c.severity}</td>
              <td>{c.passed ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FetchesTable({ fetches }) {
  const rows = Object.entries(fetches || {})
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Status</th>
            <th>Final URL</th>
            <th>Body Length</th>
            <th>Time (ms)</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, f]) => (
            <tr key={key}>
              <td className="admin-cell--mono">{key}</td>
              <td>{f?.status ?? '–'}</td>
              <td className="admin-cell--mono admin-cell--ellipsis">{f?.finalUrl || '–'}</td>
              <td>{f?.bodyLength ?? '–'}</td>
              <td>{f?.ms ?? '–'}</td>
              <td className="admin-cell--mono">{f?.error || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AutofixInlineTabs({ data }) {
  const [tab, setTab] = useState('llms')
  const payload =
    tab === 'llms' ? data?.llmsTxt :
    tab === 'robots' ? data?.robotsTxt :
    data?.jsonLd
  const filename = tab === 'jsonld' ? 'jsonld.html' : tab === 'robots' ? 'robots.txt' : 'llms.txt'
  return (
    <>
      <div className="admin-autofix__tabs">
        <button type="button" className={`admin-tab${tab === 'llms' ? ' admin-tab--active' : ''}`} onClick={() => setTab('llms')}>llms.txt</button>
        <button type="button" className={`admin-tab${tab === 'robots' ? ' admin-tab--active' : ''}`} onClick={() => setTab('robots')}>robots.txt</button>
        <button type="button" className={`admin-tab${tab === 'jsonld' ? ' admin-tab--active' : ''}`} onClick={() => setTab('jsonld')}>JSON-LD</button>
        <span className="admin-autofix__hint">{filename} · mode: {payload?.mode}</span>
      </div>
      <pre className="admin-code">{payload?.content || ''}</pre>
    </>
  )
}

function ScoreBlock({ score, summary }) {
  return (
    <div className="admin-score">
      <div className="admin-score__num">{score ?? '–'}<span>/10</span></div>
      <p className="admin-score__summary">{summary || ''}</p>
    </div>
  )
}

function StatsCards({ stats }) {
  return (
    <div className="admin-stats">
      <div className="admin-card">
        <div className="admin-card__label">Total Analyses</div>
        <div className="admin-card__value">{stats?.total ?? 0}</div>
      </div>
      <div className="admin-card">
        <div className="admin-card__label">Successful</div>
        <div className="admin-card__value">{stats?.succeeded ?? 0}</div>
      </div>
      <div className="admin-card">
        <div className="admin-card__label">Avg Score</div>
        <div className="admin-card__value">{stats?.avgScore ?? '–'}</div>
      </div>
    </div>
  )
}

// ─── API hook ───────────────────────────────────────────────────────────

function useAdminApi(token, onAuthLost) {
  return useCallback(
    async (path, init = {}) => {
      const headers = { ...(init.headers || {}), 'X-Admin-Token': token || '' }
      if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
      const r = await fetch(path, { ...init, headers })
      if (r.status === 401) {
        onAuthLost('Sitzung abgelaufen. Bitte erneut anmelden.')
        const e = new Error('AUTH_LOST'); e.code = 'AUTH_LOST'
        throw e
      }
      return r
    },
    [token, onAuthLost]
  )
}

// ─── analyse tab ────────────────────────────────────────────────────────

function AnalyseTab({ call, inputUrl, setInputUrl, autoRunKey }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [bypassCache, setBypassCache] = useState(true)

  const runAnalyze = useCallback(async () => {
    const url = inputUrl.trim()
    if (!url) return
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await call('/api/admin/analyze', {
        method: 'POST',
        body: JSON.stringify({ url, bypassCache }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) setError(data?.error || 'Analyse fehlgeschlagen.')
      else setResult(data)
    } catch (err) {
      if (err.code !== 'AUTH_LOST') setError('Analyse fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }, [call, inputUrl, bypassCache])

  // Re-Run trigger: parent bumps autoRunKey when a row's Re-Run is clicked.
  const lastAutoKey = useRef(autoRunKey)
  useEffect(() => {
    if (autoRunKey && autoRunKey !== lastAutoKey.current) {
      lastAutoKey.current = autoRunKey
      runAnalyze()
    }
  }, [autoRunKey, runAnalyze])

  return (
    <div className="admin-pane">
      <form
        className="admin-form"
        onSubmit={(e) => { e.preventDefault(); runAnalyze() }}
      >
        <input
          type="text"
          className="admin-input"
          placeholder="https://example.de"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <button type="submit" className="admin-btn" disabled={loading}>
          {loading ? 'Analysiere…' : 'Analysieren'}
        </button>
        <label className="admin-checkbox" title="Aus: Cache verwenden falls vorhanden. An: immer frisch analysieren.">
          <input
            type="checkbox"
            checked={bypassCache}
            onChange={(e) => setBypassCache(e.target.checked)}
          /> Cache umgehen
        </label>
      </form>

      {error && <div className="admin-error">{error}</div>}

      {result && (
        <>
          <ScoreBlock score={result.score} summary={result.summary} />

          <Section title={`Alle Checks (${result._debug?.checks?.length ?? 0})`} defaultOpen>
            <ChecksTable checks={result._debug?.checks || []} />
          </Section>

          <Section title="Diagnostics" defaultOpen={false}>
            <FetchesTable fetches={result._debug?.fetches} />
          </Section>

          <Section title="Extracted Site Data" defaultOpen={false}>
            <pre className="admin-code">{JSON.stringify(result._debug?.siteData ?? null, null, 2)}</pre>
          </Section>

          <Section title="Auto-Fix Output" defaultOpen={false}>
            <AutofixInlineTabs data={result.autofix} />
          </Section>

          <Section title="Timing" defaultOpen={false}>
            <ul className="admin-list">
              <li>Total: {result._debug?.totalMs ?? '–'} ms</li>
              <li>Cache: {result._debug?.cacheHit ? 'HIT' : 'MISS'}</li>
              <li>Requested URL: <span className="admin-cell--mono">{result._debug?.requestedUrl}</span></li>
              <li>Final URL: <span className="admin-cell--mono">{result._debug?.finalUrl}</span></li>
            </ul>
          </Section>
        </>
      )}
    </div>
  )
}

// ─── aktivität tab ──────────────────────────────────────────────────────

function AktivitatTab({ call, onRerun, active }) {
  const [recent, setRecent] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        call('/api/admin/recent'),
        call('/api/admin/stats'),
      ])
      const [j1, j2] = await Promise.all([r1.json(), r2.json()])
      setRecent(j1.analyses || [])
      setStats(j2)
      setError(null)
    } catch (err) {
      if (err.code !== 'AUTH_LOST') setError('Daten konnten nicht geladen werden.')
    }
  }, [call])

  useEffect(() => {
    if (!active) return undefined
    fetchData()
    const id = setInterval(fetchData, 10000)
    return () => clearInterval(id)
  }, [active, fetchData])

  return (
    <div className="admin-pane">
      <StatsCards stats={stats} />
      {error && <div className="admin-error">{error}</div>}

      <Section title="Top Failed Checks" defaultOpen>
        {!stats?.topFails?.length
          ? <p className="admin-empty">Noch keine Daten.</p>
          : (
            <ul className="admin-list">
              {stats.topFails.map((f) => (
                <li key={f.id}><span className="admin-cell--mono">{f.id}</span> — {f.count}×</li>
              ))}
            </ul>
          )}
      </Section>

      <Section title="Top Hosts" defaultOpen>
        {!stats?.topHosts?.length
          ? <p className="admin-empty">Noch keine Daten.</p>
          : (
            <ul className="admin-list">
              {stats.topHosts.map((h) => (
                <li key={h.host}><span className="admin-cell--mono">{h.host}</span> — {h.count}×</li>
              ))}
            </ul>
          )}
      </Section>

      <Section title={`Recent Analyses (${recent.length})`} defaultOpen>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Zeit</th><th>Host</th><th>Score</th><th>Issues</th>
                <th>Status</th><th>ms</th><th>Cache</th><th>Admin</th><th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={9} className="admin-empty-row">Noch keine Anfragen aufgezeichnet.</td></tr>
              )}
              {recent.map((e) => (
                <tr key={e.requestId} className={e.status === 'err' ? 'admin-row--err' : ''}>
                  <td>{formatTime(e.ts)}</td>
                  <td className="admin-cell--mono">{e.host || '–'}</td>
                  <td>{e.score ?? '–'}</td>
                  <td>{e.issuesCount ?? '–'}</td>
                  <td>{e.status}{e.code ? ` (${e.code})` : ''}</td>
                  <td>{e.ms}</td>
                  <td>{e.cacheHit ? 'HIT' : 'MISS'}</td>
                  <td>{e.admin ? 'yes' : 'no'}</td>
                  <td>
                    {e.host
                      ? <button type="button" className="admin-btn admin-btn--small" onClick={() => onRerun(e.host)}>Re-Run</button>
                      : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// ─── login form ─────────────────────────────────────────────────────────

function LoginForm({ initialError, onLogin }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(initialError || null)

  async function handleSubmit(e) {
    e.preventDefault()
    const token = value.trim()
    if (!token) { setError('Token fehlt.'); return }
    // Probe with the token to validate it before saving.
    try {
      const r = await fetch('/api/admin/stats', { headers: { 'X-Admin-Token': token } })
      if (r.status === 401) {
        setError('Falsches Token.')
        return
      }
      onLogin(token)
    } catch {
      setError('Server nicht erreichbar.')
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__box">
        <h1 className="admin-login__title">EXAMPLEVISI Admin</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="admin-input"
            placeholder="Token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button type="submit" className="admin-btn admin-btn--full">Login</button>
          {error && <p className="admin-error admin-error--inline">{error}</p>}
        </form>
      </div>
    </div>
  )
}

// ─── root ───────────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
  })
  const [loginError, setLoginError] = useState(null)
  const [tab, setTab] = useState('analyse')
  const [inputUrl, setInputUrl] = useState('')
  const [autoRunKey, setAutoRunKey] = useState(0)

  // Detect storage being cleared in another tab or by DevTools.
  useEffect(() => {
    function onStorage(ev) {
      if (ev.key === TOKEN_KEY && !ev.newValue) {
        setToken('')
        setLoginError('Sitzung abgelaufen. Bitte erneut anmelden.')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleAuthLost = useCallback((msg) => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
    setToken('')
    setLoginError(msg || 'Sitzung abgelaufen. Bitte erneut anmelden.')
  }, [])

  const call = useAdminApi(token, handleAuthLost)

  function handleLogin(t) {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* noop */ }
    setToken(t)
    setLoginError(null)
  }

  function handleLogout() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
    setToken('')
    setLoginError(null)
  }

  // Re-run from Aktivität: set URL, switch to Analyse, bump trigger.
  function handleRerun(host) {
    setInputUrl(host)
    setTab('analyse')
    setAutoRunKey((k) => k + 1)
  }

  if (!token) {
    return <LoginForm initialError={loginError} onLogin={handleLogin} />
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__title">EXAMPLEVISI Admin</div>
        <div className="admin-header__tabs">
          <button
            type="button"
            className={`admin-tab${tab === 'analyse' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('analyse')}
          >Analyse</button>
          <button
            type="button"
            className={`admin-tab${tab === 'monitoring' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('monitoring')}
          >Monitoring</button>
          <button
            type="button"
            className={`admin-tab${tab === 'aktivitat' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('aktivitat')}
          >Aktivität</button>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={handleLogout}>Logout</button>
      </header>

      <main className="admin-main">
        {tab === 'analyse' && (
          <AnalyseTab
            call={call}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            autoRunKey={autoRunKey}
          />
        )}
        {tab === 'monitoring' && (
          <MonitoringTab call={call} />
        )}
        {tab === 'aktivitat' && (
          <AktivitatTab
            call={call}
            onRerun={handleRerun}
            active={tab === 'aktivitat'}
          />
        )}
      </main>
    </div>
  )
}
