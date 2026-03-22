import { useState, useCallback, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&" +
  "family=Outfit:wght@400;500;600;700&display=swap";

const C = {
  // Backgrounds
  bg:         "#0F1117",
  panel:      "#161B27",
  panelHover: "#1C2333",
  input:      "#1A2030",
  // Borders
  border:     "#252D3D",
  borderMid:  "#2E3A50",
  borderBright:"#3D4F6A",
  // Text
  text:       "#E2E8F4",
  textMid:    "#8896AA",
  textDim:    "#4A5568",
  // Accent — electric indigo
  accent:     "#6366F1",
  accentBright:"#818CF8",
  accentDim:  "#1E1F45",
  accentGlow: "rgba(99,102,241,0.15)",
  // Semantic
  green:      "#34D399",
  greenDim:   "#0D2B20",
  red:        "#F87171",
  redDim:     "#2B0F0F",
  orange:     "#FB923C",
  teal:       "#22D3EE",
  // Sidebar active indicator
  indicator:  "#6366F1",
};

// secp256k1 generator coordinates
const G_X = "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798";
const G_Y = "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8";

const CURVES = ["secp256k1", "p256", "p384"];
const GROUPS = ["modp2048", "modp3072", "modp4096"];

// ─────────────────────────────────────────────────────────────────────────────
// 2. OPERATIONS CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

const OPS = {
  field: [
    {
      id: "element", label: "Create Element",
      desc: "Validate & normalise a value into GF(p)",
      method: "POST", path: "/api/field/element",
      fields: [
        { key: "prime", label: "Prime p",  placeholder: "223",  hint: "decimal or 0x hex" },
        { key: "value", label: "Value a",  placeholder: "192",  hint: "reduced mod p" },
      ],
    },
    {
      id: "add", label: "Add", desc: "a + b mod p",
      method: "POST", path: "/api/field/add",
      fields: [
        { key: "prime", label: "Prime p", placeholder: "223" },
        { key: "a",     label: "a",       placeholder: "192" },
        { key: "b",     label: "b",       placeholder: "105" },
      ],
    },
    {
      id: "sub", label: "Subtract", desc: "a − b mod p",
      method: "POST", path: "/api/field/sub",
      fields: [
        { key: "prime", label: "Prime p", placeholder: "223" },
        { key: "a",     label: "a",       placeholder: "192" },
        { key: "b",     label: "b",       placeholder: "105" },
      ],
    },
    {
      id: "mul", label: "Multiply", desc: "a × b mod p",
      method: "POST", path: "/api/field/mul",
      fields: [
        { key: "prime", label: "Prime p", placeholder: "223" },
        { key: "a",     label: "a",       placeholder: "192" },
        { key: "b",     label: "b",       placeholder: "105" },
      ],
    },
    {
      id: "div", label: "Divide", desc: "a × b⁻¹ mod p",
      method: "POST", path: "/api/field/div",
      fields: [
        { key: "prime", label: "Prime p",     placeholder: "223" },
        { key: "a",     label: "Numerator a", placeholder: "192" },
        { key: "b",     label: "Divisor b",   placeholder: "105" },
      ],
    },
    {
      id: "pow", label: "Power", desc: "base ^ exp mod p",
      method: "POST", path: "/api/field/pow",
      fields: [
        { key: "prime", label: "Prime p",  placeholder: "223" },
        { key: "base",  label: "Base",     placeholder: "192" },
        { key: "exp",   label: "Exponent", placeholder: "3",  hint: "negative → inverse" },
      ],
    },
    {
      id: "inverse", label: "Inverse", desc: "Multiplicative inverse a⁻¹ in GF(p)",
      method: "POST", path: "/api/field/inverse",
      fields: [
        { key: "prime", label: "Prime p", placeholder: "223" },
        { key: "value", label: "a",       placeholder: "192" },
      ],
    },
    {
      id: "neg", label: "Negate", desc: "Additive inverse p − a mod p",
      method: "POST", path: "/api/field/neg",
      fields: [
        { key: "prime", label: "Prime p", placeholder: "223" },
        { key: "value", label: "a",       placeholder: "192" },
      ],
    },
  ],

  ecc: [
    {
      id: "curves", label: "List Curves", desc: "All available named curves",
      method: "GET", path: "/api/ecc/curves", fields: [],
    },
    {
      id: "curve_info", label: "Curve Info", desc: "Parameters for a specific curve",
      method: "GET", path: "/api/ecc/curves/:name",
      fields: [{ key: "name", label: "Curve", type: "select", options: CURVES }],
    },
    {
      id: "generator", label: "Generator Point G", desc: "Base point G coordinates",
      method: "GET", path: "/api/ecc/curves/:name/generator",
      fields: [{ key: "name", label: "Curve", type: "select", options: CURVES }],
    },
    {
      id: "validate", label: "Validate Point", desc: "Check whether (x, y) lies on the curve",
      method: "POST", path: "/api/ecc/point/validate",
      fields: [
        { key: "curve", label: "Curve",        type: "select", options: CURVES },
        { key: "x",     label: "x coordinate", placeholder: G_X, default: G_X, hint: "pre-filled: G·x" },
        { key: "y",     label: "y coordinate", placeholder: G_Y, default: G_Y },
      ],
    },
    {
      id: "point_add", label: "Point Addition", desc: "P₁ + P₂ on the curve",
      method: "POST", path: "/api/ecc/point/add",
      fields: [
        { key: "curve", label: "Curve",  type: "select", options: CURVES },
        { key: "x1",    label: "P₁ x",  placeholder: G_X, default: G_X, hint: "G + G = 2G" },
        { key: "y1",    label: "P₁ y",  placeholder: G_Y, default: G_Y },
        { key: "x2",    label: "P₂ x",  placeholder: G_X, default: G_X },
        { key: "y2",    label: "P₂ y",  placeholder: G_Y, default: G_Y },
      ],
    },
    {
      id: "scalar_mul", label: "Scalar Multiply", desc: "k × P — leave P blank for G",
      method: "POST", path: "/api/ecc/scalar_mul",
      fields: [
        { key: "curve", label: "Curve",          type: "select", options: CURVES },
        { key: "k",     label: "Scalar k",        placeholder: "2", default: "2", hint: "decimal or 0x hex" },
        { key: "x",     label: "P x (optional)", placeholder: "leave blank to use G" },
        { key: "y",     label: "P y (optional)", placeholder: "leave blank to use G" },
      ],
    },
  ],

  utils: [
    {
      id: "is_prime", label: "Is Prime?", desc: "Miller-Rabin primality test",
      method: "POST", path: "/api/utils/is_prime",
      fields: [{ key: "n", label: "n", placeholder: "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", hint: "decimal or 0x hex" }],
    },
    {
      id: "next_prime", label: "Next Prime", desc: "Smallest prime ≥ n",
      method: "POST", path: "/api/utils/next_prime",
      fields: [{ key: "n", label: "n", placeholder: "100" }],
    },
    {
      id: "generate_prime", label: "Generate Prime", desc: "Random prime of exactly n bits",
      method: "POST", path: "/api/utils/generate_prime",
      fields: [{ key: "bits", label: "Bit length", placeholder: "256", hint: "2 – 4096" }],
    },
    {
      id: "mod_inverse", label: "Modular Inverse", desc: "Inverse of a (mod m)",
      method: "POST", path: "/api/utils/mod_inverse",
      fields: [
        { key: "a", label: "a",         placeholder: "3" },
        { key: "m", label: "Modulus m", placeholder: "11" },
      ],
    },
    {
      id: "xgcd", label: "Extended GCD", desc: "gcd(a,b) = a·x + b·y",
      method: "POST", path: "/api/utils/xgcd",
      fields: [
        { key: "a", label: "a", placeholder: "35" },
        { key: "b", label: "b", placeholder: "15" },
      ],
    },
  ],

  dhke: [
    {
      id: "keypair", label: "Generate Key Pair",
      desc: "Fresh DHKE key pair over RFC 3526 MODP group",
      method: "POST", path: "/api/crypto/dhke/keypair",
      note: "Run this twice — once for each party. Keep private_key.x secret, share public_key.y.",
      fields: [{ key: "group", label: "Group", type: "select", options: GROUPS, default: "modp2048" }],
    },
    {
      id: "shared_secret", label: "Shared Secret",
      desc: "g^(xy) mod p — both parties compute the same value",
      method: "POST", path: "/api/crypto/dhke/shared_secret",
      note: "Paste your private key fields and the peer's public_key.y.",
      fields: [
        { key: "private_group", label: "Group",               type: "select", options: GROUPS, default: "modp2048" },
        { key: "private_x",     label: "Your private_key.x",  placeholder: "(from /keypair)" },
        { key: "private_p",     label: "Your private_key.p",  placeholder: "(from /keypair)" },
        { key: "private_g",     label: "Your private_key.g",  placeholder: "2", default: "2" },
        { key: "peer_y",        label: "Peer's public_key.y", placeholder: "(from peer's /keypair)" },
      ],
    },
    {
      id: "derive_key", label: "Derive Key",
      desc: "SHA-256 KDF → symmetric key bytes",
      method: "POST", path: "/api/crypto/dhke/derive_key",
      note: "Both parties run this with the same shared secret to get an identical AES key.",
      fields: [
        { key: "secret",       label: "Shared secret",     placeholder: "(decimal from /shared_secret)" },
        { key: "secret_group", label: "Group",              type: "select", options: GROUPS, default: "modp2048" },
        { key: "length",       label: "Key length (bytes)", placeholder: "32", default: "32", hint: "1 – 64" },
      ],
    },
  ],
};

const SECTIONS = {
  field: { label: "Prime Field", sub: "𝔽ₚ arithmetic" },
  ecc:   { label: "Elliptic Curves", sub: "ECC operations" },
  utils: { label: "Number Theory", sub: "Primes & modular math" },
  dhke:  { label: "Diffie-Hellman", sub: "Key exchange" },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. STYLES
// ─────────────────────────────────────────────────────────────────────────────

const mono = { fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" };

const sx = {
  root: {
    minHeight:     "100%",
    display:       "flex",
    flexDirection: "column",
    color:         C.text,
  },

  // ── Topbar ──
  topbar: {
    height:       56,
    background:   C.panel,
    borderBottom: `1px solid ${C.border}`,
    display:      "flex",
    alignItems:   "center",
    padding:      "0 20px",
    gap:          16,
    position:     "sticky",
    top:          0,
    zIndex:       100,
  },
  logo: {
    fontFamily:    "'Outfit', sans-serif",
    fontWeight:    700,
    fontSize:      16,
    color:         C.text,
    letterSpacing: "-0.01em",
    display:       "flex",
    alignItems:    "center",
    gap:           8,
    whiteSpace:    "nowrap",
  },
  logoPill: {
    ...mono,
    background:    C.accentDim,
    color:         C.accentBright,
    fontSize:      10,
    fontWeight:    500,
    padding:       "2px 8px",
    borderRadius:  99,
    border:        `1px solid ${C.accent}40`,
    letterSpacing: "0.06em",
  },
  urlBar: {
    flex:         1,
    maxWidth:     380,
    height:       34,
    background:   C.input,
    border:       `1px solid ${C.border}`,
    borderRadius: 8,
    display:      "flex",
    alignItems:   "center",
    gap:          8,
    padding:      "0 12px",
    cursor:       "text",
  },
  urlDot: {
    width:        6,
    height:       6,
    borderRadius: "50%",
    background:   C.green,
    boxShadow:    `0 0 6px ${C.green}80`,
    flexShrink:   0,
  },
  urlText: {
    ...mono,
    fontSize:     12,
    color:        C.textMid,
    overflow:     "hidden",
    textOverflow: "ellipsis",
    whiteSpace:   "nowrap",
  },
  docsLink: {
    marginLeft:     "auto",
    ...mono,
    fontSize:       12,
    color:          C.textMid,
    textDecoration: "none",
    padding:        "4px 10px",
    borderRadius:   6,
    border:         `1px solid ${C.border}`,
    transition:     "border-color 0.15s, color 0.15s",
  },

  // ── Body ──
  body: {
    display: "flex",
    flex:    1,
  },

  // ── Sidebar ──
  // Outer column stretches full page height so the panel background
  // never ends mid-scroll. Inner nav is sticky inside it.
  sidebarCol: {
    width:       232,
    flexShrink:  0,
    background:  C.panel,
    borderRight: `1px solid ${C.border}`,
  },
  sidebar: {
    padding:     "20px 12px",
    position:    "sticky",
    top:         56,
    height:      "calc(100vh - 56px)",
    overflowY:   "auto",
    display:     "flex",
    flexDirection: "column",
    gap:         4,
  },
  sectionBtn: (active) => ({
    width:        "100%",
    textAlign:    "left",
    padding:      "8px 10px",
    borderRadius: 8,
    border:       "none",
    background:   active ? C.accentGlow : "transparent",
    cursor:       "pointer",
    transition:   "background 0.15s",
    marginBottom: 2,
  }),
  sectionBtnLabel: (active) => ({
    fontFamily:  "'Outfit', sans-serif",
    fontSize:    13,
    fontWeight:  active ? 600 : 500,
    color:       active ? C.accentBright : C.textMid,
    display:     "block",
    marginBottom: 1,
  }),
  sectionBtnSub: {
    ...mono,
    fontSize: 10,
    color:    C.textDim,
    display:  "block",
  },
  opBtn: (active) => ({
    width:        "100%",
    textAlign:    "left",
    padding:      "6px 10px 6px 22px",
    borderRadius: 6,
    border:       "none",
    background:   active ? C.input : "transparent",
    cursor:       "pointer",
    display:      "flex",
    alignItems:   "center",
    gap:          8,
    transition:   "background 0.1s",
    marginBottom: 1,
  }),
  opBtnBar: (active) => ({
    width:        2,
    height:       12,
    borderRadius: 1,
    flexShrink:   0,
    background:   active ? C.accent : "transparent",
    transition:   "background 0.1s",
  }),
  opBtnLabel: (active) => ({
    fontFamily: "'Outfit', sans-serif",
    fontSize:   12.5,
    fontWeight: active ? 500 : 400,
    color:      active ? C.text : C.textMid,
  }),

  // ── Main ──
  main: {
    flex:       1,
    minWidth:   0,
    padding:    "32px 36px",
  },
  mainInner: {
    maxWidth: 820,
  },

  // ── Op header ──
  opHeader: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: `1px solid ${C.border}`,
  },
  opTagRow: {
    display:      "flex",
    alignItems:   "center",
    gap:          8,
    marginBottom: 10,
  },
  opPath: {
    ...mono,
    fontSize:     12,
    color:        C.textDim,
    background:   C.input,
    padding:      "3px 10px",
    borderRadius: 6,
    border:       `1px solid ${C.border}`,
  },
  opTitle: {
    fontFamily:    "'Outfit', sans-serif",
    fontWeight:    700,
    fontSize:      26,
    letterSpacing: "-0.03em",
    color:         C.text,
    marginBottom:  6,
  },
  opDesc: {
    fontSize: 13.5,
    color:    C.textMid,
    ...mono,
  },

  // ── Note ──
  note: {
    background:   C.accentDim,
    border:       `1px solid ${C.accent}40`,
    borderLeft:   `3px solid ${C.accent}`,
    borderRadius: "0 8px 8px 0",
    padding:      "10px 14px",
    fontSize:     12.5,
    color:        C.accentBright,
    marginBottom: 20,
    ...mono,
  },

  // ── Form card ──
  formCard: {
    background:   C.panel,
    border:       `1px solid ${C.border}`,
    borderRadius: 12,
    padding:      "20px",
    marginBottom: 16,
  },
  formGrid: {
    display:             "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap:                 16,
    marginBottom:        20,
  },
  fieldHint: {
    ...mono,
    fontSize:  10.5,
    color:     C.textDim,
    marginTop: 5,
  },
  runRow: {
    display:    "flex",
    alignItems: "center",
    gap:        12,
  },
  runBtn: (loading) => ({
    height:       36,
    padding:      "0 22px",
    background:   loading ? C.accentDim : C.accent,
    color:        "#fff",
    fontFamily:   "'Outfit', sans-serif",
    fontWeight:   600,
    fontSize:     13.5,
    borderRadius: 8,
    border:       "none",
    display:      "flex",
    alignItems:   "center",
    gap:          8,
    cursor:       loading ? "not-allowed" : "pointer",
    transition:   "background 0.15s, box-shadow 0.15s",
    boxShadow:    loading ? "none" : `0 0 16px ${C.accent}40`,
  }),
  shortcut: {
    ...mono,
    fontSize: 11,
    color:    C.textDim,
  },

  // ── Result / Error ──
  resultCard: {
    background:   C.panel,
    border:       `1px solid ${C.border}`,
    borderRadius: 12,
    overflow:     "hidden",
    marginBottom: 16,
  },
  resultHeader: {
    padding:      "10px 16px",
    borderBottom: `1px solid ${C.border}`,
    background:   C.input,
    display:      "flex",
    alignItems:   "center",
    gap:          10,
  },
  resultDot: {
    width:        7,
    height:       7,
    borderRadius: "50%",
    background:   C.green,
    boxShadow:    `0 0 8px ${C.green}`,
    flexShrink:   0,
  },
  resultLabel: {
    ...mono,
    fontSize:      11,
    fontWeight:    500,
    color:         C.textMid,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  resultMeta: {
    ...mono,
    marginLeft: "auto",
    fontSize:   11,
    color:      C.textDim,
  },
  resultBody: {
    ...mono,
    padding:    "18px 20px",
    fontSize:   12.5,
    lineHeight: 1.9,
    overflowY:  "auto",
    overflowX:  "hidden",
    maxHeight:  560,
  },
  errorCard: {
    background:   C.redDim,
    border:       `1px solid ${C.red}40`,
    borderLeft:   `3px solid ${C.red}`,
    borderRadius: "0 10px 10px 0",
    padding:      "14px 16px",
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily:   "'Outfit', sans-serif",
    fontWeight:   600,
    color:        C.red,
    marginBottom: 8,
    fontSize:     13,
  },
  errorBody: {
    ...mono,
    fontSize:   12,
    color:      `${C.red}CC`,
    whiteSpace: "pre-wrap",
    margin:     0,
  },

  // ── Empty state ──
  empty: {
    textAlign: "center",
    padding:   "64px 20px",
  },
  emptyIcon: {
    width:          56,
    height:         56,
    borderRadius:   14,
    border:         `1.5px dashed ${C.borderMid}`,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    margin:         "0 auto 16px",
    fontSize:       22,
    color:          C.textDim,
    background:     C.panel,
  },
  emptyTitle: {
    fontFamily:    "'Outfit', sans-serif",
    fontWeight:    600,
    fontSize:      15,
    color:         C.textMid,
    marginBottom:  6,
  },
  emptyBody: {
    fontSize: 13,
    color:    C.textDim,
    ...mono,
  },

  // ── History ──
  historyCard: {
    background:   C.panel,
    border:       `1px solid ${C.border}`,
    borderRadius: 12,
    overflow:     "hidden",
  },
  historyHeader: {
    ...mono,
    padding:       "10px 16px",
    borderBottom:  `1px solid ${C.border}`,
    background:    C.input,
    fontSize:      10.5,
    fontWeight:    500,
    color:         C.textDim,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  historyRow: (last) => ({
    display:      "flex",
    alignItems:   "center",
    gap:          10,
    padding:      "10px 16px",
    cursor:       "pointer",
    borderBottom: last ? "none" : `1px solid ${C.border}`,
    transition:   "background 0.1s",
  }),
  historyLabel: {
    fontFamily: "'Outfit', sans-serif",
    fontSize:   13,
    fontWeight: 500,
    color:      C.text,
    flex:       1,
  },
  historyTime: {
    ...mono,
    fontSize: 11,
    color:    C.textDim,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  const isGet = method === "GET";
  return (
    <span style={{
      ...mono,
      fontSize:      10,
      fontWeight:    500,
      letterSpacing: "0.08em",
      padding:       "2px 8px",
      borderRadius:  4,
      background:    isGet ? C.greenDim   : C.accentDim,
      color:         isGet ? C.green      : C.accentBright,
      border:        `1px solid ${isGet ? C.green + "40" : C.accent + "40"}`,
      whiteSpace:    "nowrap",
    }}>
      {method}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{
      display:        "inline-block",
      width:          13,
      height:         13,
      border:         `2px solid ${C.accent}40`,
      borderTopColor: "#fff",
      borderRadius:   "50%",
      animation:      "spin 0.65s linear infinite",
    }} />
  );
}

// No truncation — display every character of long numbers.
// Hex values get word-break so they wrap cleanly inside the panel.
function JsonValue({ data, depth = 0 }) {
  if (data === null)              return <span style={{ color: C.textDim }}>null</span>;
  if (typeof data === "boolean")  return <span style={{ color: data ? C.green : C.red, fontWeight: 500 }}>{String(data)}</span>;
  if (typeof data === "number")   return <span style={{ color: C.orange }}>{data}</span>;

  if (typeof data === "string") {
    const isHex = data.startsWith("0x");
    const isBig = /^\d{10,}$/.test(data);
    // Large integers and hex values get their own scrollable block so they
    // don't explode the layout. The full value is always visible — just scroll.
    if (isHex || isBig) {
      const color = isHex ? C.teal : C.orange;
      const isLong = data.length > 64;
      return (
        <span style={{
          display:       isLong ? "block"  : "inline",
          overflowX:     isLong ? "auto"   : "visible",
          overflowY:     "hidden",
          maxWidth:      isLong ? "100%"   : undefined,
          background:    isLong ? C.input  : "transparent",
          border:        isLong ? `1px solid ${C.border}` : "none",
          borderRadius:  isLong ? 6        : 0,
          padding:       isLong ? "6px 10px" : 0,
          marginTop:     isLong ? 4        : 0,
          whiteSpace:    "nowrap",
          color,
          fontSize:      isLong ? 11.5    : undefined,
        }}>
          {data}
        </span>
      );
    }
    return <span style={{ color: C.green }}>"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (!data.length) return <span style={{ color: C.textDim }}>[]</span>;
    return (
      <span>
        <span style={{ color: C.textDim }}>{"["}</span>
        {data.map((v, i) => (
          <div key={i} style={{ paddingLeft: 20 }}>
            <JsonValue data={v} depth={depth + 1} />
            {i < data.length - 1 && <span style={{ color: C.textDim }}>,</span>}
          </div>
        ))}
        <span style={{ color: C.textDim }}>{"]"}</span>
      </span>
    );
  }

  if (typeof data === "object") {
    return (
      <span>
        {Object.entries(data).map(([k, v], i, arr) => (
          <div key={k} style={{ paddingLeft: depth === 0 ? 0 : 20 }}>
            <span style={{ color: C.accentBright }}>{k}</span>
            <span style={{ color: C.textDim }}>: </span>
            <JsonValue data={v} depth={depth + 1} />
            {i < arr.length - 1 && <span style={{ color: C.textDim }}>,</span>}
          </div>
        ))}
      </span>
    );
  }

  return <span style={{ color: C.text }}>{String(data)}</span>;
}

function FieldInput({ field, value, onChange }) {
  const { key, label, type, options, placeholder, hint } = field;
  return (
    <div>
      <label>{label}</label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(key, e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(key, e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      )}
      {hint && <div style={sx.fieldHint}>{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FEATURE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({ section, opId, onSection, onOp }) {
  return (
    <nav style={sx.sidebar}>
      {Object.entries(SECTIONS).map(([id, meta]) => {
        const isActiveSection = section === id;
        return (
          <div key={id}>
            <button style={sx.sectionBtn(isActiveSection)} onClick={() => onSection(id)}>
              <span style={sx.sectionBtnLabel(isActiveSection)}>{meta.label}</span>
              <span style={sx.sectionBtnSub}>{meta.sub}</span>
            </button>

            {isActiveSection && OPS[id].map(op => {
              const isActiveOp = opId === op.id;
              return (
                <button key={op.id} style={sx.opBtn(isActiveOp)} onClick={() => onOp(op.id)}>
                  <span style={sx.opBtnBar(isActiveOp)} />
                  <span style={sx.opBtnLabel(isActiveOp)}>{op.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function OpForm({ op, inputs, onChange, onSubmit, loading }) {
  return (
    <div style={sx.formCard}>
      {op.fields.length > 0 ? (
        <div style={sx.formGrid}>
          {op.fields.map(f => (
            <FieldInput key={f.key} field={f} value={inputs[f.key] ?? ""} onChange={onChange} />
          ))}
        </div>
      ) : (
        <p style={{ ...mono, fontSize: 13, color: C.textDim, marginBottom: 16 }}>
          No parameters — just send the request.
        </p>
      )}
      <div style={sx.runRow}>
        <button style={sx.runBtn(loading)} onClick={onSubmit} disabled={loading}>
          {loading ? <><Spinner /> Running…</> : "Run"}
        </button>
        <span style={sx.shortcut}>⌃ Enter</span>
      </div>
    </div>
  );
}

function ResultPanel({ result, op, resultRef }) {
  return (
    <div className="fade-up" ref={resultRef} style={sx.resultCard}>
      <div style={sx.resultHeader}>
        <span style={sx.resultDot} />
        <span style={sx.resultLabel}>Response</span>
        <span style={sx.resultMeta}>200 OK · {op.method} {op.path}</span>
      </div>
      <div style={sx.resultBody}>
        <JsonValue data={result} />
      </div>
    </div>
  );
}

function ErrorPanel({ error }) {
  return (
    <div className="fade-up" style={sx.errorCard}>
      <div style={sx.errorTitle}>Error</div>
      <pre style={sx.errorBody}>{error}</pre>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={sx.empty}>
      <div style={sx.emptyIcon}>λ</div>
      <div style={sx.emptyTitle}>Ready to execute</div>
      <p style={sx.emptyBody}>
        Configure the parameters above and press{" "}
        <span style={{ color: C.accentBright }}>Run</span>
      </p>
    </div>
  );
}

function HistoryPanel({ history, onSelect }) {
  return (
    <div style={sx.historyCard}>
      <div style={sx.historyHeader}>History</div>
      {history.map((h, i) => (
        <div key={i}
          style={sx.historyRow(i === history.length - 1)}
          onClick={() => onSelect(h.result)}
          onMouseEnter={e => e.currentTarget.style.background = C.panelHover}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <MethodBadge method={h.method} />
          <span style={sx.historyLabel}>{h.label}</span>
          <span style={sx.historyTime}>{h.ts}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildRequestInputs(fields) {
  return Object.fromEntries(
    fields.map(f => [
      f.key,
      f.type === "select" ? (f.default ?? f.options[0]) : (f.default ?? ""),
    ])
  );
}

function resolveUrl(baseUrl, op, inputs) {
  // Resolve :param tokens in path BEFORE prepending baseUrl —
  // otherwise the regex consumes the port number (e.g. :8000).
  const path = op.path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(inputs[k] ?? ""));
  return baseUrl.replace(/\/$/, "") + path;
}

function buildBody(op, inputs) {
  if (op.method === "GET") return null;
  const raw = {};
  op.fields.forEach(f => {
    const v = (inputs[f.key] ?? "").trim();
    if (v) raw[f.key] = v;
  });
  return JSON.stringify(raw);
}

function parseApiError(json) {
  if (Array.isArray(json.detail))
    return json.detail.map(e => `${e.loc?.slice(1).join(".")} — ${e.msg}`).join("\n");
  return json.detail ?? JSON.stringify(json);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ROOT
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
    setResult(null);
    setError(null);
  }, [opId, section]);

  useEffect(() => { setOpId(OPS[section][0].id); }, [section]);

  const call = useCallback(async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch(resolveUrl(baseUrl, op, inputs), {
        method:  op.method,
        headers: op.method !== "GET" ? { "Content-Type": "application/json" } : {},
        body:    buildBody(op, inputs),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(parseApiError(json));
      setResult(json);
      setHistory(h => [
        { label: op.label, method: op.method, result: json, ts: new Date().toLocaleTimeString() },
        ...h.slice(0, 7),
      ]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (e) {
      setError(e.message.includes("fetch")
        ? `Could not connect to ${baseUrl}\n\nMake sure the server is running:\nuvicorn main:app --reload`
        : e.message,
      );
    } finally { setLoading(false); }
  }, [baseUrl, op, inputs]);

  const handleFieldChange = useCallback((key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    const h = e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") call(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [call]);

  return (
    <div style={sx.root}>
      <style>{`
        @import url('${FONTS_URL}');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body { height:100%; background:${C.bg}; scrollbar-gutter: stable; }
        body {
          background:${C.bg}; color:${C.text};
          font-family:'Outfit', sans-serif;
          font-size:14px; line-height:1.5;
          -webkit-font-smoothing:antialiased;
        }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.borderMid}; border-radius:99px; }
        input, select {
          font-family:'Geist Mono','JetBrains Mono',monospace;
          font-size:12.5px; background:${C.input};
          border:1px solid ${C.border}; color:${C.text};
          border-radius:8px; padding:9px 12px; width:100%;
          outline:none; appearance:none;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        input:focus, select:focus {
          border-color:${C.accent};
          box-shadow:0 0 0 3px ${C.accentGlow};
        }
        input::placeholder { color:${C.textDim}; }
        select {
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5568' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat:no-repeat;
          background-position:right 12px center;
          padding-right:32px; cursor:pointer;
        }
        label {
          font-family:'Outfit',sans-serif; font-size:11px; font-weight:600;
          letter-spacing:0.06em; text-transform:uppercase;
          color:${C.textDim}; margin-bottom:6px; display:block;
        }
        button { cursor:pointer; border:none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .fade-up { animation:fadeUp 0.18s ease both; }
        a.docs-link:hover { color:${C.text} !important; border-color:${C.borderMid} !important; }
      `}</style>

      {/* Top bar */}
      <header style={sx.topbar}>
        <div style={sx.logo}>
          crypto
          <span style={sx.logoPill}>API</span>
        </div>

        {editingUrl ? (
          <input autoFocus defaultValue={baseUrl}
            style={{ flex: 1, maxWidth: 380, height: 34, fontSize: 12, padding: "0 12px" }}
            onBlur={e  => { setBaseUrl(e.target.value.replace(/\/$/, "")); setEditingUrl(false); }}
            onKeyDown={e => { if (e.key === "Enter") { setBaseUrl(e.target.value.replace(/\/$/, "")); setEditingUrl(false); } }}
          />
        ) : (
          <div style={sx.urlBar} onClick={() => setEditingUrl(true)} title="Click to edit">
            <span style={sx.urlDot} />
            <span style={sx.urlText}>{baseUrl}</span>
          </div>
        )}

        <a href={`${baseUrl}/docs`} target="_blank" rel="noreferrer"
          className="docs-link" style={sx.docsLink}>
          /docs ↗
        </a>
      </header>

      {/* Body */}
      <div style={sx.body}>
        <div style={sx.sidebarCol}>
          <Sidebar section={section} opId={opId} onSection={setSection} onOp={setOpId} />
        </div>

        <main style={sx.main}>
          <div style={sx.mainInner}>
          <div style={sx.opHeader}>
            <div style={sx.opTagRow}>
              <MethodBadge method={op.method} />
              <code style={sx.opPath}>{op.path}</code>
            </div>
            <h1 style={sx.opTitle}>{op.label}</h1>
            <p style={sx.opDesc}>{op.desc}</p>
          </div>

          {op.note && <div style={sx.note}>{op.note}</div>}

          <OpForm op={op} inputs={inputs} onChange={handleFieldChange} onSubmit={call} loading={loading} />

          {error && <ErrorPanel error={error} />}

          {result !== null && !error && <ResultPanel result={result} op={op} resultRef={resultRef} />}

          {result === null && !error && !loading && <EmptyState />}

          {history.length > 0 && <HistoryPanel history={history} onSelect={setResult} />}
          </div>
        </main>
      </div>
    </div>
  );
}