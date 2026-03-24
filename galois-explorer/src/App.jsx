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
    { id:"curve_info", label:"Curve Info",       desc:"Parameters for a specific curve",
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
        {key:"secret_group", label:"Group",             type:"select",options:GROUPS,default:"modp2048"},
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
      fontWeight:600, letterSpacing:"0.08em",
      padding:"0.25rem 0.6rem", borderRadius:"0.3rem",
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
            borderRadius:"0 0.4rem 0.4rem 0",
            padding:"0.5rem 0.75rem",
            marginTop:"0.3rem", marginBottom:"0.2rem",
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
    <div className="field-container">
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
        html { font-size:16px; background:${C.bg}; }
        body {
          font-family:'DM Sans', sans-serif;
          line-height:1.6;
          -webkit-font-smoothing:antialiased;
          color:${C.ink};
          margin: 0; padding: 0;
          overflow-x:hidden;
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width:0.4rem; height:0.4rem; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.borderMid}; border-radius:99rem; }
        ::-webkit-scrollbar-thumb:hover { background:${C.inkDim}; }

        /* ── Form elements ── */
        .field-container { display: flex; flex-direction: column; }
        label {
          display:block;
          font-size:0.7rem; font-weight:600;
          letter-spacing:0.05em; text-transform:uppercase;
          color:${C.inkMid}; margin-bottom:0.4rem;
        }
        input, select {
          width:100%; display:block;
          font-family:'Fragment Mono', monospace;
          font-size:0.85rem;
          background:${C.surfaceAlt}; color:${C.ink};
          border:1px solid ${C.border};
          border-radius:0.4rem;
          padding:0.6rem 0.85rem;
          outline:none; appearance:none;
          transition:all 0.2s ease;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }
        input:focus, select:focus {
          background:${C.surface};
          border-color:${C.green};
          box-shadow: 0 0 0 3px ${C.greenLight}, inset 0 1px 2px rgba(0,0,0,0.01);
        }
        input::placeholder { color:${C.inkDim}; font-style:italic; }
        select {
          cursor:pointer;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23${C.inkDim.slice(1)}' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat:no-repeat;
          background-position:right 0.85rem center;
          padding-right:2.5rem;
        }
        .hint {
          font-family:'Fragment Mono', monospace;
          font-size:0.68rem; color:${C.inkDim};
          margin-top:0.4rem; font-style:italic;
        }
        button { cursor:pointer; border:none; background:none; transition: all 0.2s; }

        /* ── Layout ── */
        .app-wrapper {
          width: 100%;
          min-height: 100dvh;
          background:${C.bg};
          display: flex;
          justify-content: center;
        }
        .app-shell {
          width: 100%;
          max-width: 90rem; /* Modern containment for ultrawide */
          background:${C.bg};
          display:grid;
          grid-template-rows:3.5rem 1fr;
          grid-template-columns:1fr;
          box-shadow: 0 0 40px rgba(0,0,0,0.02);
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
          grid-template-columns: 14.5rem 1fr; 
          align-items:start;
        }

        /* ── Sidebar ── */
        .sidebar {
          grid-column:1;
          background:${C.surface};
          border-right:1px solid ${C.border};
          padding:1.5rem 1rem;
          position:sticky; top:3.5rem;
          height:calc(100dvh - 3.5rem);
          overflow-y:auto;
          display:flex; flex-direction:column; gap:0.5rem;
        }
        .nav-group { margin-bottom:0.5rem; }
        .nav-section {
          width:100%; text-align:left;
          display:flex; align-items:center; gap:0.75rem;
          padding:0.6rem 0.75rem; border-radius:0.5rem;
          font-family:'DM Sans', sans-serif;
        }
        .nav-section:hover { background:${C.bgDeep}; }
        .nav-section.active { background:${C.surfaceAlt}; border: 1px solid ${C.border}; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .nav-icon {
          font-size:1.1rem; width:1.5rem; text-align:center;
          color:${C.inkMid}; flex-shrink:0;
        }
        .nav-section.active .nav-icon { color:${C.green}; }
        .nav-text { display:flex; flex-direction:column; gap:0.1rem; }
        .nav-label {
          font-size:0.85rem; font-weight:600;
          color:${C.ink}; line-height:1.2;
        }
        .nav-section.active .nav-label { color:${C.greenDim}; }
        .nav-sub {
          font-family:'Fragment Mono', monospace;
          font-size:0.65rem; color:${C.inkDim};
        }
        .nav-ops { padding:0.5rem 0 0.5rem 2.25rem; display:flex; flex-direction:column; gap:0.15rem; }
        .nav-op {
          width:100%; text-align:left;
          font-family:'DM Sans', sans-serif;
          font-size:0.8rem; font-weight:500; color:${C.inkMid};
          padding:0.4rem 0.6rem; border-radius:0.4rem;
          position:relative;
        }
        .nav-op:hover { color:${C.ink}; background:${C.bgDeep}; }
        .nav-op.active {
          color:${C.green}; font-weight:600;
          background:${C.greenLight};
        }
        .nav-op.active::before {
          content:""; position:absolute; left:0; top:25%; bottom:25%;
          width:3px; background:${C.green}; border-radius:99px;
        }

        /* ── Main content ── */
        .main {
          grid-column:2;
          padding:2.5rem 3rem 4rem;
          min-width:0;
        }

        /* ── Mobile Ops Menu (Hidden on Desktop) ── */
        .mobile-ops-menu { display: none; }

        /* ── Op header ── */
        .op-header {
          margin-bottom:2rem;
        }
        .op-tag-row {
          display:flex; align-items:center; gap:0.75rem;
          margin-bottom:1rem;
          min-width:0;
        }
        .op-path {
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem; color:${C.inkMid};
          background:${C.surfaceAlt};
          border:1px solid ${C.border};
          padding:0.25rem 0.75rem; border-radius:0.3rem;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;
        }
        .op-title {
          font-family:'Fraunces', serif;
          font-weight:600; font-size:2.25rem;
          letter-spacing:-0.02em; color:${C.ink};
          margin-bottom:0.5rem; line-height:1.2;
        }
        .op-desc {
          font-family:'Fragment Mono', monospace;
          font-size:0.9rem; color:${C.inkMid};
        }

        /* ── Note banner ── */
        .note-banner {
          background:${C.blueLight};
          border:1px solid ${C.blue}30;
          border-left:4px solid ${C.blue};
          border-radius:0.5rem;
          padding:0.8rem 1rem;
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem; color:${C.blue};
          margin-bottom:1.5rem; line-height:1.6;
        }

        /* ── Form card ── */
        .form-card {
          background:${C.surface};
          border:1px solid ${C.border};
          border-radius:0.75rem;
          padding:1.5rem;
          margin-bottom:1.5rem;
          box-shadow:0 4px 12px rgba(0,0,0,0.03);
        }
        .form-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(15rem, 1fr));
          gap:1.25rem;
          margin-bottom:1.5rem;
        }
        .run-row { display:flex; align-items:center; gap:1rem; }
        .run-btn {
          height:2.5rem; padding:0 1.5rem;
          background:${C.green}; color:#fff;
          font-family:'DM Sans', sans-serif;
          font-weight:600; font-size:0.9rem;
          border-radius:0.5rem;
          display:flex; align-items:center; gap:0.5rem;
          box-shadow:0 2px 8px ${C.green}40;
        }
        .run-btn:hover:not(:disabled) { background:${C.greenDim}; transform: translateY(-1px); box-shadow:0 4px 12px ${C.green}50; }
        .run-btn:active:not(:disabled) { transform: translateY(0); }
        .run-btn:disabled { background:${C.greenMid}; opacity: 0.7; box-shadow:none; cursor:not-allowed; }
        .shortcut {
          font-family:'Fragment Mono', monospace;
          font-size:0.75rem; color:${C.inkDim};
        }

        /* ── Output card ── */
        .output-card {
          background:${C.surface}; border:1px solid ${C.border};
          border-radius:0.75rem; margin-bottom:1.5rem;
          overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.03);
          display:flex; flex-direction:column; height:32rem;
          min-width:0;
        }
        .output-header {
          padding:0.75rem 1.25rem; background:${C.surfaceAlt};
          border-bottom:1px solid ${C.border};
          display:flex; align-items:center; gap:0.6rem;
          flex-shrink:0; min-width:0; 
        }
        .output-dot {
          width:0.6rem; height:0.6rem; border-radius:50%; flex-shrink:0;
          background:${C.borderMid}; transition:background 0.3s ease;
        }
        .output-dot.ok    { background:${C.green}; box-shadow:0 0 0.4rem ${C.green}60; }
        .output-dot.error { background:${C.red};   box-shadow:0 0 0.4rem ${C.red}60; }
        .output-label {
          font-family:'DM Sans', sans-serif;
          font-size:0.75rem; font-weight:600;
          letter-spacing:0.08em; text-transform:uppercase; color:${C.inkMid};
        }
        .output-meta {
          margin-left:auto;
          font-family:'Fragment Mono', monospace;
          font-size:0.7rem; color:${C.inkDim};
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;
        }
        .output-body {
          flex:1; min-height:0;
          overflow-y:auto; overflow-x:hidden;
          padding:1.25rem 1.5rem;
          font-family:'Fragment Mono', monospace;
          font-size:0.85rem; line-height:1.8;
        }
        .output-empty {
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          height:100%; gap:1rem;
          color:${C.inkDim}; font-family:'DM Sans', sans-serif;
          font-size:0.95rem;
        }
        .output-glyph {
          font-family:'Fraunces', serif;
          font-size:3rem; color:${C.border};
          line-height:1;
        }
        .error-text {
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem; color:${C.red};
          white-space:pre-wrap; margin:0; line-height:1.7;
        }

        /* ── History ── */
        .history-card {
          background:${C.surface};
          border:1px solid ${C.border};
          border-radius:0.75rem; overflow:hidden;
          box-shadow:0 4px 12px rgba(0,0,0,0.03);
        }
        .history-head {
          padding:0.75rem 1.25rem;
          background:${C.surfaceAlt};
          border-bottom:1px solid ${C.border};
          font-family:'DM Sans', sans-serif;
          font-size:0.75rem; font-weight:600;
          letter-spacing:0.08em; text-transform:uppercase; color:${C.inkDim};
        }
        .history-row {
          display:flex; align-items:center; gap:0.75rem;
          padding:0.75rem 1.25rem; cursor:pointer;
          transition:background 0.2s;
          border-bottom:1px solid ${C.border};
        }
        .history-row:last-child { border-bottom:none; }
        .history-row:hover { background:${C.surfaceAlt}; }
        .history-name {
          font-family:'DM Sans', sans-serif;
          font-size:0.85rem; font-weight:500; color:${C.ink}; flex:1;
        }
        .history-time {
          font-family:'Fragment Mono', monospace;
          font-size:0.7rem; color:${C.inkDim};
        }

        /* ── Topbar ── */
        .wordmark {
          font-family:'Fraunces', serif;
          font-size:1.25rem; font-weight:600;
          color:${C.ink}; letter-spacing:-0.02em;
          display:flex; align-items:baseline; gap:0.25rem;
          white-space:nowrap;
        }
        .wordmark-sub {
          font-family:'Fragment Mono', monospace;
          font-size:0.65rem; font-weight:600;
          color:${C.green}; letter-spacing:0.05em;
          border:1px solid ${C.greenMid};
          padding:0.15rem 0.4rem; border-radius:0.25rem;
          margin-left:0.3rem; text-transform:uppercase;
        }
        .url-pill {
          flex:1; max-width:24rem; min-width:0; 
          height:2.25rem;
          background:${C.surfaceAlt}; border:1px solid ${C.border};
          border-radius:0.4rem;
          display:flex; align-items:center; gap:0.6rem;
          padding:0 0.85rem; cursor:text;
          transition: border-color 0.2s;
        }
        .url-pill:hover { border-color: ${C.borderMid}; }
        .url-dot {
          width:0.4rem; height:0.4rem; border-radius:50%;
          background:${C.green}; flex-shrink:0;
          box-shadow:0 0 0.3rem ${C.green};
        }
        .url-text {
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem; color:${C.inkMid};
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .docs-link {
          margin-left:auto;
          font-family:'Fragment Mono', monospace;
          font-size:0.8rem; font-weight: 500; color:${C.inkMid};
          text-decoration:none; padding:0.4rem 0.75rem;
          border:1px solid ${C.border}; border-radius:0.4rem;
          transition:all 0.2s;
          white-space:nowrap;
        }
        .docs-link:hover { color:${C.ink}; border-color:${C.borderMid}; background:${C.surfaceAlt}; }

        /* ── Mobile bottom tabs ── */
        .mobile-tabs { display:none; }

        /* ── Animations ── */
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(0.5rem); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation:fadeUp 0.3s ease-out both; }

        /* ── Responsive breakpoints ── */
        @media (max-width:64rem) {
          .body-grid { grid-template-columns:5rem 1fr; }
          .sidebar   { padding:1.5rem 0.5rem; }
          .nav-icon  { width:100%; font-size:1.25rem; }
          .nav-text, .nav-ops { display:none; }
          .nav-section { justify-content:center; padding:0.75rem 0; }
          .main      { padding:2rem 2rem 4rem; }
        }
        
        @media (max-width:40rem) {
          .body-grid { grid-template-columns:1fr; }
          .sidebar   { display:none; }
          
          /* Show mobile pills for operations */
          .mobile-ops-menu {
            display: flex;
            overflow-x: auto;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none;  /* IE and Edge */
          }
          .mobile-ops-menu::-webkit-scrollbar { display: none; }
          .mobile-op-pill {
            padding: 0.5rem 1rem;
            border-radius: 99rem;
            background: ${C.surfaceAlt};
            border: 1px solid ${C.border};
            font-family: 'DM Sans', sans-serif;
            font-size: 0.8rem; font-weight: 500;
            color: ${C.inkMid};
            white-space: nowrap;
          }
          .mobile-op-pill.active {
            background: ${C.green};
            color: #fff;
            border-color: ${C.green};
            box-shadow: 0 2px 6px ${C.green}40;
          }

          .mobile-tabs {
            display:flex; position:fixed;
            bottom:0; left:0; right:0;
            background:${C.surface}; border-top:1px solid ${C.border};
            z-index:200; height:4rem;
            padding-bottom: env(safe-area-inset-bottom); /* iOS support */
          }
          .mobile-tab {
            flex:1; display:flex; flex-direction:column;
            align-items:center; justify-content:center; gap:0.2rem;
            font-family:'DM Sans', sans-serif;
            font-size:0.6rem; font-weight:600;
            letter-spacing:0.04em; text-transform:uppercase;
            color:${C.inkDim}; cursor:pointer;
            border-top:2px solid transparent;
            transition:all 0.2s;
          }
          .mobile-tab.active { color:${C.green}; border-top-color:${C.green}; background:${C.greenLight}30; }
          .mobile-tab-icon   { font-size:1.25rem; }
          .main  { padding:1.5rem 1.25rem 6rem; }
          .docs-link { display:none; }
          .form-grid { grid-template-columns:1fr; }
          .output-card { height:26rem; }
          .op-title  { font-size:1.75rem; }
        }
      `}</style>

      <div className="app-wrapper">
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
          <div className="body-grid">
            <div className="sidebar">
              <Sidebar section={section} opId={opId} onSection={setSection} onOp={setOpId}/>
            </div>

            <main className="main">
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
      </div>
    </>
  );
}