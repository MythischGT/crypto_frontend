import { useState, useCallback, useRef, useEffect } from "react";
import "./theme.css";
import { OPS, SECTIONS } from "./data";
import { buildInputs, resolveUrl, buildBody, parseApiError, fetchWithTimeout, debounce } from "./utils";
import { MethodPill, Spinner, JsonTree, FieldInput, Sidebar } from "./components";

export default function App() {
  const [baseUrl,    setBaseUrl]    = useState(import.meta?.env?.VITE_API_URL ?? "http://localhost:8000");
  const [editingUrl, setEditingUrl] = useState(false);
  const [section,    setSection]    = useState("field");
  const [opId,       setOpId]       = useState("element");
  const [inputs,     setInputs]     = useState({});
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [history,    setHistory]    = useState([]);
  const resultRef = useRef(null);

  const ops = OPS[section];
  const op  = ops.find(o => o.id === opId) ?? ops[0];

  useEffect(() => {
    setInputs(buildInputs(op?.fields ?? []));
    setResult(null); setError(null);
  }, [opId, section]);

  useEffect(() => { setOpId(OPS[section][0].id); }, [section]);

  const call = useCallback(async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      // Utilizing our new fetch wrapper with a 10-second timeout
      const res = await fetchWithTimeout(resolveUrl(baseUrl, op, inputs), {
        method:  op.method,
        headers: op.method !== "GET" ? {"Content-Type":"application/json"} : {},
        body:    buildBody(op, inputs),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(parseApiError(json));
      
      setResult(json);
      setHistory(h => [{label:op.label,method:op.method,result:json,ts:new Date().toLocaleTimeString()},...h.slice(0,7)]);
      setTimeout(() => resultRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}), 60);
    } catch(e) {
      setError(e.message.includes("fetch")
        ? `Cannot reach ${baseUrl}\n\nStart the server:\nuvicorn main:app --reload`
        : e.message);
    } finally { setLoading(false); }
  }, [baseUrl, op, inputs]);

  const handleChange = useCallback((key, val) => setInputs(p => ({...p,[key]:val})), []);

  // Using our new debounce utility to prevent keyboard spamming
  useEffect(() => {
    const handleShortcut = debounce((e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") call();
    }, 250);

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [call]);

  return (
    <div className="app-shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="wordmark">
          𝔾 explorer
          <span className="wordmark-sub">API</span>
        </div>

        {editingUrl
          ? <input autoFocus defaultValue={baseUrl}
              style={{flex:1,maxWidth:"24rem",height:"2.25rem",fontSize:"0.8rem",padding:"0 0.85rem"}}
              onBlur={e  => {setBaseUrl(e.target.value.replace(/\/$/,"")); setEditingUrl(false);}}
              onKeyDown={e => {if(e.key==="Enter"){setBaseUrl(e.target.value.replace(/\/$/,"")); setEditingUrl(false);}}}
            />
          : <div className="url-pill" onClick={() => setEditingUrl(true)} title="Click to edit">
              <span className="url-dot"/>
              <span className="url-text">{baseUrl}</span>
            </div>
        }

        <a className="docs-link" href={`${baseUrl}/docs`} target="_blank" rel="noreferrer">
          /docs ↗
        </a>
      </header>

      {/* ── Body ── */}
      <div className="layout-body">
        <aside className="sidebar">
          <Sidebar section={section} opId={opId} onSection={setSection} onOp={setOpId}/>
        </aside>

        <main className="main-content">
          {/* Mobile Operations Nav */}
          <div className="mobile-ops-menu">
            {ops.map(o => (
              <button 
                key={o.id} 
                className={`mobile-op-pill ${opId === o.id ? "active" : ""}`} 
                onClick={() => setOpId(o.id)}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Op header */}
          <div className="op-header">
            <div className="op-tag-row">
              <MethodPill method={op.method}/>
              <code className="op-path">{op.path}</code>
            </div>
            <h1 className="op-title">{op.label}</h1>
            <p className="op-desc">{op.desc}</p>
          </div>

          {op.note && <div className="note-banner">{op.note}</div>}

          {/* Form */}
          <div className="form-card">
            {op.fields.length > 0
              ? <div className="form-grid">
                  {op.fields.map(f => (
                    <FieldInput key={f.key} field={f} value={inputs[f.key]??""} onChange={handleChange}/>
                  ))}
                </div>
              : <p className="hint" style={{marginBottom:"1.25rem"}}>No parameters — just send the request.</p>
            }
            <div className="run-row">
              <button className="run-btn" onClick={call} disabled={loading}>
                {loading ? <><Spinner/> Running…</> : "Run Request"}
              </button>
              <span className="shortcut">⌃ Enter</span>
            </div>
          </div>

          {/* Output */}
          <div className={`output-card ${result || error ? "fade-up" : ""}`}>
            <div className="output-header">
              <span className={`output-dot ${error?"error":result?"ok":""}`}/>
              <span className="output-label">
                {loading?"Computing…":error?"Error":result?"Result":"Output"}
              </span>
              {result && !error && <span className="output-meta">{op.method} {op.path}</span>}
            </div>
            <div className="output-body" ref={resultRef}>
              {loading && (
                <div className="output-empty">
                  <Spinner/><span style={{marginLeft:"0.5rem"}}>Running…</span>
                </div>
              )}
              {!loading && error && <pre className="error-text">{error}</pre>}
              {!loading && !error && result !== null && <JsonTree data={result}/>}
              {!loading && !error && result === null && (
                <div className="output-empty">
                  <div className="output-glyph">∅</div>
                  <p>Run a request to see the result</p>
                </div>
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="history-card">
              <div className="history-head">History</div>
              {history.map((h,i) => (
                <div key={i} className="history-row" onClick={() => setResult(h.result)}>
                  <MethodPill method={h.method}/>
                  <span className="history-name">{h.label}</span>
                  <span className="history-time">{h.ts}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile bottom tabs ── */}
      <nav className="mobile-tabs">
        {Object.entries(SECTIONS).map(([id,meta]) => (
          <button key={id} className={`mobile-tab ${section===id?"active":""}`}
            onClick={() => {setSection(id); setOpId(OPS[id][0].id);}}>
            <span className="mobile-tab-icon">{meta.icon}</span>
            {meta.label}
          </button>
        ))}
      </nav>
    </div>
  );
}