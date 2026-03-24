import { useState, useCallback, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS & DATA
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400&family=Fragment+Mono:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap";

const C = {
  bg:         "#F5F3EE",
  bgDeep:     "#EDEAE2",
  surface:    "#FFFFFF",
  surfaceAlt: "#F9F8F5",
  border:     "#D9D5CB",
  borderMid:  "#C4BFB3",
  ink:        "#1C1A17",
  inkMid:     "#5C5850",
  inkDim:     "#9C9890",
  // Primary Accent (Warm Orange)
  green:      "#D35400", 
  greenLight: "#FDEBD0",
  greenMid:   "#E67E22",
  greenDim:   "#A04000",
  // Semantic
  red:        "#C0392B",
  redLight:   "#FBEAE8",
  amber:      "#B7650A",
  amberLight: "#FDF3E3",
  blue:       "#1A5276",
  blueLight:  "#EAF2FB",
  teal:       "#0E6655",
};

const G_X = "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";
const G_Y = "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8";
const CURVES = ["secp256k1", "p256", "p384"];
const GROUPS = ["modp2048", "modp3072", "modp4096"];

const OPS = {
  field: [
    { id:"element", label:"Create Element", desc:"Validate & normalise a value into GF(p)",
      method:"POST", path:"/api/field/element",
      fields:[
        {key:"prime",label:"Prime p",placeholder:"223",hint:"decimal or 0x hex"},
        {key:"value",label:"Value a",placeholder:"192",hint:"reduced mod p"},
      ]},
    { id:"add", label:"Add", desc:"a + b mod p", method:"POST", path:"/api/field/add",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"sub", label:"Subtract", desc:"a − b mod p", method:"POST", path:"/api/field/sub",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"mul", label:"Multiply", desc:"a × b mod p", method:"POST", path:"/api/field/mul",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"div", label:"Divide", desc:"a × b⁻¹ mod p", method:"POST", path:"/api/field/div",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"Numerator a",placeholder:"192"},{key:"b",label:"Divisor b",placeholder:"105"}]},
    { id:"pow", label:"Power", desc:"base ^ exp mod p", method:"POST", path:"/api/field/pow",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"base",label:"Base",placeholder:"192"},{key:"exp",label:"Exponent",placeholder:"3",hint:"negative → inverse"}]},
    { id:"inverse", label:"Inverse", desc:"Multiplicative inverse a⁻¹ in GF(p)", method:"POST", path:"/api/field/inverse",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
    { id:"neg", label:"Negate", desc:"Additive inverse p − a mod p", method:"POST", path:"/api/field/neg",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
  ],
  ecc: [
    { id:"curves",     label:"List Curves",      desc:"All available named curves",
      method:"GET", path:"/api/ecc/curves", fields:[]},
    { id:"curve_info", label:"Curve Info",        desc:"Parameters for a specific curve",
      method:"GET", path:"/api/ecc/curves/:name",
      fields:[{key:"name",label:"Curve",type:"select",options:CURVES}]},
    { id:"generator",  label:"Generator Point G", desc:"Base point G coordinates",
      method:"GET", path:"/api/ecc/curves/:name/generator",
      fields:[{key:"name",label:"Curve",type:"select",options:CURVES}]},
    { id:"validate",   label:"Validate Point",    desc:"Check whether (x, y) lies on the curve",
      method:"POST", path:"/api/ecc/point/validate",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:CURVES},
        {key:"x",label:"x coordinate",placeholder:G_X,default:G_X,hint:"pre-filled: G·x"},
        {key:"y",label:"y coordinate",placeholder:G_Y,default:G_Y},
      ]},
    { id:"point_add",  label:"Point Addition",    desc:"P₁ + P₂ on the curve",
      method:"POST", path:"/api/ecc/point/add",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:CURVES},
        {key:"x1",label:"P₁ x",placeholder:G_X,default:G_X,hint:"G + G = 2G"},
        {key:"y1",label:"P₁ y",placeholder:G_Y,default:G_Y},
        {key:"x2",label:"P₂ x",placeholder:G_X,default:G_X},
        {key:"y2",label:"P₂ y",placeholder:G_Y,default:G_Y},
      ]},
    { id:"scalar_mul", label:"Scalar Multiply",   desc:"k × P — leave P blank for G",
      method:"POST", path:"/api/ecc/scalar_mul",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:CURVES},
        {key:"k",label:"Scalar k",placeholder:"2",default:"2",hint:"decimal or 0x hex"},
        {key:"x",label:"P x (optional)",placeholder:"leave blank to use G"},
        {key:"y",label:"P y (optional)",placeholder:"leave blank to use G"},
      ]},
  ],
  utils: [
    { id:"is_prime",      label:"Is Prime?",      desc:"Miller-Rabin primality test",
      method:"POST", path:"/api/utils/is_prime",
      fields:[{key:"n",label:"n",placeholder:"0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F",hint:"decimal or 0x hex"}]},
    { id:"next_prime",    label:"Next Prime",     desc:"Smallest prime ≥ n",
      method:"POST", path:"/api/utils/next_prime",
      fields:[{key:"n",label:"n",placeholder:"100"}]},
    { id:"generate_prime",label:"Generate Prime", desc:"Random prime of exactly n bits",
      method:"POST", path:"/api/utils/generate_prime",
      fields:[{key:"bits",label:"Bit length",placeholder:"256",hint:"2 – 4096"}]},
    { id:"mod_inverse",   label:"Modular Inverse",desc:"Inverse of a (mod m)",
      method:"POST", path:"/api/utils/mod_inverse",
      fields:[{key:"a",label:"a",placeholder:"3"},{key:"m",label:"Modulus m",placeholder:"11"}]},
    { id:"xgcd",          label:"Extended GCD",   desc:"gcd(a, b) = a·x + b·y",
      method:"POST", path:"/api/utils/xgcd",
      fields:[{key:"a",label:"a",placeholder:"35"},{key:"b",label:"b",placeholder:"15"}]},
  ],
  dhke: [
    { id:"keypair",       label:"Generate Key Pair",   desc:"Fresh DHKE key pair over RFC 3526 MODP group",
      method:"POST", path:"/api/crypto/dhke/keypair",
      note:"Run this twice — once for each party. Keep private_key.x secret, share public_key.y.",
      fields:[{key:"group",label:"Group",type:"select",options:GROUPS,default:"modp2048"}]},
    { id:"shared_secret", label:"Shared Secret",       desc:"g^(xy) mod p — both parties compute the same value",
      method:"POST", path:"/api/crypto/dhke/shared_secret",
      note:"Paste your private key fields and the peer's public_key.y.",
      fields:[
        {key:"private_group",label:"Group",type:"select",options:GROUPS,default:"modp2048"},
        {key:"private_x",    label:"Your private_key.x",  placeholder:"(from /keypair)"},
        {key:"private_p",    label:"Your private_key.p",  placeholder:"(from /keypair)"},
        {key:"private_g",    label:"Your private_key.g",  placeholder:"2",default:"2"},
        {key:"peer_y",       label:"Peer's public_key.y", placeholder:"(from peer's /keypair)"},
      ]},
    { id:"derive_key",    label:"Derive Key",           desc:"SHA-256 KDF → symmetric key bytes",
      method:"POST", path:"/api/crypto/dhke/derive_key",
      note:"Both parties run this with the same shared secret to get an identical AES key.",
      fields:[
        {key:"secret",       label:"Shared secret",     placeholder:"(decimal from /shared_secret)"},
        {key:"secret_group", label:"Group",              type:"select",options:GROUPS,default:"modp2048"},
        {key:"length",       label:"Key length (bytes)", placeholder:"32",default:"32",hint:"1 – 64"},
      ]},
  ],
};

const SECTIONS = {
  field: { label:"Prime Field",    sub:"𝔽ₚ",     icon:"𝔽" },
  ecc:   { label:"Elliptic Curves",sub:"ECC",    icon:"𝔼" },
  utils: { label:"Number Theory",  sub:"ℕ",      icon:"∂" },
  dhke:  { label:"Diffie-Hellman", sub:"DHKE",   icon:"⇄" },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const buildInputs = fields =>
  Object.fromEntries(fields.map(f => [f.key, f.type === "select" ? (f.default ?? f.options[0]) : (f.default ?? "")]));

const resolveUrl = (base, op, inputs) => {
  const path = op.path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(inputs[k] ?? ""));
  return base.replace(/\/$/, "") + path;
};

const buildBody = (op, inputs) => {
  if (op.method === "GET") return null;
  const raw = {};
  op.fields.forEach(f => { const v = (inputs[f.key] ?? "").trim(); if (v) raw[f.key] = v; });
  return JSON.stringify(raw);
};

const parseApiError = json =>
  Array.isArray(json.detail)
    ? json.detail.map(e => `${e.loc?.slice(1).join(".")} — ${e.msg}`).join("\n")
    : (json.detail ?? JSON.stringify(json));

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MethodPill({ method }) {
  const isGet = method === "GET";
  return (
    <span style={{
      fontFamily:"'Fragment Mono',monospace", fontSize:"0.6rem",
      fontWeight:400, letterSpacing:"0.08em",
      padding:"0.2rem 0.5rem", borderRadius:"0.2rem",
      background: isGet ? C.greenLight : C.amberLight,
      color:       isGet ? C.green     : C.amber,
      border:      `1px solid ${isGet ? C.greenMid + "60" : C.amber + "40"}`,
      whiteSpace:  "nowrap",
    }}>
      {method}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{
      display:"inline-block", width:"0.875rem", height:"0.875rem",
      border:`1.5px solid ${C.borderMid}`, borderTopColor:C.green,
      borderRadius:"50%", animation:"spin 0.7s linear infinite",
      verticalAlign:"middle",
    }}/>
  );
}

function JsonTree({ data, depth = 0 }) {
  if (data === null)             return <em style={{color:C.inkDim}}>null</em>;
  if (typeof data === "boolean") return <strong style={{color:data ? C.green : C.red}}>{String(data)}</strong>;
  if (typeof data === "number")  return <span style={{color:C.amber}}>{data}</span>;

  if (typeof data === "string") {
    const isHex = data.startsWith("0x");
    const isBig = /^\d{10,}$/.test(data);
    if (isHex || isBig) {
      const color = isHex ? C.teal : C.amber;
      if (data.length > 48) {
        return (
          <div style={{
            display:"block", width:"100%", boxSizing:"border-box",
            wordBreak:"break-all", overflowWrap:"anywhere",
            fontFamily:"'Fragment Mono',monospace",
            fontSize:"0.72rem", lineHeight:1.65, color,
            background:C.bgDeep, border:`1px solid ${C.border}`,
            borderLeft:`3px solid ${color}`,
            borderRadius:"0 0.3rem 0.3rem 0",
            padding:"0.4rem 0.625rem",
            marginTop:"0.25rem", marginBottom:"0.125rem",
          }}>{data}</div>
        );
      }
      return <span style={{color, fontFamily:"'Fragment Mono',monospace"}}>{data}</span>;
    }
    return <span style={{color:C.green, fontFamily:"'Fragment Mono',monospace"}}>"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (!data.length) return <span style={{color:C.inkDim}}>[ ]</span>;
    return (
      <div>
        {data.map((v, i) => (
          <div key={i} style={{paddingLeft: depth > 0 ? "1.25rem" : 0}}>
            <span style={{color:C.inkDim, userSelect:"none"}}>— </span>
            <JsonTree data={v} depth={depth+1}/>
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    return (
      <div style={{paddingLeft: depth > 0 ? "1rem" : 0}}>
        {Object.entries(data).map(([k, v]) => (
          <div key={k} style={{marginBottom:"0.2rem"}}>
            <span style={{
              fontFamily:"'Fragment Mono',monospace", fontSize:"0.72rem",
              fontWeight:400, color:C.green, fontStyle:"italic",
            }}>{k}</span>
            <span style={{color:C.inkDim, margin:"0 0.25rem"}}>:</span>
            <JsonTree data={v} depth={depth+1}/>
          </div>
        ))}
      </div>
    );
  }

  return <span style={{fontFamily:"'Fragment Mono',monospace", color:C.ink}}>{String(data)}</span>;
}

function FieldInput({ field, value, onChange }) {
  return (
    <div>
      <label>{field.label}</label>
      {field.type === "select"
        ? <select value={value} onChange={e => onChange(field.key, e.target.value)}>
            {field.options.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input value={value} placeholder={field.placeholder}
            onChange={e => onChange(field.key, e.target.value)}
            spellCheck={false} autoComplete="off"
          />
      }
      {field.hint && <p className="hint">{field.hint}</p>}
    </div>
  );
}

function Sidebar({ section, opId, onSection, onOp }) {
  return (
    <nav className="sidebar">
      {Object.entries(SECTIONS).map(([id, meta]) => {
        const active = section === id;
        return (
          <div key={id} className="nav-group">
            <button
              className={`nav-section ${active ? "active" : ""}`}
              onClick={() => onSection(id)}>
              <span className="nav-icon">{meta.icon}</span>
              <span className="nav-text">
                <span className="nav-label">{meta.label}</span>
                <span className="nav-sub">{meta.sub}</span>
              </span>
            </button>
            {active && (
              <div className="nav-ops">
                {OPS[id].map(op => (
                  <button key={op.id}
                    className={`nav-op ${opId === op.id ? "active" : ""}`}
                    onClick={() => onOp(op.id)}>
                    {op.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function OutputPanel({ result, error, loading, op, ref: resultRef }) {
  const hasContent = loading || error || result !== null;
  return (
    <div className="output-card">
      <div className="output-header">
        <span className={`output-dot ${error ? "error" : result ? "ok" : ""}`}/>
        <span className="output-label">
          {loading ? "Computing…" : error ? "Error" : result !== null ? "Result" : "Output"}
        </span>
        {result && !error && (
          <span className="output-meta">{op.method} {op.path}</span>
        )}
      </div>
      <div className="output-body" ref={resultRef}>
        {loading && (
          <div className="output-empty">
            <Spinner/>
            <span style={{marginLeft:"0.5rem", color:C.inkMid}}>Running request…</span>
          </div>
        )}
        {!loading && error && (
          <pre className="error-text">{error}</pre>
        )}
        {!loading && !error && result !== null && (
          <JsonTree data={result}/>
        )}
        {!loading && !error && result === null && (
          <div className="output-empty">
            <div className="output-glyph">∅</div>
            <p>Run a request to see the result</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function GaloisExplorer() {
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
      const res  = await fetch(resolveUrl(baseUrl, op, inputs), {
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

  useEffect(() => {
    const h = e => { if ((e.ctrlKey||e.metaKey) && e.key==="Enter") call(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [call]);

  return (
    <>
      <style>{`
        @import url('${FONTS}');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { font-size:16px; }
        html, body, #root {
          min-height:100dvh;
          width: 100%;           /* Force full width */
          max-width: none;       /* Strip Vite's 1280px limit */
          margin: 0;             /* Remove centering margins */
          padding: 0;
          background:${C.bg};
          color:${C.ink};
          scrollbar-gutter:stable;
        }
        body {
          font-family:'DM Sans', sans-serif;
          line-height:1.55;
          -webkit-font-smoothing:antialiased;
          overflow-x:hidden;
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width:0.3rem; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.borderMid}; border-radius:99rem; }

        /* ── Form elements ── */
        label {
          display:block;
          font-family:'DM Sans', sans-serif;
          font-size:0.6875rem; font-weight:600;
          letter-spacing:0.07em; text-transform:uppercase;
          color:${C.inkMid}; margin-bottom:0.35rem;
        }
        input, select {
          width:100%; display:block;
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem;
          background:${C.surface}; color:${C.ink};
          border:1.5px solid ${C.border};
          border-radius:0.375rem;
          padding:0.55rem 0.75rem;
          outline:none; appearance:none;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        input:focus, select:focus {
          border-color:${C.green};
          box-shadow:0 0 0 3px ${C.greenLight};
        }
        input::placeholder { color:${C.inkDim}; font-style:italic; }
        select {
          cursor:pointer;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23${C.inkDim.slice(1)}' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat:no-repeat;
          background-position:right 0.75rem center;
          padding-right:2.25rem;
        }
        .hint {
          font-family:'Fragment Mono', monospace;
          font-size:0.65rem; color:${C.inkDim};
          margin-top:0.3rem; font-style:italic;
        }
        button { cursor:pointer; border:none; background:none; }

        /* ── Layout ── */
        .app-shell {
          display:grid;
          grid-template-rows:3.5rem 1fr;
          grid-template-columns:1fr;
          min-height:100dvh;
        }
        .topbar {
          grid-row:1;
          background:${C.surface};
          border-bottom:1px solid ${C.border};
          display:flex; align-items:center;
          padding:0 1.5rem; gap:1rem;
          position:sticky; top:0; z-index:100;
        }
        
        .body-grid {
          grid-row:2;
          display:grid;
          grid-template-columns: auto 1fr; /* Let the sidebar dictate the width */
          align-items:start;
        }

        /* ── Sidebar ── */
        .sidebar {
          grid-column:1;
          width: 13.5rem; /* Add this explicit width */
          background:${C.surface};
          border-right:1px solid ${C.border};
          padding:1.25rem 0.875rem;
          position:sticky; top:3.5rem;
          height:calc(100dvh - 3.5rem);
          overflow-y:auto;
          display:flex; flex-direction:column; gap:0.125rem;
        }
        .nav-group { margin-bottom:0.25rem; }
        .nav-section {
          width:100%; text-align:left;
          display:flex; align-items:center; gap:0.625rem;
          padding:0.5rem 0.625rem; border-radius:0.5rem;
          transition:background 0.12s;
          font-family:'DM Sans', sans-serif;
        }
        .nav-section:hover { background:${C.bgDeep}; }
        .nav-section.active { background:${C.greenLight}; }
        .nav-icon {
          font-size:1rem; width:1.5rem; text-align:center;
          color:${C.inkMid}; flex-shrink:0;
        }
        .nav-section.active .nav-icon { color:${C.green}; }
        .nav-text { display:flex; flex-direction:column; gap:0.0625rem; }
        .nav-label {
          font-size:0.8125rem; font-weight:600;
          color:${C.ink}; line-height:1.2;
        }
        .nav-section.active .nav-label { color:${C.greenDim}; }
        .nav-sub {
          font-family:'Fragment Mono', monospace;
          font-size:0.6rem; color:${C.inkDim};
        }
        .nav-ops { padding:0.25rem 0 0.25rem 2.125rem; display:flex; flex-direction:column; gap:0.0625rem; }
        .nav-op {
          width:100%; text-align:left;
          font-family:'DM Sans', sans-serif;
          font-size:0.78rem; font-weight:400; color:${C.inkMid};
          padding:0.3125rem 0.5rem; border-radius:0.3rem;
          transition:all 0.1s; position:relative;
        }
        .nav-op:hover { color:${C.ink}; background:${C.bgDeep}; }
        .nav-op.active {
          color:${C.green}; font-weight:500;
          background:${C.greenLight};
        }
        .nav-op.active::before {
          content:""; position:absolute; left:0; top:20%; bottom:20%;
          width:2px; background:${C.green}; border-radius:99px;
        }

        /* ── Main content ── */
        .main {
          grid-column:2;
          padding:2.25rem 2.5rem 4rem;
          min-width:0;
        }

        /* ── Op header ── */
        .op-header {
          margin-bottom:1.75rem;
          padding-bottom:1.5rem;
          border-bottom:1px solid ${C.border};
        }
        .op-tag-row {
          display:flex; align-items:center; gap:0.5rem;
          margin-bottom:0.75rem;
          min-width:0; /* Allows shrinking */
        }
        .op-path {
          font-family:'Fragment Mono', monospace;
          font-size:0.75rem; color:${C.inkMid};
          background:${C.bgDeep};
          border:1px solid ${C.border};
          padding:0.2rem 0.625rem; border-radius:0.25rem;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;
        }
        .op-title {
          font-family:'Fraunces', serif;
          font-weight:600; font-size:2rem;
          letter-spacing:-0.02em; color:${C.ink};
          margin-bottom:0.375rem; line-height:1.15;
        }
        .op-desc {
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem; color:${C.inkMid};
        }

        /* ── Note banner ── */
        .note-banner {
          background:${C.blueLight};
          border:1px solid ${C.blue}30;
          border-left:3px solid ${C.blue};
          border-radius:0 0.5rem 0.5rem 0;
          padding:0.625rem 0.875rem;
          font-family:'Fragment Mono', monospace;
          font-size:0.75rem; color:${C.blue};
          margin-bottom:1.25rem; line-height:1.6;
        }

        /* ── Form card ── */
        .form-card {
          background:${C.surface};
          border:1px solid ${C.border};
          border-radius:0.625rem;
          padding:1.375rem;
          margin-bottom:1.25rem;
          box-shadow:0 1px 3px rgba(0,0,0,0.04);
        }
        .form-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(14rem, 1fr));
          gap:1rem;
          margin-bottom:1.25rem;
        }
        .run-row { display:flex; align-items:center; gap:0.875rem; }
        .run-btn {
          height:2.25rem; padding:0 1.375rem;
          background:${C.green}; color:#fff;
          font-family:'DM Sans', sans-serif;
          font-weight:600; font-size:0.875rem;
          border-radius:0.4rem;
          display:flex; align-items:center; gap:0.5rem;
          transition:background 0.15s, box-shadow 0.15s;
          box-shadow:0 1px 4px ${C.green}40;
        }
        .run-btn:hover { background:${C.greenDim}; }
        .run-btn:disabled { background:${C.greenMid}; box-shadow:none; cursor:not-allowed; }
        .shortcut {
          font-family:'Fragment Mono', monospace;
          font-size:0.7rem; color:${C.inkDim};
        }

        /* ── Output card ── */
        .output-card {
          background:${C.surface}; border:1px solid ${C.border};
          border-radius:0.625rem; margin-bottom:1.25rem;
          overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04);
          display:flex; flex-direction:column; height:30rem;
          min-width:0; /* Forces grid boundary compliance */
        }
        .output-header {
          padding:0.625rem 1rem; background:${C.bgDeep};
          border-bottom:1px solid ${C.border};
          display:flex; align-items:center; gap:0.5rem;
          flex-shrink:0; min-width:0; 
        }
        .output-dot {
          width:0.5rem; height:0.5rem; border-radius:50%; flex-shrink:0;
          background:${C.borderMid}; transition:background 0.2s;
        }
        .output-dot.ok    { background:${C.green}; box-shadow:0 0 0.375rem ${C.green}80; }
        .output-dot.error { background:${C.red};   box-shadow:0 0 0.375rem ${C.red}80; }
        .output-label {
          font-family:'DM Sans', sans-serif;
          font-size:0.7rem; font-weight:600;
          letter-spacing:0.07em; text-transform:uppercase; color:${C.inkMid};
        }
        .output-meta {
          margin-left:auto;
          font-family:'Fragment Mono', monospace;
          font-size:0.65rem; color:${C.inkDim};
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;
        }
        .output-body {
          flex:1; min-height:0;
          overflow-y:auto; overflow-x:hidden;
          padding:1.125rem 1.25rem;
          font-family:'Fragment Mono', monospace;
          font-size:0.78rem; line-height:1.85;
        }
        .output-empty {
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          height:100%; gap:0.75rem;
          color:${C.inkDim}; font-family:'DM Sans', sans-serif;
          font-size:0.875rem;
        }
        .output-glyph {
          font-family:'Fraunces', serif;
          font-size:2.5rem; color:${C.border};
          line-height:1;
        }
        .error-text {
          font-family:'Fragment Mono', monospace;
          font-size:0.75rem; color:${C.red};
          white-space:pre-wrap; margin:0; line-height:1.7;
        }

        /* ── History ── */
        .history-card {
          background:${C.surface};
          border:1px solid ${C.border};
          border-radius:0.625rem; overflow:hidden;
          box-shadow:0 1px 3px rgba(0,0,0,0.04);
        }
        .history-head {
          padding:0.5rem 1rem;
          background:${C.bgDeep};
          border-bottom:1px solid ${C.border};
          font-family:'DM Sans', sans-serif;
          font-size:0.6875rem; font-weight:600;
          letter-spacing:0.07em; text-transform:uppercase; color:${C.inkDim};
        }
        .history-row {
          display:flex; align-items:center; gap:0.625rem;
          padding:0.625rem 1rem; cursor:pointer;
          transition:background 0.1s;
          border-bottom:1px solid ${C.border};
        }
        .history-row:last-child { border-bottom:none; }
        .history-row:hover { background:${C.bgDeep}; }
        .history-name {
          font-family:'DM Sans', sans-serif;
          font-size:0.8125rem; font-weight:500; color:${C.ink}; flex:1;
        }
        .history-time {
          font-family:'Fragment Mono', monospace;
          font-size:0.675rem; color:${C.inkDim};
        }

        /* ── Topbar ── */
        .wordmark {
          font-family:'Fraunces', serif;
          font-size:1.125rem; font-weight:600;
          color:${C.ink}; letter-spacing:-0.02em;
          display:flex; align-items:baseline; gap:0.25rem;
          white-space:nowrap;
        }
        .wordmark-sub {
          font-family:'Fragment Mono', monospace;
          font-size:0.6rem; font-weight:400;
          color:${C.green}; letter-spacing:0.05em;
          border:1px solid ${C.greenMid};
          padding:0.1rem 0.35rem; border-radius:0.2rem;
          margin-left:0.25rem;
        }
        .url-pill {
          flex:1; max-width:22rem; min-width:0; /* Added min-width:0 to allow shrinking */
          height:2rem;
          background:${C.bgDeep}; border:1px solid ${C.border};
          border-radius:0.375rem;
          display:flex; align-items:center; gap:0.5rem;
          padding:0 0.75rem; cursor:text;
        }
        .url-dot {
          width:0.375rem; height:0.375rem; border-radius:50%;
          background:${C.green}; flex-shrink:0;
          box-shadow:0 0 0.25rem ${C.green};
        }
        .url-text {
          font-family:'Fragment Mono', monospace;
          font-size:0.72rem; color:${C.inkMid};
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .docs-link {
          margin-left:auto;
          font-family:'Fragment Mono', monospace;
          font-size:0.72rem; color:${C.inkMid};
          text-decoration:none; padding:0.25rem 0.625rem;
          border:1px solid ${C.border}; border-radius:0.3rem;
          transition:border-color 0.15s, color 0.15s;
          white-space:nowrap;
        }
        .docs-link:hover { color:${C.ink}; border-color:${C.borderMid}; }

        /* ── Mobile bottom tabs ── */
        .mobile-tabs { display:none; }

        /* ── Animations ── */
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(0.4rem); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation:fadeUp 0.2s ease both; }

        /* ── Responsive ── */
        @media (max-width:56rem) {
          .sidebar   { width: 4.5rem; padding:1rem 0.5rem; } /* Update width here */
          .nav-icon  { width:100%; font-size:1.125rem; }
          .nav-text, .nav-ops { display:none; }
          .nav-section { justify-content:center; }
          .main      { padding:1.5rem 1.75rem 3rem; }
        }
        @media (max-width:37.5rem) {
          .body-grid { grid-template-columns:1fr; }
          .sidebar   { display:none; }
          .mobile-tabs {
            display:flex; position:fixed;
            bottom:0; left:0; right:0;
            background:${C.surface}; border-top:1px solid ${C.border};
            z-index:200; height:3.5rem;
          }
          .mobile-tab {
            flex:1; display:flex; flex-direction:column;
            align-items:center; justify-content:center; gap:0.125rem;
            font-family:'DM Sans', sans-serif;
            font-size:0.5rem; font-weight:600;
            letter-spacing:0.04em; text-transform:uppercase;
            color:${C.inkDim}; cursor:pointer;
            border-top:2px solid transparent;
            transition:all 0.15s;
          }
          .mobile-tab.active { color:${C.green}; border-top-color:${C.green}; background:${C.greenLight}; }
          .mobile-tab-icon   { font-size:1.25rem; }
          .main  { padding:1.25rem 1rem 5rem; }
          .docs-link { display:none; }
          .form-grid { grid-template-columns:1fr; }
          .output-card { height:22rem; }
          .op-title  { font-size:1.5rem; }
        }
      `}</style>

      <div className="app-shell">
        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="wordmark">
            𝔾 explorer
            <span className="wordmark-sub">API</span>
          </div>

          {editingUrl
            ? <input autoFocus defaultValue={baseUrl}
                style={{flex:1,maxWidth:"22rem",height:"2rem",fontSize:"0.75rem",padding:"0 0.75rem"}}
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
        <div className="body-grid">
          <div className="sidebar">
            <Sidebar section={section} opId={opId} onSection={setSection} onOp={setOpId}/>
          </div>

          <main className="main">
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
                : <p className="hint" style={{marginBottom:"1rem"}}>No parameters — just send the request.</p>
              }
              <div className="run-row">
                <button className="run-btn" onClick={call} disabled={loading}>
                  {loading ? <><Spinner/> Running…</> : "Run"}
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
    </>
  );
}