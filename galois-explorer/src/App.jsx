import { useState, useCallback, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&" +
  "family=Outfit:wght@400;500;600;700&display=swap";

const C = {
  bg:          "#0F1117",
  panel:       "#161B27",
  panelHover:  "#1C2333",
  input:       "#1A2030",
  border:      "#252D3D",
  borderMid:   "#2E3A50",
  text:        "#E2E8F4",
  textMid:     "#8896AA",
  textDim:     "#4A5568",
  accent:      "#6366F1",
  accentBright:"#818CF8",
  accentDim:   "#1E1F45",
  accentGlow:  "rgba(99,102,241,0.15)",
  green:       "#34D399",
  greenDim:    "#0D2B20",
  red:         "#F87171",
  redDim:      "#2B0F0F",
  orange:      "#FB923C",
  teal:        "#22D3EE",
};

const G_X = "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";
const G_Y = "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8";
const CURVES = ["secp256k1", "p256", "p384"];
const GROUPS = ["modp2048", "modp3072", "modp4096"];

// ─────────────────────────────────────────────────────────────────────────────
// 2. OPERATIONS CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

const OPS = {
  field: [
    { id:"element", label:"Create Element", desc:"Validate & normalise a value into GF(p)",
      method:"POST", path:"/api/field/element",
      fields:[
        {key:"prime",label:"Prime p", placeholder:"223", hint:"decimal or 0x hex"},
        {key:"value",label:"Value a", placeholder:"192", hint:"reduced mod p"},
      ]},
    { id:"add", label:"Add", desc:"a + b mod p",
      method:"POST", path:"/api/field/add",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"sub", label:"Subtract", desc:"a − b mod p",
      method:"POST", path:"/api/field/sub",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"mul", label:"Multiply", desc:"a × b mod p",
      method:"POST", path:"/api/field/mul",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"div", label:"Divide", desc:"a × b⁻¹ mod p",
      method:"POST", path:"/api/field/div",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"Numerator a",placeholder:"192"},{key:"b",label:"Divisor b",placeholder:"105"}]},
    { id:"pow", label:"Power", desc:"base ^ exp mod p",
      method:"POST", path:"/api/field/pow",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"base",label:"Base",placeholder:"192"},{key:"exp",label:"Exponent",placeholder:"3",hint:"negative → inverse"}]},
    { id:"inverse", label:"Inverse", desc:"Multiplicative inverse a⁻¹ in GF(p)",
      method:"POST", path:"/api/field/inverse",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
    { id:"neg", label:"Negate", desc:"Additive inverse p − a mod p",
      method:"POST", path:"/api/field/neg",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
  ],
  ecc: [
    { id:"curves",     label:"List Curves",       desc:"All available named curves",
      method:"GET",  path:"/api/ecc/curves", fields:[] },
    { id:"curve_info", label:"Curve Info",         desc:"Parameters for a specific curve",
      method:"GET",  path:"/api/ecc/curves/:name",
      fields:[{key:"name",label:"Curve",type:"select",options:CURVES}]},
    { id:"generator",  label:"Generator Point G",  desc:"Base point G coordinates",
      method:"GET",  path:"/api/ecc/curves/:name/generator",
      fields:[{key:"name",label:"Curve",type:"select",options:CURVES}]},
    { id:"validate",   label:"Validate Point",     desc:"Check whether (x, y) lies on the curve",
      method:"POST", path:"/api/ecc/point/validate",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:CURVES},
        {key:"x",label:"x coordinate",placeholder:G_X,default:G_X,hint:"pre-filled: G·x"},
        {key:"y",label:"y coordinate",placeholder:G_Y,default:G_Y},
      ]},
    { id:"point_add",  label:"Point Addition",     desc:"P₁ + P₂ on the curve",
      method:"POST", path:"/api/ecc/point/add",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:CURVES},
        {key:"x1",label:"P₁ x",placeholder:G_X,default:G_X,hint:"G + G = 2G"},
        {key:"y1",label:"P₁ y",placeholder:G_Y,default:G_Y},
        {key:"x2",label:"P₂ x",placeholder:G_X,default:G_X},
        {key:"y2",label:"P₂ y",placeholder:G_Y,default:G_Y},
      ]},
    { id:"scalar_mul", label:"Scalar Multiply",    desc:"k × P — leave P blank for G",
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
    { id:"xgcd",          label:"Extended GCD",   desc:"gcd(a,b) = a·x + b·y",
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
        {key:"secret",       label:"Shared secret",      placeholder:"(decimal from /shared_secret)"},
        {key:"secret_group", label:"Group",               type:"select",options:GROUPS,default:"modp2048"},
        {key:"length",       label:"Key length (bytes)",  placeholder:"32",default:"32",hint:"1 – 64"},
      ]},
  ],
};

const SECTIONS = {
  field: { label:"Prime Field",    sub:"𝔽ₚ arithmetic",        icon:"𝔽" },
  ecc:   { label:"Elliptic Curves",sub:"ECC operations",        icon:"𝔼" },
  utils: { label:"Number Theory",  sub:"Primes & modular math", icon:"∂" },
  dhke:  { label:"Diffie-Hellman", sub:"Key exchange",          icon:"⇄" },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildRequestInputs(fields) {
  return Object.fromEntries(
    fields.map(f => [f.key, f.type === "select" ? (f.default ?? f.options[0]) : (f.default ?? "")])
  );
}

function resolveUrl(baseUrl, op, inputs) {
  const path = op.path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(inputs[k] ?? ""));
  return baseUrl.replace(/\/$/, "") + path;
}

function buildBody(op, inputs) {
  if (op.method === "GET") return null;
  const raw = {};
  op.fields.forEach(f => { const v = (inputs[f.key] ?? "").trim(); if (v) raw[f.key] = v; });
  return JSON.stringify(raw);
}

function parseApiError(json) {
  if (Array.isArray(json.detail))
    return json.detail.map(e => `${e.loc?.slice(1).join(".")} — ${e.msg}`).join("\n");
  return json.detail ?? JSON.stringify(json);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  const isGet = method === "GET";
  return (
    <span style={{
      fontFamily:"'Geist Mono',monospace",
      fontSize:"0.625rem", fontWeight:500, letterSpacing:"0.06em",
      padding:"0.125rem 0.4rem", borderRadius:"0.25rem",
      background: isGet ? C.greenDim  : C.accentDim,
      color:      isGet ? C.green     : C.accentBright,
      border:     `1px solid ${isGet ? C.green + "40" : C.accent + "40"}`,
      whiteSpace: "nowrap",
    }}>
      {method}
    </span>
  );
}

function Spinner({ color = "#fff" }) {
  return (
    <span style={{
      display:"inline-block", width:"0.875rem", height:"0.875rem",
      border:`0.125rem solid ${C.accent}40`, borderTopColor: color,
      borderRadius:"50%", animation:"spin 0.65s linear infinite",
    }} />
  );
}

function JsonValue({ data, depth = 0 }) {
  if (data === null)             return <span style={{color:C.textDim}}>null</span>;
  if (typeof data === "boolean") return <span style={{color:data?C.green:C.red,fontWeight:500}}>{String(data)}</span>;
  if (typeof data === "number")  return <span style={{color:C.orange}}>{data}</span>;

  if (typeof data === "string") {
    const isHex = data.startsWith("0x");
    const isBig = /^\d{10,}$/.test(data);
    if (isHex || isBig) {
      const color = isHex ? C.teal : C.orange;
      if (data.length > 64) {
        return (
          <div style={{
            display:"block", width:"100%", boxSizing:"border-box",
            wordBreak:"break-all", overflowWrap:"anywhere",
            color, fontSize:"0.7rem", lineHeight:1.7,
            background:C.input, border:`1px solid ${C.border}`,
            borderRadius:"0.375rem", padding:"0.375rem 0.625rem",
            marginTop:"0.25rem", marginBottom:"0.125rem",
          }}>{data}</div>
        );
      }
      return <span style={{color}}>{data}</span>;
    }
    return <span style={{color:C.green}}>"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (!data.length) return <span style={{color:C.textDim}}>[]</span>;
    return (
      <div>
        <span style={{color:C.textDim}}>{"["}</span>
        {data.map((v,i) => (
          <div key={i} style={{paddingLeft:"1.25rem"}}>
            <JsonValue data={v} depth={depth+1}/>
            {i < data.length-1 && <span style={{color:C.textDim}}>,</span>}
          </div>
        ))}
        <span style={{color:C.textDim}}>{"]"}</span>
      </div>
    );
  }

  if (typeof data === "object") {
    return (
      <div>
        {Object.entries(data).map(([k,v],i,arr) => (
          <div key={k} style={{paddingLeft: depth===0 ? 0 : "1.25rem"}}>
            <span style={{color:C.accentBright}}>{k}</span>
            <span style={{color:C.textDim}}>: </span>
            <JsonValue data={v} depth={depth+1}/>
            {i < arr.length-1 && <span style={{color:C.textDim}}>,</span>}
          </div>
        ))}
      </div>
    );
  }

  return <span style={{color:C.text}}>{String(data)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FEATURE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({ section, opId, onSection, onOp }) {
  return (
    <nav style={{
      padding:"1.25rem 0.75rem",
      position:"sticky", top:"3.5rem",
      height:"calc(100dvh - 3.5rem)",
      overflowY:"auto",
      display:"flex", flexDirection:"column", gap:"0.25rem",
    }}>
      {Object.entries(SECTIONS).map(([id, meta]) => {
        const isActiveSection = section === id;
        return (
          <div key={id}>
            <button
              className="section-btn"
              onClick={() => onSection(id)}
              style={{
                width:"100%", textAlign:"left",
                padding:"0.5rem 0.625rem",
                borderRadius:"0.5rem", border:"none",
                background: isActiveSection ? C.accentGlow : "transparent",
                cursor:"pointer", transition:"background 0.15s",
                marginBottom:"0.125rem",
              }}>
              <span className="section-icon" style={{
                fontSize:"1.125rem", display:"none",
              }}>{meta.icon}</span>
              <span className="section-label" style={{
                fontFamily:"'Outfit',sans-serif", fontSize:"0.8125rem",
                fontWeight: isActiveSection ? 600 : 500,
                color: isActiveSection ? C.accentBright : C.textMid,
                display:"block", marginBottom:"0.0625rem",
              }}>{meta.label}</span>
              <span className="section-sub" style={{
                fontFamily:"'Geist Mono',monospace", fontSize:"0.625rem",
                color:C.textDim, display:"block",
              }}>{meta.sub}</span>
            </button>

            {isActiveSection && OPS[id].map(op => {
              const isActiveOp = opId === op.id;
              return (
                <button key={op.id}
                  className="op-btn"
                  onClick={() => onOp(op.id)}
                  style={{
                    width:"100%", textAlign:"left",
                    padding:"0.375rem 0.625rem 0.375rem 1.375rem",
                    borderRadius:"0.375rem", border:"none",
                    background: isActiveOp ? C.input : "transparent",
                    cursor:"pointer", display:"flex", alignItems:"center",
                    gap:"0.5rem", transition:"background 0.1s",
                    marginBottom:"0.0625rem",
                  }}>
                  <span className="op-bar" style={{
                    width:"0.125rem", height:"0.75rem", borderRadius:"0.0625rem",
                    flexShrink:0,
                    background: isActiveOp ? C.accent : "transparent",
                    transition:"background 0.1s",
                  }}/>
                  <span className="op-label" style={{
                    fontFamily:"'Outfit',sans-serif", fontSize:"0.78rem",
                    fontWeight: isActiveOp ? 500 : 400,
                    color: isActiveOp ? C.text : C.textMid,
                  }}>{op.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function FieldInput({ field, value, onChange }) {
  const { key, label, type, options, placeholder, hint } = field;
  return (
    <div>
      <label>{label}</label>
      {type === "select"
        ? <select value={value} onChange={e => onChange(key, e.target.value)}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input value={value} placeholder={placeholder}
            onChange={e => onChange(key, e.target.value)}
            spellCheck={false} autoComplete="off"
          />
      }
      {hint && (
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:"0.65rem",color:C.textDim,marginTop:"0.3rem"}}>
          {hint}
        </div>
      )}
    </div>
  );
}

function OpForm({ op, inputs, onChange, onSubmit, loading }) {
  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:"0.75rem", padding:"1.25rem", marginBottom:"1rem",
    }}>
      {op.fields.length > 0 ? (
        <div className="form-grid" style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(15rem, 1fr))",
          gap:"1rem", marginBottom:"1.25rem",
        }}>
          {op.fields.map(f => (
            <FieldInput key={f.key} field={f} value={inputs[f.key]??""} onChange={onChange}/>
          ))}
        </div>
      ) : (
        <p style={{fontFamily:"'Geist Mono',monospace",fontSize:"0.8rem",color:C.textDim,marginBottom:"1rem"}}>
          No parameters — just send the request.
        </p>
      )}
      <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
        <button
          onClick={onSubmit} disabled={loading}
          style={{
            height:"2.25rem", padding:"0 1.375rem",
            background: loading ? C.accentDim : C.accent,
            color:"#fff", fontFamily:"'Outfit',sans-serif",
            fontWeight:600, fontSize:"0.875rem",
            borderRadius:"0.5rem", border:"none",
            display:"flex", alignItems:"center", gap:"0.5rem",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : `0 0 1rem ${C.accent}40`,
            transition:"background 0.15s, box-shadow 0.15s",
          }}>
          {loading ? <><Spinner/>Running…</> : "Run"}
        </button>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:"0.7rem",color:C.textDim}}>⌃ Enter</span>
      </div>
    </div>
  );
}

function OutputPanel({ result, error, loading, op, resultRef }) {
  const dotColor = error ? C.red : result !== null ? C.green : C.borderMid;
  const dotGlow  = error ? C.red : result !== null ? C.green : "none";
  const statusLabel = loading ? "Running…" : error ? "Error" : result !== null ? "Response" : "Output";

  return (
    <div className="out-panel" style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:"0.75rem", marginBottom:"1rem",
      height:"30rem", display:"flex", flexDirection:"column", overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:"0.625rem 1rem",
        borderBottom:`1px solid ${C.border}`,
        background:C.input,
        display:"flex", alignItems:"center", gap:"0.625rem",
        flexShrink:0,
      }}>
        <span style={{
          width:"0.4375rem", height:"0.4375rem", borderRadius:"50%", flexShrink:0,
          background:dotColor,
          boxShadow: dotGlow !== "none" ? `0 0 0.5rem ${dotGlow}` : "none",
          transition:"background 0.2s",
        }}/>
        <span style={{
          fontFamily:"'Geist Mono',monospace", fontSize:"0.6875rem",
          fontWeight:500, color:C.textMid,
          letterSpacing:"0.08em", textTransform:"uppercase",
        }}>
          {statusLabel}
        </span>
        {result !== null && !error && (
          <span style={{
            marginLeft:"auto", fontFamily:"'Geist Mono',monospace",
            fontSize:"0.6875rem", color:C.textDim,
          }}>
            200 OK · {op.method} {op.path}
          </span>
        )}
      </div>

      {/* Body */}
      <div ref={resultRef} style={{
        flex:1, minHeight:0,
        overflowY:"auto", overflowX:"hidden",
        padding:"1.125rem 1.25rem",
        fontFamily:"'Geist Mono',monospace",
        fontSize:"0.78rem", lineHeight:1.9,
      }}>
        {loading && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            height:"100%", gap:"0.625rem", color:C.textDim,
          }}>
            <Spinner color={C.accent}/> Computing…
          </div>
        )}
        {!loading && error && (
          <pre style={{
            fontFamily:"'Geist Mono',monospace", fontSize:"0.75rem",
            color:C.red, whiteSpace:"pre-wrap", margin:0,
          }}>{error}</pre>
        )}
        {!loading && !error && result !== null && <JsonValue data={result}/>}
        {!loading && !error && result === null && (
          <div style={{
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            height:"100%", gap:"0.625rem", color:C.textDim,
          }}>
            <div style={{fontSize:"1.75rem"}}>λ</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:"0.8125rem"}}>
              Run a request to see output
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPanel({ history, onSelect }) {
  return (
    <div style={{
      background:C.panel, border:`1px solid ${C.border}`,
      borderRadius:"0.75rem", overflow:"hidden",
    }}>
      <div style={{
        padding:"0.625rem 1rem",
        borderBottom:`1px solid ${C.border}`,
        background:C.input,
        fontFamily:"'Geist Mono',monospace", fontSize:"0.65rem",
        fontWeight:500, color:C.textDim,
        letterSpacing:"0.1em", textTransform:"uppercase",
      }}>History</div>
      {history.map((h,i) => (
        <div key={i}
          onClick={() => onSelect(h.result)}
          style={{
            display:"flex", alignItems:"center", gap:"0.625rem",
            padding:"0.625rem 1rem",
            borderBottom: i<history.length-1 ? `1px solid ${C.border}` : "none",
            cursor:"pointer", transition:"background 0.1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.panelHover}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <MethodBadge method={h.method}/>
          <span style={{fontFamily:"'Outfit',sans-serif",fontSize:"0.8125rem",fontWeight:500,color:C.text,flex:1}}>{h.label}</span>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:"0.6875rem",color:C.textDim}}>{h.ts}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function CryptoExplorer() {
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
    setInputs(buildRequestInputs(op?.fields ?? []));
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
      setHistory(h => [{label:op.label,method:op.method,result:json,ts:new Date().toLocaleTimeString()}, ...h.slice(0,7)]);
      setTimeout(() => resultRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}), 50);
    } catch(e) {
      setError(e.message.includes("fetch")
        ? `Could not connect to ${baseUrl}\n\nMake sure the server is running:\nuvicorn main:app --reload`
        : e.message);
    } finally { setLoading(false); }
  }, [baseUrl, op, inputs]);

  const handleFieldChange = useCallback((key, value) => {
    setInputs(prev => ({...prev, [key]: value}));
  }, []);

  useEffect(() => {
    const h = e => { if ((e.ctrlKey||e.metaKey) && e.key==="Enter") call(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [call]);

  return (
    <div style={{minHeight:"100dvh", display:"flex", flexDirection:"column", color:C.text}}>
      <style>{`
        @import url('${FONTS_URL}');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { font-size:16px; }
        html, body, #root {
          min-height:100dvh;
          background:${C.bg};
          scrollbar-gutter:stable;
        }
        body {
          overflow-x:hidden;
          color:${C.text};
          font-family:'Outfit',sans-serif;
          line-height:1.5;
          -webkit-font-smoothing:antialiased;
        }
        ::-webkit-scrollbar { width:0.3125rem; height:0.3125rem; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.borderMid}; border-radius:99rem; }
        input, select {
          font-family:'Geist Mono','JetBrains Mono',monospace;
          font-size:0.78rem;
          background:${C.input}; border:1px solid ${C.border};
          color:${C.text}; border-radius:0.5rem;
          padding:0.5625rem 0.75rem; width:100%;
          outline:none; appearance:none;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        input:focus, select:focus {
          border-color:${C.accent};
          box-shadow:0 0 0 0.1875rem ${C.accentGlow};
        }
        input::placeholder { color:${C.textDim}; }
        select {
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5568' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat:no-repeat;
          background-position:right 0.75rem center;
          padding-right:2rem; cursor:pointer;
        }
        label {
          font-family:'Outfit',sans-serif;
          font-size:0.6875rem; font-weight:600;
          letter-spacing:0.06em; text-transform:uppercase;
          color:${C.textDim}; margin-bottom:0.375rem; display:block;
        }
        button { cursor:pointer; border:none; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(0.375rem)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .fade-up { animation:fadeUp 0.18s ease both; }

        /* ── Layout ── */
        .layout-body   { display:flex; flex:1; }
        .sidebar-col   {
          width:14.5rem; flex-shrink:0;
          background:${C.panel}; border-right:1px solid ${C.border};
          align-self:stretch;
        }
        .main-area     { flex:1; min-width:0; background:${C.bg}; }
        .main-pad      { padding:2rem 2.25rem; }
        .mobile-tabs   { display:none; }

        /* ── Tablet ≤56rem (896px) ── */
        @media (max-width:56rem) {
          .sidebar-col { width:3.25rem; }
          .section-label, .section-sub, .op-label { display:none !important; }
          .section-icon { display:block !important; }
          .section-btn  { justify-content:center !important; padding:0.625rem 0 !important; }
          .op-btn       { justify-content:center !important; padding:0.5rem 0 !important; }
          .op-bar       { display:none !important; }
          .topbar-url   { max-width:12rem !important; }
        }

        /* ── Mobile ≤37.5rem (600px) ── */
        @media (max-width:37.5rem) {
          .sidebar-col  { display:none !important; }
          .mobile-tabs  { display:flex !important; }
          .docs-link    { display:none !important; }
          .topbar-url   { max-width:10rem !important; }
          .main-pad     { padding:1rem 1rem 5rem; }
          .form-grid    { grid-template-columns:1fr !important; }
          .out-panel    { height:22rem !important; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <header style={{
        height:"3.5rem", background:C.panel,
        borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center",
        padding:"0 1.25rem", gap:"1rem",
        position:"sticky", top:0, zIndex:100, flexShrink:0,
      }}>
        <div style={{
          fontFamily:"'Outfit',sans-serif", fontWeight:700,
          fontSize:"1rem", color:C.text,
          display:"flex", alignItems:"center", gap:"0.5rem", whiteSpace:"nowrap",
        }}>
          crypto
          <span style={{
            fontFamily:"'Geist Mono',monospace",
            background:C.accentDim, color:C.accentBright,
            fontSize:"0.625rem", fontWeight:500,
            padding:"0.125rem 0.5rem", borderRadius:"99rem",
            border:`1px solid ${C.accent}40`, letterSpacing:"0.06em",
          }}>API</span>
        </div>

        {editingUrl ? (
          <input autoFocus defaultValue={baseUrl}
            style={{flex:1, maxWidth:"23.75rem", height:"2.125rem", fontSize:"0.75rem", padding:"0 0.75rem"}}
            onBlur={e  => {setBaseUrl(e.target.value.replace(/\/$/,"")); setEditingUrl(false);}}
            onKeyDown={e => {if(e.key==="Enter"){setBaseUrl(e.target.value.replace(/\/$/,"")); setEditingUrl(false);}}}
          />
        ) : (
          <div className="topbar-url" onClick={() => setEditingUrl(true)} title="Click to edit"
            style={{
              flex:1, maxWidth:"23.75rem", height:"2.125rem",
              background:C.input, border:`1px solid ${C.border}`,
              borderRadius:"0.5rem", display:"flex", alignItems:"center",
              gap:"0.5rem", padding:"0 0.75rem", cursor:"text",
            }}>
            <span style={{width:"0.375rem",height:"0.375rem",borderRadius:"50%",background:C.green,flexShrink:0,boxShadow:`0 0 0.375rem ${C.green}`}}/>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:"0.75rem",color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {baseUrl}
            </span>
          </div>
        )}

        <a href={`${baseUrl}/docs`} target="_blank" rel="noreferrer" className="docs-link"
          style={{
            marginLeft:"auto", fontFamily:"'Geist Mono',monospace",
            fontSize:"0.75rem", color:C.textMid,
            textDecoration:"none", padding:"0.25rem 0.625rem",
            borderRadius:"0.375rem", border:`1px solid ${C.border}`,
          }}>
          /docs ↗
        </a>
      </header>

      {/* ── Body ── */}
      <div className="layout-body">
        <div className="sidebar-col">
          <Sidebar section={section} opId={opId} onSection={setSection} onOp={setOpId}/>
        </div>

        <div className="main-area">
          <div className="main-pad">

            {/* Op title */}
            <div style={{marginBottom:"1.5rem",paddingBottom:"1.25rem",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.625rem",marginBottom:"0.625rem"}}>
                <MethodBadge method={op.method}/>
                <code style={{
                  fontFamily:"'Geist Mono',monospace", fontSize:"0.78rem",
                  color:C.textDim, background:C.input,
                  padding:"0.125rem 0.5rem", borderRadius:"0.3125rem",
                  border:`1px solid ${C.border}`,
                }}>{op.path}</code>
              </div>
              <h1 style={{fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:"1.625rem",letterSpacing:"-0.03em",color:C.text,marginBottom:"0.375rem"}}>
                {op.label}
              </h1>
              <p style={{fontFamily:"'Geist Mono',monospace",fontSize:"0.84rem",color:C.textMid}}>
                {op.desc}
              </p>
            </div>

            {op.note && (
              <div style={{
                background:C.accentDim, border:`1px solid ${C.accent}40`,
                borderLeft:`0.1875rem solid ${C.accent}`,
                borderRadius:"0 0.5rem 0.5rem 0",
                padding:"0.625rem 0.875rem",
                fontFamily:"'Geist Mono',monospace", fontSize:"0.78rem",
                color:C.accentBright, marginBottom:"1.25rem",
              }}>{op.note}</div>
            )}

            <OpForm op={op} inputs={inputs} onChange={handleFieldChange} onSubmit={call} loading={loading}/>

            <OutputPanel result={result} error={error} loading={loading} op={op} resultRef={resultRef}/>

            {history.length > 0 && <HistoryPanel history={history} onSelect={setResult}/>}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tabs ── */}
      <nav className="mobile-tabs" style={{
        position:"fixed", bottom:0, left:0, right:0,
        height:"3.5rem", background:C.panel,
        borderTop:`1px solid ${C.border}`,
        display:"none", alignItems:"stretch", zIndex:200,
      }}>
        {Object.entries(SECTIONS).map(([id, meta]) => (
          <button key={id}
            onClick={() => {setSection(id); setOpId(OPS[id][0].id);}}
            style={{
              flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:"0.1875rem",
              background: section===id ? C.accentDim : "transparent",
              border:"none", cursor:"pointer",
              borderTop: section===id ? `0.125rem solid ${C.accent}` : "0.125rem solid transparent",
              color: section===id ? C.accentBright : C.textDim,
              fontSize:"0.5rem", fontFamily:"'Outfit',sans-serif",
              fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase",
              transition:"all 0.15s",
            }}>
            <span style={{fontSize:"1.25rem"}}>{meta.icon}</span>
            {meta.label}
          </button>
        ))}
      </nav>
    </div>
  );
}