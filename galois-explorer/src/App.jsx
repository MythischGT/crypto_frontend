import { useState, useCallback, useRef, useEffect } from "react";

// ─── Fonts ────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  `}</style>
);

// ─── Tokens ───────────────────────────────────────────────────────────────
const C = {
  bg:       "#F7F6F3",
  surface:  "#FFFFFF",
  surfaceAlt: "#F2F1EE",
  border:   "#E3E1DC",
  borderDk: "#C8C5BF",
  ink:      "#18171A",
  inkMid:   "#5A5760",
  inkDim:   "#9B98A3",
  blue:     "#2055E5",
  blueLight:"#EEF2FD",
  blueMid:  "#8CA5F0",
  green:    "#1A9E5C",
  greenLight:"#E8F7F0",
  red:      "#D93025",
  redLight: "#FDECEA",
  orange:   "#D96B10",
  orangeLight:"#FDF3E8",
};

// ─── Global CSS ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html, body { height:100%; }
    body {
      background:${C.bg};
      color:${C.ink};
      font-family:'DM Sans', sans-serif;
      font-size:14px;
      line-height:1.5;
      -webkit-font-smoothing:antialiased;
    }
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:${C.borderDk}; border-radius:99px; }

    input, select, textarea {
      font-family:'JetBrains Mono', monospace;
      font-size:12.5px;
      background:${C.surface};
      border:1.5px solid ${C.border};
      color:${C.ink};
      border-radius:8px;
      padding:9px 12px;
      width:100%;
      outline:none;
      transition:border-color 0.15s, box-shadow 0.15s;
      appearance:none;
    }
    input:focus, select:focus {
      border-color:${C.blue};
      box-shadow:0 0 0 3px ${C.blueLight};
    }
    input::placeholder { color:${C.inkDim}; font-weight:300; }
    select {
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239B98A3' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat:no-repeat;
      background-position:right 12px center;
      padding-right:32px;
      cursor:pointer;
    }
    label {
      font-family:'DM Sans', sans-serif;
      font-size:11.5px;
      font-weight:500;
      letter-spacing:0.03em;
      color:${C.inkMid};
      margin-bottom:5px;
      display:block;
    }
    button { cursor:pointer; border:none; font-family:'DM Sans', sans-serif; }

    @keyframes fadeUp {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes spin {
      to { transform:rotate(360deg); }
    }
    .fade-up { animation:fadeUp 0.2s ease both; }
  `}</style>
);

// ─── ECC test vectors ─────────────────────────────────────────────────────
const K1_Gx = "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";
const K1_Gy = "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8";

// ─── Operations catalogue ─────────────────────────────────────────────────
const OPS = {
  field: [
    { id:"element", label:"Create Element", desc:"Validate & normalise a into GF(p)",
      method:"POST", path:"/api/field/element",
      fields:[
        {key:"prime",label:"Prime p",placeholder:"223",hint:"decimal or 0x hex"},
        {key:"value",label:"Value a",placeholder:"192",hint:"reduced mod p"},
      ]},
    { id:"add",     label:"Add",      desc:"a + b mod p", method:"POST", path:"/api/field/add",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"sub",     label:"Subtract", desc:"a − b mod p", method:"POST", path:"/api/field/sub",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"mul",     label:"Multiply", desc:"a × b mod p", method:"POST", path:"/api/field/mul",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"div",     label:"Divide",   desc:"a × b⁻¹ mod p", method:"POST", path:"/api/field/div",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"a",label:"Numerator a",placeholder:"192"},{key:"b",label:"Divisor b",placeholder:"105"}]},
    { id:"pow",     label:"Power",    desc:"base ^ exp mod p", method:"POST", path:"/api/field/pow",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"base",label:"Base",placeholder:"192"},{key:"exp",label:"Exponent",placeholder:"3",hint:"negative → inverse"}]},
    { id:"inverse", label:"Inverse",  desc:"Multiplicative inverse a⁻¹ in GF(p)", method:"POST", path:"/api/field/inverse",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
    { id:"neg",     label:"Negate",   desc:"Additive inverse p − a mod p", method:"POST", path:"/api/field/neg",
      fields:[{key:"prime",label:"Prime p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
  ],
  ecc: [
    { id:"curves",     label:"List Curves",      desc:"All available named curves",
      method:"GET", path:"/api/ecc/curves", fields:[]},
    { id:"curve_info", label:"Curve Info",        desc:"Parameters for a specific curve",
      method:"GET", path:"/api/ecc/curves/:name",
      fields:[{key:"name",label:"Curve",type:"select",options:["secp256k1","p256","p384"]}]},
    { id:"generator",  label:"Generator Point G", desc:"Base point G coordinates",
      method:"GET", path:"/api/ecc/curves/:name/generator",
      fields:[{key:"name",label:"Curve",type:"select",options:["secp256k1","p256","p384"]}]},
    { id:"validate",   label:"Validate Point",    desc:"Check whether (x, y) lies on the curve",
      method:"POST", path:"/api/ecc/point/validate",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:["secp256k1","p256","p384"]},
        {key:"x",label:"x coordinate",placeholder:K1_Gx,default:K1_Gx,hint:"pre-filled: G·x"},
        {key:"y",label:"y coordinate",placeholder:K1_Gy,default:K1_Gy},
      ]},
    { id:"point_add",  label:"Point Addition",    desc:"P₁ + P₂ on the curve",
      method:"POST", path:"/api/ecc/point/add",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:["secp256k1","p256","p384"]},
        {key:"x1",label:"P₁ x",placeholder:K1_Gx,default:K1_Gx,hint:"G + G = 2G"},
        {key:"y1",label:"P₁ y",placeholder:K1_Gy,default:K1_Gy},
        {key:"x2",label:"P₂ x",placeholder:K1_Gx,default:K1_Gx},
        {key:"y2",label:"P₂ y",placeholder:K1_Gy,default:K1_Gy},
      ]},
    { id:"scalar_mul", label:"Scalar Multiply",   desc:"k × P — leave P blank for G",
      method:"POST", path:"/api/ecc/scalar_mul",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:["secp256k1","p256","p384"]},
        {key:"k",label:"Scalar k",placeholder:"2",default:"2",hint:"decimal or 0x hex"},
        {key:"x",label:"P x (optional)",placeholder:"leave blank to use G"},
        {key:"y",label:"P y (optional)",placeholder:"leave blank to use G"},
      ]},
  ],
  utils: [
    { id:"is_prime",       label:"Is Prime?",       desc:"Miller-Rabin primality test",
      method:"POST", path:"/api/utils/is_prime",
      fields:[{key:"n",label:"n",placeholder:"0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F",hint:"decimal or 0x hex"}]},
    { id:"next_prime",     label:"Next Prime",      desc:"Smallest prime ≥ n",
      method:"POST", path:"/api/utils/next_prime",
      fields:[{key:"n",label:"n",placeholder:"100"}]},
    { id:"generate_prime", label:"Generate Prime",  desc:"Random prime of exactly n bits",
      method:"POST", path:"/api/utils/generate_prime",
      fields:[{key:"bits",label:"Bit length",placeholder:"256",hint:"2 – 4096"}]},
    { id:"mod_inverse",    label:"Modular Inverse", desc:"Inverse of a (mod m)",
      method:"POST", path:"/api/utils/mod_inverse",
      fields:[{key:"a",label:"a",placeholder:"3"},{key:"m",label:"Modulus m",placeholder:"11"}]},
    { id:"xgcd",           label:"Extended GCD",    desc:"gcd(a,b) = a·x + b·y",
      method:"POST", path:"/api/utils/xgcd",
      fields:[{key:"a",label:"a",placeholder:"35"},{key:"b",label:"b",placeholder:"15"}]},
  ],
  dhke: [
    { id:"keypair",       label:"Generate Key Pair",      desc:"Fresh DHKE key pair over RFC 3526 MODP group",
      method:"POST", path:"/api/crypto/dhke/keypair",
      note:"Run this twice — once for each party. Keep private_key.x secret, share public_key.y.",
      fields:[{key:"group",label:"Group",type:"select",options:["modp2048","modp3072","modp4096"],default:"modp2048"}]},
    { id:"shared_secret", label:"Compute Shared Secret",  desc:"g^(xy) mod p — both parties compute the same value",
      method:"POST", path:"/api/crypto/dhke/shared_secret",
      note:"Paste your private key fields and the peer's public_key.y.",
      fields:[
        {key:"private_group",label:"Group",type:"select",options:["modp2048","modp3072","modp4096"],default:"modp2048"},
        {key:"private_x",label:"Your private_key.x",placeholder:"(from /keypair)"},
        {key:"private_p",label:"Your private_key.p",placeholder:"(from /keypair)"},
        {key:"private_g",label:"Your private_key.g",placeholder:"2",default:"2"},
        {key:"peer_y",   label:"Peer's public_key.y",placeholder:"(from peer's /keypair)"},
      ]},
    { id:"derive_key",    label:"Derive Symmetric Key",   desc:"SHA-256 KDF → symmetric key bytes",
      method:"POST", path:"/api/crypto/dhke/derive_key",
      note:"Both parties run this with the same shared secret to get an identical AES key.",
      fields:[
        {key:"secret",      label:"Shared secret",placeholder:"(decimal from /shared_secret)"},
        {key:"secret_group",label:"Group",type:"select",options:["modp2048","modp3072","modp4096"],default:"modp2048"},
        {key:"length",      label:"Key length (bytes)",placeholder:"32",default:"32",hint:"1 – 64"},
      ]},
  ],
};

const SECTIONS = {
  field: "Prime Field  𝔽ₚ",
  ecc:   "Elliptic Curves",
  utils: "Number Theory",
  dhke:  "Diffie-Hellman",
};

// ─── Method badge ─────────────────────────────────────────────────────────
function MethodBadge({ method }) {
  const isGet = method === "GET";
  return (
    <span style={{
      fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, fontWeight:500, letterSpacing:"0.06em",
      padding:"2px 7px", borderRadius:4,
      background: isGet ? C.greenLight : C.blueLight,
      color:       isGet ? C.green     : C.blue,
      border:`1px solid ${isGet ? "#BBE8D5" : C.blueMid}`,
      whiteSpace:"nowrap",
    }}>
      {method}
    </span>
  );
}

// ─── JSON renderer ────────────────────────────────────────────────────────
function JsonValue({ data }) {
  if (data === null)             return <span style={{color:C.inkDim}}>null</span>;
  if (typeof data === "boolean") return <span style={{color:data ? C.green : C.red, fontWeight:500}}>{String(data)}</span>;
  if (typeof data === "number")  return <span style={{color:C.orange}}>{data}</span>;
  if (typeof data === "string") {
    const isHex = data.startsWith("0x");
    const isBig = /^\d{12,}$/.test(data);
    const display = (isHex || isBig) && data.length > 52
      ? data.slice(0, 52) + "…"
      : data;
    if (isHex) return <span style={{color:C.blue, fontWeight:400}}>{display}</span>;
    if (isBig) return <span style={{color:C.orange}}>{display}</span>;
    return <span style={{color:"#1A7A4A"}}>"{display}"</span>;
  }
  if (Array.isArray(data)) {
    if (!data.length) return <span style={{color:C.inkDim}}>[ ]</span>;
    return (
      <span>
        <span style={{color:C.inkMid}}>{"["}</span>
        {data.map((v, i) => (
          <div key={i} style={{paddingLeft:18}}>
            <JsonValue data={v} />
            {i < data.length - 1 && <span style={{color:C.inkDim}}>,</span>}
          </div>
        ))}
        <span style={{color:C.inkMid}}>{"  ]"}</span>
      </span>
    );
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    return (
      <span>
        {entries.map(([k, v], i) => (
          <div key={k} style={{paddingLeft:18}}>
            <span style={{color:C.inkMid, fontWeight:400}}>{k}</span>
            <span style={{color:C.inkDim}}>: </span>
            <JsonValue data={v} />
            {i < entries.length - 1 && <span style={{color:C.inkDim}}>,</span>}
          </div>
        ))}
      </span>
    );
  }
  return <span>{String(data)}</span>;
}

// ─── Spinner ──────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display:"inline-block", width:14, height:14,
      border:`2px solid ${C.border}`,
      borderTopColor:C.ink,
      borderRadius:"50%",
      animation:"spin 0.7s linear infinite",
      verticalAlign:"middle",
    }}/>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
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
    const d = {};
    (op?.fields ?? []).forEach(f => {
      d[f.key] = f.type === "select" ? (f.default ?? f.options[0]) : (f.default ?? "");
    });
    setInputs(d); setResult(null); setError(null);
  }, [opId, section]);

  useEffect(() => { setOpId(OPS[section][0].id); }, [section]);

  const call = useCallback(async () => {
    if (!op) return;
    setLoading(true); setResult(null); setError(null);
    const resolvedPath = op.path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(inputs[k] ?? ""));
    const url = baseUrl.replace(/\/$/, "") + resolvedPath;
    let body = null;
    if (op.method !== "GET") {
      const raw = {};
      op.fields.forEach(f => { const v = (inputs[f.key] ?? "").trim(); if (v) raw[f.key] = v; });
      body = JSON.stringify(raw);
    }
    try {
      const res  = await fetch(url, {
        method:  op.method,
        headers: op.method !== "GET" ? { "Content-Type": "application/json" } : {},
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(json.detail)
          ? json.detail.map(e => `${e.loc?.slice(1).join(".")} — ${e.msg}`).join("\n")
          : (json.detail ?? JSON.stringify(json));
        throw new Error(msg);
      }
      setResult(json);
      setHistory(h => [{ label: op.label, method: op.method, result: json, ts: new Date().toLocaleTimeString() }, ...h.slice(0, 7)]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (e) {
      setError(e.message.includes("fetch")
        ? `Could not connect to ${baseUrl}\n\nMake sure the server is running:\nuvicorn main:app --reload`
        : e.message);
    } finally { setLoading(false); }
  }, [baseUrl, op, inputs]);

  useEffect(() => {
    const h = e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") call(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [call]);

  const renderField = f => (
    <div key={f.key}>
      <label>{f.label}</label>
      {f.type === "select"
        ? <select value={inputs[f.key] ?? f.options[0]}
            onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}>
            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input
            value={inputs[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); call(); } }}
            spellCheck={false} autoComplete="off"
          />
      }
      {f.hint && (
        <div style={{ fontSize:11, color:C.inkDim, marginTop:4, fontFamily:"'JetBrains Mono',monospace" }}>
          {f.hint}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <FontLoader />
      <GlobalStyles />

      {/* ── Top bar ── */}
      <header style={{
        height:52, borderBottom:`1px solid ${C.border}`,
        background:C.surface,
        display:"flex", alignItems:"center",
        padding:"0 24px", gap:16,
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{
          fontFamily:"'Syne',sans-serif",
          fontWeight:800, fontSize:17, letterSpacing:"-0.02em",
          color:C.ink, display:"flex", alignItems:"center", gap:8,
        }}>
          crypto
          <span style={{
            background:C.ink, color:C.surface,
            fontSize:10, fontWeight:600, padding:"2px 6px",
            borderRadius:5, fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.05em",
          }}>API</span>
        </div>

        {/* URL bar */}
        <div style={{ flex:1, maxWidth:400 }}>
          {editingUrl
            ? <input autoFocus defaultValue={baseUrl}
                style={{ height:32, fontSize:12, borderRadius:6, padding:"0 10px" }}
                onBlur={e => { setBaseUrl(e.target.value.replace(/\/$/, "")); setEditingUrl(false); }}
                onKeyDown={e => { if (e.key === "Enter") { setBaseUrl(e.target.value.replace(/\/$/, "")); setEditingUrl(false); } }}
              />
            : <div onClick={() => setEditingUrl(true)}
                title="Click to edit API URL"
                style={{
                  height:32, display:"flex", alignItems:"center", gap:8,
                  background:C.surfaceAlt, border:`1.5px solid ${C.border}`,
                  borderRadius:8, padding:"0 10px", cursor:"text",
                  transition:"border-color 0.15s",
                }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, flexShrink:0 }}/>
                <span style={{
                  fontSize:12, color:C.inkMid,
                  fontFamily:"'JetBrains Mono',monospace",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>{baseUrl}</span>
              </div>
          }
        </div>

        <a href={`${baseUrl}/docs`} target="_blank" rel="noreferrer" style={{
          marginLeft:"auto",
          fontSize:12, color:C.inkMid,
          textDecoration:"none", fontWeight:500,
          display:"flex", alignItems:"center", gap:4,
        }}>
          Swagger docs
          <span style={{ fontSize:10 }}>↗</span>
        </a>
      </header>

      {/* ── Body ── */}
      <div style={{ display:"flex", flex:1 }}>

        {/* ── Sidebar ── */}
        <nav style={{
          width:220, flexShrink:0,
          borderRight:`1px solid ${C.border}`,
          background:C.surface,
          padding:"16px 12px",
          position:"sticky", top:52, height:"calc(100vh - 52px)",
          overflowY:"auto",
        }}>
          {Object.entries(SECTIONS).map(([id, label]) => {
            const isActive = section === id;
            return (
              <div key={id} style={{ marginBottom:4 }}>
                {/* Section header — also a button */}
                <button
                  onClick={() => setSection(id)}
                  style={{
                    width:"100%", textAlign:"left",
                    padding:"7px 10px", borderRadius:7,
                    fontFamily:"'DM Sans',sans-serif",
                    fontSize:13, fontWeight:isActive ? 600 : 500,
                    color: isActive ? C.blue : C.inkMid,
                    background: isActive ? C.blueLight : "transparent",
                    transition:"all 0.12s",
                    marginBottom: isActive ? 4 : 0,
                  }}>
                  {label}
                </button>

                {/* Op list — only show for active section */}
                {isActive && OPS[id].map(o => (
                  <button key={o.id}
                    onClick={() => setOpId(o.id)}
                    style={{
                      width:"100%", textAlign:"left",
                      padding:"5px 10px 5px 20px",
                      borderRadius:6,
                      fontFamily:"'DM Sans',sans-serif",
                      fontSize:12.5,
                      fontWeight: opId === o.id ? 500 : 400,
                      color: opId === o.id ? C.ink : C.inkMid,
                      background: opId === o.id ? C.surfaceAlt : "transparent",
                      transition:"all 0.1s",
                      display:"flex", alignItems:"center", gap:8,
                    }}>
                    <span style={{
                      width:2, height:14, borderRadius:1, flexShrink:0,
                      background: opId === o.id ? C.blue : "transparent",
                      transition:"background 0.1s",
                    }}/>
                    {o.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* ── Main ── */}
        <main style={{
          flex:1, padding:"28px 32px",
          maxWidth:840, minWidth:0,
        }}>

          {/* Op title row */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <MethodBadge method={op.method} />
              <code style={{
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:12.5, color:C.inkMid,
                background:C.surfaceAlt,
                padding:"2px 8px", borderRadius:5,
                border:`1px solid ${C.border}`,
              }}>{op.path}</code>
            </div>
            <h1 style={{
              fontFamily:"'Syne',sans-serif",
              fontWeight:700, fontSize:22,
              letterSpacing:"-0.03em", color:C.ink,
              marginBottom:4,
            }}>{op.label}</h1>
            <p style={{ fontSize:13.5, color:C.inkMid }}>{op.desc}</p>
          </div>

          {/* Step note */}
          {op.note && (
            <div style={{
              background:C.blueLight,
              border:`1px solid ${C.blueMid}`,
              borderRadius:8, padding:"10px 14px",
              fontSize:12.5, color:C.blue, marginBottom:16,
              fontWeight:500,
            }}>
              {op.note}
            </div>
          )}

          {/* Form card */}
          <div style={{
            background:C.surface,
            border:`1px solid ${C.border}`,
            borderRadius:12,
            padding:20,
            marginBottom:16,
            boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
          }}>
            {op.fields.length > 0 ? (
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",
                gap:14,
                marginBottom:18,
              }}>
                {op.fields.map(renderField)}
              </div>
            ) : (
              <p style={{ fontSize:13, color:C.inkDim, marginBottom:16 }}>
                No parameters — just send the request.
              </p>
            )}

            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button
                onClick={call}
                disabled={loading}
                style={{
                  height:36, padding:"0 20px",
                  background: loading ? C.inkDim : C.ink,
                  color:"#fff",
                  fontWeight:600, fontSize:13.5,
                  borderRadius:8,
                  display:"flex", alignItems:"center", gap:8,
                  transition:"background 0.15s, transform 0.1s",
                  transform: loading ? "none" : undefined,
                  cursor: loading ? "not-allowed" : "pointer",
                }}>
                {loading ? <><Spinner /> Running…</> : "Run"}
              </button>
              <span style={{
                fontSize:11.5, color:C.inkDim,
                fontFamily:"'JetBrains Mono',monospace",
              }}>⌃ Enter</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="fade-up" style={{
              background:C.redLight, border:`1px solid #F5C2C0`,
              borderRadius:10, padding:"14px 16px",
              marginBottom:16,
            }}>
              <div style={{ fontWeight:600, color:C.red, marginBottom:6, fontSize:13 }}>
                Error
              </div>
              <pre style={{
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:12, color:C.red,
                whiteSpace:"pre-wrap", margin:0,
              }}>{error}</pre>
            </div>
          )}

          {/* Result */}
          {result !== null && !error && (
            <div className="fade-up" ref={resultRef} style={{
              background:C.surface,
              border:`1px solid ${C.border}`,
              borderRadius:12,
              overflow:"hidden",
              marginBottom:16,
              boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                padding:"10px 16px",
                borderBottom:`1px solid ${C.border}`,
                display:"flex", alignItems:"center", gap:10,
                background:C.surfaceAlt,
              }}>
                <span style={{
                  width:7, height:7, borderRadius:"50%",
                  background:C.green, flexShrink:0,
                }}/>
                <span style={{
                  fontSize:11.5, fontWeight:600, color:C.inkMid,
                  letterSpacing:"0.04em", textTransform:"uppercase",
                }}>Response</span>
                <span style={{
                  marginLeft:"auto",
                  fontFamily:"'JetBrains Mono',monospace",
                  fontSize:11, color:C.inkDim,
                }}>200 OK</span>
              </div>
              <div style={{
                padding:"16px 18px",
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:12.5, lineHeight:1.85,
                overflowX:"auto", maxHeight:480,
              }}>
                <JsonValue data={result} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {result === null && !error && !loading && (
            <div style={{
              textAlign:"center", padding:"56px 20px",
              color:C.inkDim,
            }}>
              <div style={{
                width:48, height:48, borderRadius:12,
                border:`2px dashed ${C.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 14px",
                fontSize:20, color:C.borderDk,
              }}>
                ƒ
              </div>
              <div style={{ fontWeight:500, color:C.inkMid, marginBottom:4 }}>
                Ready to execute
              </div>
              <div style={{ fontSize:13 }}>
                Fill in the fields and press{" "}
                <kbd style={{
                  background:C.surfaceAlt, border:`1px solid ${C.border}`,
                  borderRadius:4, padding:"1px 6px", fontSize:11.5,
                  fontFamily:"'JetBrains Mono',monospace", color:C.inkMid,
                }}>Run</kbd>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div style={{
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:12, overflow:"hidden",
              boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                padding:"10px 16px", borderBottom:`1px solid ${C.border}`,
                background:C.surfaceAlt,
                fontSize:11.5, fontWeight:600, color:C.inkMid,
                letterSpacing:"0.04em", textTransform:"uppercase",
              }}>
                History
              </div>
              {history.map((h, i) => (
                <div key={i} onClick={() => setResult(h.result)}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"9px 16px",
                    borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : "none",
                    cursor:"pointer",
                    transition:"background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <MethodBadge method={h.method} />
                  <span style={{ fontSize:13, color:C.ink, flex:1, fontWeight:500 }}>{h.label}</span>
                  <span style={{
                    fontFamily:"'JetBrains Mono',monospace",
                    fontSize:11, color:C.inkDim,
                  }}>{h.ts}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}