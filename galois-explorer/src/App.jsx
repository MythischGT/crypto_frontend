import { useState, useCallback, useRef, useEffect } from "react";

const FontLoader = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&family=Bebas+Neue&display=swap');`}</style>
);

const T = {
  bg:"#080c12", bgPanel:"#0c1219", bgInput:"#0f1825", bgResult:"#060a0f",
  border:"#1a2535", amber:"#f0a500", amberDim:"#7a5200",
  cyan:"#00d4c8", cyanDim:"#005550", green:"#00c970", red:"#f05050",
  violet:"#a78bfa", violetDim:"#3b1f7a",
  muted:"#3d5066", text:"#c8d8e8", textDim:"#4a6070", white:"#e8f0f8",
};

const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { background:${T.bg}; color:${T.text}; font-family:'IBM Plex Sans',sans-serif; }
    ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${T.bg}; }
    ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
    input,select {
      font-family:'IBM Plex Mono',monospace; background:${T.bgInput};
      border:1px solid ${T.border}; color:${T.text}; border-radius:4px;
      padding:8px 12px; width:100%; font-size:13px; outline:none; transition:border-color 0.15s;
    }
    input:focus,select:focus { border-color:${T.amber}; box-shadow:0 0 0 2px ${T.amberDim}40; }
    input::placeholder { color:${T.textDim}; }
    label { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:${T.muted}; margin-bottom:4px; display:block; }
    select option { background:${T.bgInput}; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
    @keyframes glow   { 0%,100%{text-shadow:0 0 8px ${T.amber}80} 50%{text-shadow:0 0 20px ${T.amber}} }
    .fade-in { animation:fadeIn 0.22s ease both; }
    .pulse   { animation:pulse 1.4s infinite; }
  `}</style>
);

// Known secp256k1 G coordinates for ECC pre-fill
const K1_Gx = "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";
const K1_Gy = "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8";

const OPS = {
  field: [
    { id:"element", label:"Create Element", icon:"⊕", desc:"Validate & normalise a value into GF(p)",
      method:"POST", path:"/api/field/element",
      fields:[
        { key:"prime", label:"Prime  p", placeholder:"223", hint:"decimal or 0x hex" },
        { key:"value", label:"Value  a", placeholder:"192", hint:"will be reduced mod p" },
      ]},
    { id:"add", label:"Add", icon:"+", desc:"a + b  mod  p", method:"POST", path:"/api/field/add",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"sub", label:"Subtract", icon:"−", desc:"a − b  mod  p", method:"POST", path:"/api/field/sub",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"mul", label:"Multiply", icon:"×", desc:"a × b  mod  p", method:"POST", path:"/api/field/mul",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"a",label:"a",placeholder:"192"},{key:"b",label:"b",placeholder:"105"}]},
    { id:"div", label:"Divide", icon:"÷", desc:"a × b⁻¹  mod  p", method:"POST", path:"/api/field/div",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"a",label:"a (numerator)",placeholder:"192"},{key:"b",label:"b (divisor)",placeholder:"105"}]},
    { id:"pow", label:"Power", icon:"xⁿ", desc:"base ^ exp  mod  p", method:"POST", path:"/api/field/pow",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"base",label:"base",placeholder:"192"},{key:"exp",label:"exponent",placeholder:"3",hint:"negative → modular inverse power"}]},
    { id:"inverse", label:"Inverse", icon:"a⁻¹", desc:"Multiplicative inverse in GF(p)", method:"POST", path:"/api/field/inverse",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
    { id:"neg", label:"Negate", icon:"−a", desc:"Additive inverse: p − a  mod  p", method:"POST", path:"/api/field/neg",
      fields:[{key:"prime",label:"Prime  p",placeholder:"223"},{key:"value",label:"a",placeholder:"192"}]},
  ],
  ecc: [
    { id:"curves",     label:"List Curves",      icon:"≋", desc:"All available named curves",
      method:"GET", path:"/api/ecc/curves", fields:[] },
    { id:"curve_info", label:"Curve Info",        icon:"ℂ", desc:"Full parameters for a specific curve",
      method:"GET", path:"/api/ecc/curves/:name",
      fields:[{key:"name",label:"Curve",type:"select",options:["secp256k1","p256","p384"]}]},
    { id:"generator",  label:"Generator Point G", icon:"G", desc:"Base point coordinates",
      method:"GET", path:"/api/ecc/curves/:name/generator",
      fields:[{key:"name",label:"Curve",type:"select",options:["secp256k1","p256","p384"]}]},
    { id:"validate",   label:"Validate Point",    icon:"✓", desc:"Check whether (x, y) lies on the curve",
      method:"POST", path:"/api/ecc/point/validate",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:["secp256k1","p256","p384"]},
        {key:"x",label:"x coordinate",placeholder:K1_Gx,default:K1_Gx,hint:"pre-filled: secp256k1 G·x"},
        {key:"y",label:"y coordinate",placeholder:K1_Gy,default:K1_Gy},
      ]},
    { id:"point_add",  label:"Point Addition",    icon:"P+Q", desc:"P₁ + P₂ on the curve",
      method:"POST", path:"/api/ecc/point/add",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:["secp256k1","p256","p384"]},
        {key:"x1",label:"P₁ x",placeholder:K1_Gx,default:K1_Gx,hint:"pre-filled: G  →  result = 2G"},
        {key:"y1",label:"P₁ y",placeholder:K1_Gy,default:K1_Gy},
        {key:"x2",label:"P₂ x",placeholder:K1_Gx,default:K1_Gx},
        {key:"y2",label:"P₂ y",placeholder:K1_Gy,default:K1_Gy},
      ]},
    { id:"scalar_mul", label:"Scalar Multiply",   icon:"k·P", desc:"k × P — blank P → use G",
      method:"POST", path:"/api/ecc/scalar_mul",
      fields:[
        {key:"curve",label:"Curve",type:"select",options:["secp256k1","p256","p384"]},
        {key:"k",label:"scalar  k",placeholder:"2",default:"2",hint:"decimal or 0x hex"},
        {key:"x",label:"P x  (blank = G)",placeholder:"leave blank to use G"},
        {key:"y",label:"P y  (blank = G)",placeholder:"leave blank to use G"},
      ]},
  ],
  utils: [
    { id:"is_prime",      label:"Is Prime?",       icon:"ℙ", desc:"Miller-Rabin primality test",
      method:"POST", path:"/api/utils/is_prime",
      fields:[{key:"n",label:"n",placeholder:"0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F",hint:"decimal or 0x hex"}]},
    { id:"next_prime",    label:"Next Prime",      icon:"p+", desc:"Smallest prime ≥ n",
      method:"POST", path:"/api/utils/next_prime",
      fields:[{key:"n",label:"n",placeholder:"100"}]},
    { id:"generate_prime",label:"Generate Prime",  icon:"⚙",  desc:"Random prime of exactly n bits",
      method:"POST", path:"/api/utils/generate_prime",
      fields:[{key:"bits",label:"bit length",placeholder:"256",hint:"2 – 4096"}]},
    { id:"mod_inverse",   label:"Modular Inverse", icon:"a⁻¹",desc:"Inverse of a (mod m)",
      method:"POST", path:"/api/utils/mod_inverse",
      fields:[{key:"a",label:"a",placeholder:"3"},{key:"m",label:"m (modulus)",placeholder:"11"}]},
    { id:"xgcd",          label:"Extended GCD",    icon:"gcd",desc:"gcd(a,b) = a·x + b·y",
      method:"POST", path:"/api/utils/xgcd",
      fields:[{key:"a",label:"a",placeholder:"35"},{key:"b",label:"b",placeholder:"15"}]},
  ],
  dhke: [
    { id:"keypair", label:"Generate Key Pair", icon:"⚿",
      desc:"Generate a fresh DHKE key pair over an RFC 3526 MODP group",
      method:"POST", path:"/api/crypto/dhke/keypair",
      note:"Step 1 — run this twice (Alice and Bob). Share only public_key.value.",
      fields:[
        {key:"bits",label:"Group size (bits)",type:"select",options:["2048","3072","4096"],default:"2048"},
      ]},
    { id:"shared_secret", label:"Compute Shared Secret", icon:"⇌",
      desc:"Compute g^(xy) mod p — both parties arrive at the same value independently",
      method:"POST", path:"/api/crypto/dhke/shared_secret",
      note:"Step 2 — paste your private key fields and the peer's public_key.value.",
      fields:[
        {key:"private_bits",  label:"Group size (bits)", type:"select", options:["2048","3072","4096"], default:"2048"},
        {key:"private_x", label:"Your private_key.x", placeholder:"(decimal from /keypair)"},
        {key:"private_p",     label:"Your private_key.p",     placeholder:"(decimal from /keypair)"},
        {key:"private_g",     label:"Your private_key.g",     placeholder:"2", default:"2"},
        {key:"peer_y", label:"Peer's public_key.y", placeholder:"(decimal from peer's /keypair)"},
      ]},
    { id:"derive_key", label:"Derive Symmetric Key", icon:"⚷",
      desc:"SHA-256 KDF over the shared secret → symmetric key bytes (default: 32 = AES-256)",
      method:"POST", path:"/api/crypto/dhke/derive_key",
      note:"Step 3 — paste the secret from /shared_secret. Both parties get identical output.",
      fields:[
        {key:"secret", label:"Shared secret (decimal)", placeholder:"(decimal from /shared_secret)"},
        {key:"length", label:"Key length (bytes)", placeholder:"32", default:"32", hint:"1 – 64"},
      ]},
  ],
};

const TAB_META = {
  field: { label:"Prime Field", icon:"𝔽", accent:T.amber },
  ecc:   { label:"ECC",         icon:"𝔼", accent:T.cyan  },
  utils: { label:"Utilities",   icon:"∂", accent:T.amber },
  dhke:  { label:"DHKE",        icon:"⇄", accent:T.violet},
};

function truncate(s, n=56) { return s && s.length>n ? s.slice(0,n)+"…" : s; }

function JsonTree({ data }) {
  if (data === null)             return <span style={{color:T.muted}}>null</span>;
  if (typeof data === "boolean") return <span style={{color:data?T.green:T.red}}>{String(data)}</span>;
  if (typeof data === "number")  return <span style={{color:T.amber}}>{data}</span>;
  if (typeof data === "string") {
    const isHex = data.startsWith("0x");
    const isBig = /^\d{10,}$/.test(data);
    return <span style={{color:isHex?T.cyan:isBig?T.amber:T.text}}>
      {isHex||isBig ? truncate(data) : `"${data}"`}
    </span>;
  }
  if (Array.isArray(data)) {
    if (!data.length) return <span style={{color:T.muted}}>[]</span>;
    return <span>{"["}{data.map((v,i)=>(
      <div key={i} style={{paddingLeft:20}}>
        <JsonTree data={v}/>{i<data.length-1&&<span style={{color:T.muted}}>,</span>}
      </div>
    ))}{"]"}</span>;
  }
  if (typeof data === "object") {
    return <span>{"{"}{Object.entries(data).map(([k,v],i,arr)=>(
      <div key={k} style={{paddingLeft:20}}>
        <span style={{color:T.muted,fontStyle:"italic"}}>{k}</span>
        <span style={{color:T.textDim}}>: </span>
        <JsonTree data={v}/>
        {i<arr.length-1&&<span style={{color:T.textDim}}>,</span>}
      </div>
    ))}{"}"}
    </span>;
  }
  return <span>{String(data)}</span>;
}

export default function CryptoExplorer() {
  const [baseUrl, setBaseUrl] = useState(
    import.meta.env.VITE_API_URL ?? "http://localhost:8000"
  );
  const [editingUrl, setEditingUrl] = useState(false);
  const [tab,        setTab]        = useState("field");
  const [opId,       setOpId]       = useState("element");
  const [inputs,     setInputs]     = useState({});
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [history,    setHistory]    = useState([]);
  const resultRef = useRef(null);

  const ops     = OPS[tab];
  const op      = ops.find(o=>o.id===opId) ?? ops[0];
  const tabMeta = TAB_META[tab];

  useEffect(() => {
    const defaults = {};
    (op?.fields ?? []).forEach(f => {
      defaults[f.key] = f.type==="select" ? (f.default ?? f.options[0]) : (f.default ?? "");
    });
    setInputs(defaults); setResult(null); setError(null);
  }, [opId, tab]);

  useEffect(() => { setOpId(OPS[tab][0].id); }, [tab]);

  const call = useCallback(async () => {
    if (!op) return;
    setLoading(true); setResult(null); setError(null);

    // Substitute path params in op.path BEFORE prepending baseUrl
    // (avoids the regex eating the port number e.g. :8000)
    const resolvedPath = op.path.replace(/:(\w+)/g, (_,k) => encodeURIComponent(inputs[k]??""));
    let url  = baseUrl.replace(/\/$/,"") + resolvedPath;
    let body = null;

    if (op.method !== "GET") {
      const raw = {};
      op.fields.forEach(f => { const v=(inputs[f.key]??"").trim(); if(v!=="") raw[f.key]=v; });
      body = JSON.stringify(raw);
    }

    try {
      const res  = await fetch(url, {
        method: op.method,
        headers: op.method!=="GET" ? {"Content-Type":"application/json"} : {},
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(json.detail)
          ? "Validation error:\n" + json.detail.map(e=>`${e.loc?.slice(1).join(".")} — ${e.msg}`).join("\n")
          : (json.detail ?? JSON.stringify(json));
        throw new Error(msg);
      }
      setResult(json);
      setHistory(h => [{op:op.label, result:json, ts:new Date().toLocaleTimeString()}, ...h.slice(0,9)]);
      setTimeout(() => resultRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    } catch(e) {
      setError(e.message.includes("fetch")
        ? `Cannot reach ${baseUrl}\n\nStart the server:\n  uvicorn api.main:app --reload`
        : e.message);
    } finally { setLoading(false); }
  }, [baseUrl, op, inputs]);

  useEffect(() => {
    const h = e => { if((e.ctrlKey||e.metaKey)&&e.key==="Enter") call(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [call]);

  const accent = tabMeta.accent;

  const s = {
    root: { minHeight:"100vh", background:T.bg,
      backgroundImage:`radial-gradient(${T.border}30 1px, transparent 1px)`,
      backgroundSize:"32px 32px", paddingBottom:80 },
    header: { borderBottom:`1px solid ${T.border}`, background:`${T.bgPanel}ee`,
      backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:100,
      padding:"0 28px", display:"flex", alignItems:"center", gap:20, height:56 },
    logo: { fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"0.12em",
      color:T.amber, textShadow:`0 0 16px ${T.amber}60`, animation:"glow 4s ease infinite",
      whiteSpace:"nowrap" },
    badge: { fontSize:10, color:T.muted, background:T.border, borderRadius:3,
      padding:"2px 6px", letterSpacing:"0.1em", fontFamily:"'IBM Plex Mono',monospace" },
    body: { maxWidth:1200, margin:"0 auto", padding:"28px 28px 0",
      display:"grid", gridTemplateColumns:"216px 1fr", gap:20 },
    sidebar: { display:"flex", flexDirection:"column", gap:4 },
    tabBtn: (a, ac) => ({
      width:"100%", padding:"7px 14px", borderRadius:6, cursor:"pointer",
      background: a ? ac : "transparent",
      color: a ? T.bg : T.muted,
      fontSize:12, fontWeight:a?600:400, letterSpacing:"0.05em",
      transition:"all 0.15s", border:"none",
      fontFamily:"'IBM Plex Sans',sans-serif", textAlign:"left" }),
    opBtn: (a, ac) => ({
      display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
      borderRadius:5, cursor:"pointer",
      background: a ? `${ac}15` : "transparent",
      border:`1px solid ${a ? ac+"60" : "transparent"}`,
      color: a ? ac : T.text,
      fontSize:13, transition:"all 0.12s", width:"100%" }),
    opIcon: (a, ac) => ({
      width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center",
      background: a ? ac+"30" : T.border, borderRadius:4,
      fontSize:11, flexShrink:0, color: a ? ac : T.muted,
      fontFamily:"'IBM Plex Mono',monospace" }),
    main: { display:"flex", flexDirection:"column", gap:16 },
    opHeader: { background:T.bgPanel, border:`1px solid ${T.border}`,
      borderRadius:8, padding:"16px 20px",
      display:"flex", alignItems:"center", gap:14 },
    opHeaderIcon: { width:44, height:44, borderRadius:8,
      background:`${accent}15`, border:`1px solid ${accent}60`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:16, color:accent, fontFamily:"'IBM Plex Mono',monospace", flexShrink:0 },
    opPath: { marginLeft:"auto", fontSize:11, color:accent,
      fontFamily:"'IBM Plex Mono',monospace",
      background:`${accent}10`, border:`1px solid ${accent}30`,
      padding:"3px 8px", borderRadius:4, whiteSpace:"nowrap" },
    noteBox: { background:`${accent}08`, border:`1px solid ${accent}25`,
      borderRadius:6, padding:"8px 14px",
      fontSize:11, color:accent, fontFamily:"'IBM Plex Mono',monospace",
      lineHeight:1.6 },
    card: { background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:8, padding:"20px" },
    formGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))",
      gap:16, marginBottom:20 },
    hint: { fontSize:10, color:T.textDim, fontFamily:"'IBM Plex Mono',monospace", marginTop:3 },
    submitBtn: (l) => ({
      padding:"10px 28px", borderRadius:6,
      background: l ? `${accent}60` : accent,
      color:T.bg, fontWeight:600, fontSize:14, border:"none",
      cursor:l?"not-allowed":"pointer", opacity:l?0.7:1, transition:"all 0.15s",
      display:"flex", alignItems:"center", gap:8,
      fontFamily:"'IBM Plex Sans',sans-serif" }),
    dot: (ok) => ({ width:8, height:8, borderRadius:"50%",
      background:ok?T.green:T.red, boxShadow:`0 0 8px ${ok?T.green:T.red}` }),
    errorBox: { background:`${T.red}10`, border:`1px solid ${T.red}40`,
      borderRadius:8, padding:"16px 20px",
      fontFamily:"'IBM Plex Mono',monospace",
      fontSize:13, color:T.red, lineHeight:1.7, whiteSpace:"pre-wrap" },
    empty: { textAlign:"center", padding:"48px 20px",
      color:T.textDim, fontFamily:"'IBM Plex Mono',monospace", fontSize:12, lineHeight:1.8 },
  };

  const renderField = f => (
    <div key={f.key} style={{display:"flex",flexDirection:"column",gap:6}}>
      <label>{f.label}</label>
      {f.type==="select"
        ? <select value={inputs[f.key]??f.options[0]}
            onChange={e=>setInputs(p=>({...p,[f.key]:e.target.value}))}>
            {f.options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input value={inputs[f.key]??""}
            placeholder={f.placeholder}
            onChange={e=>setInputs(p=>({...p,[f.key]:e.target.value}))}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();call();}}}
            spellCheck={false} autoComplete="off"
          />
      }
      {f.hint && <div style={s.hint}>↳ {f.hint}</div>}
    </div>
  );

  return (
    <div style={s.root}>
      <FontLoader/><GlobalStyles/>
      <header style={s.header}>
        <div style={s.logo}>
          CRYPTO<span style={{color:T.cyan}}>_</span>API
          <span style={{...s.badge, marginLeft:8}}>v0.1</span>
        </div>
        {editingUrl
          ? <input autoFocus defaultValue={baseUrl} style={{width:360,fontSize:12,padding:"5px 10px"}}
              onBlur={e=>{setBaseUrl(e.target.value.replace(/\/$/,""));setEditingUrl(false);}}
              onKeyDown={e=>{if(e.key==="Enter"){setBaseUrl(e.target.value.replace(/\/$/,""));setEditingUrl(false);}}}
            />
          : <div style={{display:"flex",alignItems:"center",gap:8,background:T.bgInput,
              border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 10px",
              cursor:"pointer",maxWidth:380,flex:1}}
              onClick={()=>setEditingUrl(true)} title="Click to change API URL">
              <span style={{fontSize:10,color:T.muted,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}}>API</span>
              <span style={{fontSize:12,color:T.cyan,fontFamily:"'IBM Plex Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{baseUrl}</span>
              <div style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`,flexShrink:0}}/>
            </div>
        }
        <div style={{marginLeft:"auto",fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>
          <a href={`${baseUrl}/docs`} target="_blank" rel="noreferrer"
            style={{color:T.cyan,textDecoration:"none"}}>/docs ↗</a>
        </div>
      </header>

      <div style={s.body}>
        <aside style={s.sidebar}>
          {/* Tab switcher */}
          <div style={{background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:8,
            padding:4,marginBottom:8,display:"flex",flexDirection:"column",gap:2}}>
            {Object.entries(TAB_META).map(([id,meta])=>(
              <button key={id} style={s.tabBtn(tab===id, meta.accent)} onClick={()=>setTab(id)}>
                {meta.icon}  {meta.label}
              </button>
            ))}
          </div>
          {/* Op list */}
          {ops.map(o=>(
            <button key={o.id} style={s.opBtn(opId===o.id, accent)} onClick={()=>setOpId(o.id)}>
              <span style={s.opIcon(opId===o.id, accent)}>{o.icon}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </aside>

        <main style={s.main}>
          <div style={s.opHeader}>
            <div style={s.opHeaderIcon}>{op.icon}</div>
            <div>
              <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontSize:16,fontWeight:600,color:T.white,marginBottom:2}}>{op.label}</div>
              <div style={{fontSize:12,color:T.muted,fontFamily:"'IBM Plex Mono',monospace"}}>{op.desc}</div>
            </div>
            <div style={s.opPath}>
              <span style={{color:T.amberDim}}>{op.method} </span>{op.path}
            </div>
          </div>

          {op.note && <div style={s.noteBox}>ℹ  {op.note}</div>}

          <div style={s.card}>
            {op.fields.length>0
              ? <div style={s.formGrid}>{op.fields.map(renderField)}</div>
              : <div style={{...s.hint,fontSize:12,color:T.muted,marginBottom:16}}>No parameters — just execute.</div>
            }
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button style={s.submitBtn(loading)} onClick={call} disabled={loading}>
                {loading ? <><span className="pulse">⬡</span> Computing…</> : <>▶ Execute</>}
              </button>
              <span style={{fontSize:10,color:T.textDim,fontFamily:"'IBM Plex Mono',monospace"}}>⌃ Enter</span>
            </div>
          </div>

          {error && (
            <div style={s.errorBox} className="fade-in">
              <strong style={{color:T.red}}>✕  Error</strong><br/><br/>{error}
            </div>
          )}

          {result!==null && !error && (
            <div style={{background:T.bgResult,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}} className="fade-in" ref={resultRef}>
              <div style={{padding:"10px 18px",background:T.bgPanel,borderBottom:`1px solid ${T.border}`,
                display:"flex",alignItems:"center",gap:10}}>
                <div style={s.dot(true)}/>
                <span style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted,fontFamily:"'IBM Plex Mono',monospace"}}>Response</span>
                <span style={{marginLeft:"auto",fontSize:10,color:T.textDim,fontFamily:"'IBM Plex Mono',monospace"}}>
                  {op.method} {op.path}
                </span>
              </div>
              <div style={{padding:"18px 20px",fontFamily:"'IBM Plex Mono',monospace",fontSize:13,lineHeight:1.8,overflowX:"auto",maxHeight:520}}>
                <JsonTree data={result}/>
              </div>
            </div>
          )}

          {result===null && !error && !loading && (
            <div style={s.empty}>
              <div style={{fontSize:32,marginBottom:12}}>⟨ψ⟩</div>
              <div>Fill in the parameters and press <strong style={{color:accent}}>Execute</strong></div>
              <div style={{marginTop:6}}>or <strong style={{color:T.cyan}}>Ctrl + Enter</strong></div>
            </div>
          )}

          {history.length>0 && (
            <div style={s.card}>
              <div style={{fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",color:T.textDim,marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>Recent calls</div>
              {history.map((h,i)=>(
                <div key={i} onClick={()=>setResult(h.result)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
                    borderBottom:`1px solid ${T.border}`,cursor:"pointer"}}>
                  <div style={s.dot(true)}/>
                  <span style={{fontSize:12,color:T.text,flex:1}}>{h.op}</span>
                  <span style={{fontSize:11,color:T.textDim,fontFamily:"'IBM Plex Mono',monospace"}}>{h.ts}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}