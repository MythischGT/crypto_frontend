import { C, SECTIONS, OPS } from "./data";

export function MethodPill({ method }) {
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

export function Spinner() {
  return (
    <span style={{
      display:"inline-block", width:"0.875rem", height:"0.875rem",
      border:`1.5px solid ${C.borderMid}`, borderTopColor:C.green,
      borderRadius:"50%", animation:"spin 0.7s linear infinite",
      verticalAlign:"middle",
    }}/>
  );
}

export function JsonTree({ data, depth = 0 }) {
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

export function FieldInput({ field, value, onChange }) {
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

export function Sidebar({ section, opId, onSection, onOp }) {
  return (
    <nav className="sidebar-nav">
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