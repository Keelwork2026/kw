import type { ArtKind, Palette } from "@/lib/sites/types";

/**
 * Original, art-directed illustrations for website templates. Every scene is
 * drawn from the site's palette, with a seed for variation, so a restaurant
 * looks like a restaurant and two templates never share the same picture.
 * Pure SVG: crisp at any size, no downloads, no licensing questions.
 */
export function Art({ kind, palette, seed = 1, alt, className = "" }: { kind: ArtKind; palette: Palette; seed?: number; alt: string; className?: string }) {
  const id = `a${kind.replace(/[^a-z]/g, "")}${seed}`;
  const r = rng(seed * 9973 + kind.length * 131);
  const p = palette;
  return (
    <svg viewBox="0 0 480 360" role="img" aria-label={alt} className={className} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.soft} /><stop offset="1" stopColor={mix(p.soft, p.accent2, 0.35)} /></linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mix(p.accent2, "#ffffff", 0.45)} /><stop offset="1" stopColor={mix(p.accent, "#ffffff", 0.55)} /></linearGradient>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.accent} /><stop offset="1" stopColor={p.accent2} /></linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.4" r="0.6"><stop offset="0" stopColor="#ffffff" stopOpacity="0.7" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-dots`} width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.9" fill={p.ink} opacity="0.07" /></pattern>
        <pattern id={`${id}-grain`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke={p.ink} strokeOpacity="0.05" /></pattern>
      </defs>
      {SCENES[kind]({ p, r, id })}
      <rect width="480" height="360" fill={`url(#${id}-dots)`} />
    </svg>
  );
}

type Ctx = { p: Palette; r: () => number; id: string };

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function hex(c: string) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const h = (x: number) => Math.round(x).toString(16).padStart(2, "0");
  return `#${h(r1! + (r2! - r1!) * t)}${h(g1! + (g2! - g1!) * t)}${h(b1! + (b2! - b1!) * t)}`;
}
const BG = ({ id }: { id: string }) => <rect width="480" height="360" fill={`url(#${id}-bg)`} />;
const Sky = ({ id }: { id: string }) => <rect width="480" height="360" fill={`url(#${id}-sky)`} />;
const Sun = ({ p, x = 360, y = 90, rr = 46 }: { p: Palette; x?: number; y?: number; rr?: number }) => <g><circle cx={x} cy={y} r={rr * 1.6} fill="#fff" opacity="0.25" /><circle cx={x} cy={y} r={rr} fill={mix(p.accent2, "#ffffff", 0.25)} /></g>;
const Leaf = ({ x, y, s, c, rot }: { x: number; y: number; s: number; c: string; rot: number }) => <path d={`M0 0 C ${s * 0.6} ${-s * 0.4} ${s} ${-s * 0.2} ${s * 1.2} 0 C ${s} ${s * 0.2} ${s * 0.6} ${s * 0.4} 0 0 Z`} fill={c} transform={`translate(${x} ${y}) rotate(${rot})`} />;
const Person = ({ x, y, s = 1, c, skin, hair }: { x: number; y: number; s?: number; c: string; skin: string; hair: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-34 70 C-34 30 -18 18 0 18 C18 18 34 30 34 70 Z" fill={c} />
    <circle cx="0" cy="0" r="17" fill={skin} />
    <path d="M-17 -2 C-17 -20 17 -20 17 -2 C12 -10 -8 -12 -17 -2 Z" fill={hair} />
  </g>
);
const SKINS = ["#f2c7a5", "#d9a07a", "#a86b4c", "#7a4b34", "#e8b897", "#5c3a28"];
const HAIR = ["#2b1d16", "#4a2f22", "#151515", "#7a5232", "#c9a46a"];
const Window = ({ x, y, w, h, p, lit }: { x: number; y: number; w: number; h: number; p: Palette; lit: boolean }) => <rect x={x} y={y} width={w} height={h} rx="1.5" fill={lit ? mix(p.accent2, "#fff", 0.35) : mix(p.ink, p.surface, 0.55)} />;

const SCENES: Record<ArtKind, (c: Ctx) => React.ReactNode> = {
  /* ---------------- food & hospitality ---------------- */
  dish: ({ p, r, id }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.ink, p.accent, 0.12)} />
      <rect width="480" height="360" fill={`url(#${id}-grain)`} />
      <ellipse cx="250" cy="196" rx="170" ry="150" fill="#000" opacity="0.18" />
      <circle cx="240" cy="180" r="150" fill={p.surface} />
      <circle cx="240" cy="180" r="118" fill={mix(p.surface, p.soft, 0.6)} />
      {/* main: seared fillet, greens, sauce */}
      <path d="M170 200 C190 150 290 140 320 175 C330 200 290 225 240 222 C205 220 172 218 170 200 Z" fill={mix(p.accent2, "#ffffff", 0.2)} />
      <path d="M180 196 C200 165 280 158 306 182" stroke={mix(p.accent, p.ink, 0.25)} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M150 230 C210 260 280 255 330 222" stroke={p.accent} strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.7" />
      {Array.from({ length: 9 }, (_, i) => <Leaf key={i} x={190 + r() * 120} y={140 + r() * 30} s={14 + r() * 10} c={mix("#3f7d3a", p.accent2, r() * 0.25)} rot={r() * 360} />)}
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={200 + r() * 100} cy={225 + r() * 20} r={4 + r() * 3} fill={i % 2 ? "#e2603f" : "#f2c14e"} />)}
      <rect x="40" y="40" width="10" height="170" rx="5" fill={mix(p.surface, p.ink, 0.15)} transform="rotate(-18 45 125)" />
      <path d="M420 200 l10 -150" stroke={mix(p.surface, p.ink, 0.15)} strokeWidth="9" strokeLinecap="round" />
      <circle cx="80" cy="300" r="40" fill={p.surface} opacity="0.9" /><circle cx="80" cy="300" r="28" fill={mix(p.accent2, "#fff", 0.5)} />
    </g>
  ),
  drinks: ({ p, r, id }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.ink, p.accent, 0.2)} />
      <circle cx="380" cy="80" r="140" fill={`url(#${id}-glow)`} />
      <rect x="0" y="270" width="480" height="90" fill={mix(p.ink, "#000", 0.2)} />
      {[90, 210, 330].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 34} 120 L${x + 34} 120 L${x + 26} 250 Q${x} 262 ${x - 26} 250 Z`} fill="#fff" opacity="0.18" />
          <path d={`M${x - 30} ${150 + i * 8} L${x + 30} ${150 + i * 8} L${x + 25} 248 Q${x} 258 ${x - 25} 248 Z`} fill={[p.accent, p.accent2, mix(p.accent, "#f2c14e", 0.5)][i]} opacity="0.88" />
          <circle cx={x + 22} cy={140 + i * 8} r="14" fill={i === 1 ? "#f2c14e" : "#7dbb5a"} />
          <rect x={x + 8} y={90} width="5" height="80" rx="2" fill={mix(p.surface, p.accent2, 0.3)} transform={`rotate(14 ${x + 10} 130)`} />
          {Array.from({ length: 4 }, (_, k) => <circle key={k} cx={x - 15 + r() * 30} cy={190 + r() * 50} r={2 + r() * 2} fill="#fff" opacity="0.6" />)}
        </g>
      ))}
    </g>
  ),
  "dining-room": ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.ink, p.accent2, 0.25)} />
      <rect x="0" y="230" width="480" height="130" fill={mix(p.ink, "#000", 0.15)} />
      {[60, 180, 300, 420].map((x) => <g key={x}><line x1={x} y1="0" x2={x} y2="70" stroke={p.soft} strokeOpacity="0.5" /><path d={`M${x - 22} 92 Q${x} 62 ${x + 22} 92 Z`} fill={mix(p.accent2, "#fff", 0.2)} /><ellipse cx={x} cy="96" rx="40" ry="16" fill="#ffd89a" opacity="0.18" /></g>)}
      <rect x="30" y="110" width="140" height="100" rx="4" fill={mix(p.ink, p.accent, 0.35)} />
      <rect x="310" y="110" width="140" height="100" rx="4" fill={mix(p.ink, p.accent, 0.35)} />
      <path d="M40 200 Q100 130 160 200 Z" fill={mix("#3f7d3a", p.ink, 0.3)} /><path d="M320 200 Q380 140 440 200 Z" fill={mix("#3f7d3a", p.ink, 0.3)} />
      {[120, 360].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="262" rx="90" ry="20" fill={p.surface} />
          <rect x={x - 6} y="262" width="12" height="70" fill={mix(p.ink, "#000", 0.3)} />
          <circle cx={x - 40} cy="255" r="10" fill={mix(p.soft, "#fff", 0.4)} /><circle cx={x + 40} cy="255" r="10" fill={mix(p.soft, "#fff", 0.4)} />
          <rect x={x - 3} y="226" width="6" height="26" rx="3" fill="#ffe7b3" /><ellipse cx={x} cy="224" rx="5" ry="8" fill="#ffd36e" opacity={0.6 + r() * 0.4} />
          <path d={`M${x - 100} 330 q10 -60 30 -70 l6 70 Z`} fill={mix(p.accent, p.ink, 0.4)} /><path d={`M${x + 100} 330 q-10 -60 -30 -70 l-6 70 Z`} fill={mix(p.accent, p.ink, 0.4)} />
        </g>
      ))}
    </g>
  ),
  chef: ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.accent2, 0.3)} />
      <rect x="0" y="0" width="480" height="140" fill={mix(p.surface, p.soft, 0.4)} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 40} y="0" width="38" height="20" fill={mix(p.surface, p.ink, 0.06)} />)}
      {[70, 130, 190].map((x, i) => <g key={x}><line x1={x} y1="30" x2={x} y2="70" stroke={p.ink} strokeOpacity="0.4" strokeWidth="2" /><circle cx={x} cy={84} r={14 + i * 3} fill="none" stroke={mix(p.ink, p.surface, 0.3)} strokeWidth="5" /></g>)}
      <rect x="0" y="250" width="480" height="110" fill={mix(p.ink, p.surface, 0.75)} />
      <g transform="translate(300 120)">
        <path d="M-70 200 C-70 110 -40 90 0 90 C40 90 70 110 70 200 Z" fill="#ffffff" />
        <circle cx="0" cy="58" r="30" fill={SKINS[Math.floor(r() * SKINS.length)]} />
        <path d="M-30 30 C-40 -10 -10 -20 0 -8 C10 -22 44 -10 30 30 Z" fill="#ffffff" stroke={mix(p.ink, "#fff", 0.8)} />
        <path d="M-20 120 L20 120 L16 200 L-16 200 Z" fill={p.accent} opacity="0.9" />
      </g>
      <ellipse cx="160" cy="250" rx="70" ry="14" fill={mix(p.ink, "#000", 0.2)} opacity="0.4" />
      <path d="M100 246 Q160 300 220 246 Z" fill={mix(p.ink, p.surface, 0.4)} />
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${130 + i * 14} 230 q6 -16 0 -32`} stroke="#fff" strokeOpacity="0.6" strokeWidth="3" fill="none" />)}
    </g>
  ),

  /* ---------------- property & places ---------------- */
  house: ({ p, r, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={380} y={80} />
      <path d="M0 250 Q120 210 240 240 T480 230 V360 H0 Z" fill={mix("#6fae6a", p.accent2, 0.15)} />
      <rect x="110" y="140" width="250" height="140" fill={p.surface} />
      <path d="M90 150 L235 70 L380 150 Z" fill={mix(p.ink, p.accent, 0.25)} />
      <rect x="290" y="80" width="26" height="50" fill={mix(p.ink, p.accent, 0.35)} />
      <rect x="210" y="200" width="50" height="80" fill={p.accent} /><circle cx="250" cy="242" r="3" fill={p.soft} />
      {[[135, 175], [290, 175], [135, 225], [290, 225]].map(([x, y]) => <g key={`${x}${y}`}><rect x={x} y={y} width="48" height="36" fill={mix(p.accent2, "#fff", 0.55)} /><path d={`M${x + 24} ${y}v36M${x} ${y + 18}h48`} stroke={p.surface} strokeWidth="3" /></g>)}
      {Array.from({ length: 3 }, (_, i) => <g key={i}><circle cx={40 + i * 26} cy={240 - r() * 20} r={30 + r() * 12} fill={mix("#3f7d3a", p.ink, 0.15 + r() * 0.15)} /></g>)}
      <circle cx="430" cy="236" r="34" fill={mix("#3f7d3a", p.ink, 0.2)} />
      <path d="M220 280 Q200 330 160 360 L330 360 Q280 330 260 280 Z" fill={mix(p.soft, p.surface, 0.5)} />
    </g>
  ),
  apartment: ({ p, r, id }) => (
    <g>
      <Sky id={id} />
      <rect x="40" y="70" width="170" height="290" fill={mix(p.ink, p.accent2, 0.15)} />
      <rect x="230" y="30" width="200" height="330" fill={p.surface} />
      {Array.from({ length: 8 }, (_, row) => Array.from({ length: 4 }, (_, col) => <g key={`${row}-${col}`}><rect x={244 + col * 46} y={46 + row * 38} width="36" height="26" fill={mix(p.accent2, "#fff", r() > 0.6 ? 0.2 : 0.65)} /><rect x={244 + col * 46} y={72 + row * 38} width="36" height="4" fill={mix(p.ink, p.surface, 0.7)} /></g>))}
      {Array.from({ length: 9 }, (_, row) => Array.from({ length: 3 }, (_, col) => <Window key={`${row}${col}`} x={56 + col * 50} y={86 + row * 30} w={36} h={18} p={p} lit={r() > 0.55} />))}
      <rect x="0" y="330" width="480" height="30" fill={mix(p.ink, "#000", 0.1)} />
      {[20, 450].map((x) => <circle key={x} cx={x} cy="320" r="30" fill={mix("#3f7d3a", p.ink, 0.2)} />)}
    </g>
  ),
  "living-room": ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.3)} />
      <rect x="0" y="260" width="480" height="100" fill={mix(p.accent2, p.surface, 0.55)} />
      <rect x="300" y="40" width="140" height="170" rx="4" fill={mix(p.accent2, "#fff", 0.6)} stroke={p.surface} strokeWidth="8" />
      <path d="M300 160 L340 120 L380 150 L440 100 V210 H300 Z" fill={mix("#6fae6a", p.accent2, 0.3)} opacity="0.7" />
      <rect x="60" y="60" width="90" height="120" fill={p.accent} opacity="0.85" /><circle cx="105" cy="120" r="26" fill={p.soft} opacity="0.8" />
      <rect x="40" y="200" width="250" height="70" rx="20" fill={mix(p.ink, p.accent, 0.4)} />
      <rect x="50" y="180" width="230" height="45" rx="16" fill={mix(p.ink, p.accent, 0.3)} />
      {[70, 150].map((x) => <rect key={x} x={x} y="190" width="60" height="34" rx="12" fill={x === 70 ? p.accent2 : p.soft} />)}
      <ellipse cx="370" cy="300" rx="70" ry="14" fill={mix(p.ink, p.surface, 0.6)} />
      <rect x="350" y="250" width="40" height="40" rx="6" fill={p.surface} />
      <path d="M440 260 q-10 -60 10 -90 q10 40 -10 90Z" fill="#4f8a4a" /><rect x="425" y="255" width="30" height="35" rx="4" fill={mix(p.ink, p.surface, 0.5)} />
      <circle cx={360 + r() * 10} cy="240" r="8" fill={p.accent2} />
    </g>
  ),
  skyline: ({ p, r, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={110} y={100} rr={36} />
      {Array.from({ length: 12 }, (_, i) => {
        const w = 30 + r() * 30, h = 90 + r() * 180, x = i * 42 - 10;
        return <g key={i}><rect x={x} y={360 - h} width={w} height={h} fill={mix(p.ink, p.accent, 0.1 + (i % 3) * 0.08)} />{Array.from({ length: Math.floor(h / 22) }, (_, k) => <rect key={k} x={x + 6} y={370 - h + k * 22} width={w - 12} height="6" fill={mix(p.accent2, "#fff", 0.4)} opacity={r() > 0.5 ? 0.9 : 0.25} />)}</g>;
      })}
      <path d="M0 340 Q240 320 480 340 V360 H0 Z" fill={p.accent} opacity="0.6" />
    </g>
  ),
  office: ({ p }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.4)} />
      <rect x="0" y="0" width="480" height="200" fill={mix(p.accent2, "#fff", 0.7)} />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={i * 80} y="0" width="6" height="200" fill={p.surface} />)}
      <rect x="0" y="196" width="480" height="8" fill={p.surface} />
      <rect x="60" y="210" width="360" height="16" rx="4" fill={mix(p.ink, p.accent, 0.3)} />
      <rect x="80" y="226" width="10" height="80" fill={mix(p.ink, p.accent, 0.4)} /><rect x="390" y="226" width="10" height="80" fill={mix(p.ink, p.accent, 0.4)} />
      <rect x="170" y="150" width="120" height="62" rx="4" fill={p.ink} /><rect x="176" y="156" width="108" height="50" fill={mix(p.accent, p.accent2, 0.5)} opacity="0.8" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={186} y={164 + i * 10} width={50 + i * 10} height="4" rx="2" fill="#fff" opacity="0.7" />)}
      <path d="M440 200 q-14 -70 10 -110 q14 50 -10 110Z" fill="#4f8a4a" /><path d="M450 200 q24 -50 4 -90" stroke="#4f8a4a" strokeWidth="8" fill="none" />
      <rect x="30" y="140" width="60" height="70" rx="8" fill={p.accent2} opacity="0.7" />
    </g>
  ),
  meeting: ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.3)} />
      <rect x="40" y="40" width="220" height="130" rx="6" fill={p.surface} stroke={mix(p.ink, p.surface, 0.8)} />
      <path d="M60 140 L100 110 L140 125 L180 80 L230 95" stroke={p.accent} strokeWidth="4" fill="none" />
      {[0, 1, 2].map((i) => <rect key={i} x={70 + i * 50} y={150 - i * 20 - 20} width="26" height={20 + i * 20} fill={p.accent2} opacity="0.6" />)}
      <ellipse cx="240" cy="290" rx="220" ry="40" fill={mix(p.ink, p.accent, 0.35)} />
      {[90, 200, 310, 410].map((x, i) => <Person key={x} x={x} y={200} s={0.95} c={[p.accent, mix(p.ink, p.surface, 0.3), p.accent2, mix(p.accent, p.ink, 0.4)][i]!} skin={SKINS[(i + Math.floor(r() * 6)) % 6]!} hair={HAIR[i % 5]!} />)}
      <ellipse cx="240" cy="282" rx="200" ry="32" fill={mix(p.ink, p.accent, 0.25)} />
      {[120, 240, 360].map((x) => <rect key={x} x={x - 22} y="270" width="44" height="6" rx="2" fill={p.surface} opacity="0.8" />)}
    </g>
  ),

  /* ---------------- construction & engineering ---------------- */
  construction: ({ p, r, id }) => (
    <g>
      <Sky id={id} />
      <rect x="0" y="300" width="480" height="60" fill={mix("#b48a5a", p.ink, 0.2)} />
      <rect x="120" y="120" width="220" height="180" fill="none" stroke={mix(p.ink, p.surface, 0.2)} strokeWidth="6" />
      {[160, 200, 240, 280].map((y) => <line key={y} x1="120" y1={y} x2="340" y2={y} stroke={mix(p.ink, p.surface, 0.2)} strokeWidth="5" />)}
      {[175, 230, 285].map((x) => <line key={x} x1={x} y1="120" x2={x} y2="300" stroke={mix(p.ink, p.surface, 0.2)} strokeWidth="5" />)}
      <rect x="120" y="240" width="110" height="60" fill={mix(p.accent2, p.surface, 0.3)} />
      <rect x="230" y="200" width="110" height="100" fill={mix(p.accent2, p.surface, 0.5)} />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${120 + i * 37} 120 L${157 + i * 37} 160`} stroke={p.accent} strokeWidth="3" opacity="0.5" />)}
      <g transform="translate(395 230)"><rect x="-30" y="0" width="60" height="40" rx="6" fill="#f2b705" /><rect x="-30" y="-24" width="34" height="26" fill="#f2b705" /><rect x="-24" y="-20" width="20" height="14" fill={mix(p.accent2, "#fff", 0.5)} /><circle cx="-16" cy="48" r="12" fill={p.ink} /><circle cx="18" cy="48" r="12" fill={p.ink} /><path d="M30 10 L70 -30 L80 -24 L50 18 Z" fill="#e0a300" /></g>
      {[60, 90].map((x, i) => <g key={x}><Person x={x} y={250} s={0.7} c={i ? "#f28c28" : p.accent} skin={SKINS[(i * 3 + Math.floor(r() * 3)) % 6]!} hair={HAIR[i]!} /><path d={`M${x - 14} ${238} Q${x} ${222} ${x + 14} ${238} Z`} fill="#f2b705" /></g>)}
    </g>
  ),
  crane: ({ p, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={90} y={90} rr={30} />
      <rect x="250" y="70" width="14" height="290" fill="#e0a300" />
      {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M250 ${80 + i * 20} l14 20 M264 ${80 + i * 20} l-14 20`} stroke="#b88400" strokeWidth="2" />)}
      <rect x="120" y="60" width="300" height="12" fill="#e0a300" /><rect x="120" y="72" width="40" height="30" fill={mix(p.ink, p.surface, 0.3)} />
      <path d="M257 40 L140 62 M257 40 L400 62" stroke={p.ink} strokeWidth="2" /><rect x="252" y="36" width="10" height="26" fill="#e0a300" />
      <line x1="380" y1="72" x2="380" y2="170" stroke={p.ink} strokeWidth="2" /><rect x="355" y="170" width="50" height="22" fill={p.accent} />
      <rect x="40" y="200" width="160" height="160" fill={mix(p.ink, p.accent2, 0.2)} />
      {Array.from({ length: 5 }, (_, row) => Array.from({ length: 4 }, (_, col) => <Window key={`${row}${col}`} x={52 + col * 37} y={214 + row * 28} w={26} h={16} p={p} lit={(row + col) % 3 === 0} />))}
      <rect x="300" y="240" width="160" height="120" fill="none" stroke={mix(p.ink, p.surface, 0.25)} strokeWidth="5" />
      <line x1="300" y1="300" x2="460" y2="300" stroke={mix(p.ink, p.surface, 0.25)} strokeWidth="5" />
    </g>
  ),
  bridge: ({ p, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={400} y={110} rr={38} />
      <path d="M0 270 Q240 250 480 270 V360 H0 Z" fill={mix(p.accent, "#2a6f97", 0.5)} opacity="0.8" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${290 + i * 14} Q240 ${280 + i * 14} 480 ${290 + i * 14}`} stroke="#fff" strokeOpacity="0.25" fill="none" />)}
      <rect x="0" y="205" width="480" height="14" fill={mix(p.ink, p.surface, 0.2)} />
      {[130, 350].map((x) => <g key={x}><rect x={x - 9} y="70" width="18" height="200" fill={mix(p.ink, p.surface, 0.15)} /><rect x={x - 14} y="100" width="28" height="8" fill={mix(p.ink, p.surface, 0.15)} /></g>)}
      <path d="M0 210 Q65 120 130 75 Q240 205 350 75 Q415 120 480 210" stroke={p.accent} strokeWidth="5" fill="none" />
      {Array.from({ length: 22 }, (_, i) => { const x = 10 + i * 21; const y = x < 130 ? 210 - (x / 130) * 130 : x < 350 ? 75 + 130 * (1 - Math.abs(x - 240) / 110) * 0 + Math.pow((x - 240) / 110, 2) * -0 + (130 - 130 * Math.pow(Math.abs(x - 240) / 110, 1.6)) : 75 + ((x - 350) / 130) * 135; return <line key={i} x1={x} y1={Math.min(205, Math.max(80, y))} x2={x} y2="205" stroke={p.accent} strokeWidth="1.5" opacity="0.7" />; })}
    </g>
  ),
  blueprint: ({ p }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.ink, "#1d4e89", 0.55)} />
      {Array.from({ length: 24 }, (_, i) => <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="360" stroke="#fff" strokeOpacity="0.07" />)}
      {Array.from({ length: 18 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 20} x2="480" y2={i * 20} stroke="#fff" strokeOpacity="0.07" />)}
      <g stroke="#ffffff" strokeOpacity="0.85" fill="none" strokeWidth="2">
        <rect x="80" y="70" width="320" height="220" /><line x1="240" y1="70" x2="240" y2="200" /><line x1="80" y1="200" x2="320" y2="200" /><line x1="320" y1="200" x2="320" y2="290" />
        <path d="M240 160 A40 40 0 0 1 280 200" /><path d="M120 200 A30 30 0 0 0 150 230" />
        <path d="M80 50 L400 50 M80 44 v12 M400 44 v12" strokeWidth="1" /><path d="M420 70 L420 290 M414 70 h12 M414 290 h12" strokeWidth="1" />
      </g>
      <text x="230" y="44" fill="#fff" fontSize="12" fontFamily="monospace" opacity="0.8">14.20 m</text>
      <text x="150" y="140" fill="#fff" fontSize="12" fontFamily="monospace" opacity="0.7">LIVING</text><text x="270" y="140" fill="#fff" fontSize="12" fontFamily="monospace" opacity="0.7">KITCHEN</text><text x="160" y="255" fill="#fff" fontSize="12" fontFamily="monospace" opacity="0.7">BED 1</text>
      <circle cx="400" cy="310" r="22" fill={p.accent} /><path d="M392 310 l6 6 l12 -12" stroke="#fff" strokeWidth="3" fill="none" />
    </g>
  ),

  /* ---------------- products & fashion ---------------- */
  bottle: ({ p, r, id }) => (
    <g>
      <BG id={id} /><circle cx="300" cy="140" r="120" fill={p.accent2} opacity="0.35" />
      <rect x="0" y="270" width="480" height="90" fill={mix(p.soft, p.surface, 0.5)} />
      {[[160, 1.1, p.accent], [270, 0.9, mix(p.accent, p.ink, 0.3)], [350, 0.75, p.accent2]].map(([x, s, c], i) => (
        <g key={i} transform={`translate(${x} 280) scale(${s})`}>
          <ellipse cx="0" cy="0" rx="46" ry="8" fill="#000" opacity="0.12" />
          <rect x="-38" y="-170" width="76" height="170" rx="18" fill={c as string} />
          <rect x="-16" y="-206" width="32" height="40" rx="6" fill={mix(p.ink, p.surface, 0.2)} />
          <rect x="-28" y="-120" width="56" height="60" rx="6" fill={p.surface} opacity="0.9" />
          <rect x="-18" y="-104" width="36" height="5" rx="2" fill={p.ink} opacity="0.6" /><rect x="-14" y="-92" width="28" height="4" rx="2" fill={p.ink} opacity="0.3" />
          <rect x="-30" y="-160" width="10" height="120" rx="5" fill="#fff" opacity="0.25" />
        </g>
      ))}
      {Array.from({ length: 4 }, (_, i) => <Leaf key={i} x={60 + r() * 40} y={250 - i * 26} s={26} c="#5e8c55" rot={-60 + i * 20} />)}
    </g>
  ),
  shoe: ({ p, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="190" r="140" fill={p.surface} opacity="0.6" />
      <g transform="translate(240 210) rotate(-8)">
        <path d="M-160 30 C-160 -10 -120 -40 -70 -40 L-20 -80 C10 -100 50 -90 60 -60 L80 -10 C120 0 160 10 170 40 L170 60 L-160 60 Z" fill={p.accent} />
        <path d="M-160 50 L170 50 L170 70 L-160 70 Z" fill={p.surface} />
        <path d="M-20 -80 C10 -100 50 -90 60 -60 L40 -40 C20 -60 0 -62 -20 -60 Z" fill={mix(p.accent, p.ink, 0.3)} />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${-30 + i * 18} ${-56 + i * 6} l22 8`} stroke={p.surface} strokeWidth="4" strokeLinecap="round" />)}
        <path d="M-150 30 C-80 20 40 22 160 44" stroke={p.accent2} strokeWidth="6" fill="none" />
      </g>
      <ellipse cx="240" cy="290" rx="170" ry="10" fill="#000" opacity="0.1" />
    </g>
  ),
  dress: ({ p, id }) => (
    <g>
      <BG id={id} /><rect x="300" y="0" width="180" height="360" fill={p.accent2} opacity="0.25" />
      <line x1="200" y1="30" x2="200" y2="60" stroke={p.ink} strokeWidth="3" /><path d="M170 60 Q200 40 230 60" stroke={p.ink} strokeWidth="3" fill="none" />
      <path d="M170 64 L230 64 L236 120 Q290 250 300 330 L100 330 Q110 250 164 120 Z" fill={p.accent} />
      <path d="M164 120 L236 120 L232 140 L168 140 Z" fill={mix(p.accent, p.ink, 0.35)} />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${130 + i * 28} 330 Q${150 + i * 20} 230 ${190 + i * 4} 140`} stroke={mix(p.accent, "#fff", 0.25)} strokeWidth="2" fill="none" />)}
      <g transform="translate(380 150)"><line x1="0" y1="-120" x2="0" y2="-90" stroke={p.ink} strokeWidth="2" /><path d="M-40 -88 L40 -88 L52 60 L-52 60 Z" fill={p.surface} /><path d="M-40 -88 L0 -40 L40 -88" stroke={mix(p.ink, p.surface, 0.6)} fill="none" /></g>
    </g>
  ),
  bag: ({ p, id }) => (
    <g>
      <BG id={id} />
      <path d="M190 120 C190 60 290 60 290 120" stroke={mix(p.ink, p.accent, 0.3)} strokeWidth="12" fill="none" />
      <path d="M140 120 L340 120 L360 300 L120 300 Z" fill={p.accent} />
      <path d="M140 120 L340 120 L336 160 L144 160 Z" fill={mix(p.accent, p.ink, 0.25)} />
      <rect x="225" y="150" width="30" height="24" rx="4" fill="#d9b25b" />
      <path d="M128 250 L352 250" stroke={mix(p.accent, "#fff", 0.25)} strokeWidth="2" strokeDasharray="6 6" />
      <ellipse cx="240" cy="306" rx="140" ry="9" fill="#000" opacity="0.12" />
      <circle cx="400" cy="90" r="40" fill={p.accent2} opacity="0.4" />
    </g>
  ),
  ceramic: ({ p, r, id }) => (
    <g>
      <BG id={id} /><rect x="0" y="250" width="480" height="110" fill={mix("#c9a27a", p.surface, 0.4)} />
      {[[120, 1, p.accent], [250, 1.25, p.accent2], [370, 0.9, mix(p.accent, p.soft, 0.5)]].map(([x, s, c], i) => (
        <g key={i} transform={`translate(${x} 250) scale(${s})`}>
          <ellipse cx="0" cy="4" rx="60" ry="9" fill="#000" opacity="0.12" />
          {i === 1 ? <path d="M-40 0 C-60 -60 -30 -110 -18 -130 L18 -130 C30 -110 60 -60 40 0 Z" fill={c as string} /> : <><path d="M-55 -50 Q0 30 55 -50 Z" fill={c as string} /><ellipse cx="0" cy="-50" rx="55" ry="11" fill={c as string} /><ellipse cx="0" cy="-50" rx="48" ry="7" fill={mix(c as string, "#000", 0.2)} /></>}
          {Array.from({ length: 3 }, (_, k) => <path key={k} d={`M${-30 + k * 25} ${i === 1 ? -100 : -38} q8 ${10 + r() * 10} 0 ${20 + r() * 10}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" />)}
        </g>
      ))}
    </g>
  ),
  rack: ({ p }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.35)} />
      <line x1="60" y1="80" x2="420" y2="80" stroke={p.ink} strokeWidth="5" /><line x1="70" y1="80" x2="60" y2="340" stroke={p.ink} strokeWidth="5" /><line x1="410" y1="80" x2="420" y2="340" stroke={p.ink} strokeWidth="5" />
      {[p.accent, p.surface, p.accent2, mix(p.ink, p.surface, 0.3), mix(p.accent, p.soft, 0.4), p.accent].map((c, i) => (
        <g key={i} transform={`translate(${100 + i * 56} 80)`}>
          <path d="M0 0 v14 M-6 14 q6 -8 12 0" stroke={p.ink} strokeWidth="2" fill="none" />
          <path d={i % 2 ? "M-26 18 L26 18 L32 190 L-32 190 Z" : "M-24 18 L24 18 L28 120 L40 230 L-40 230 L-28 120 Z"} fill={c} stroke={mix(p.ink, "#fff", 0.85)} />
        </g>
      ))}
    </g>
  ),
  model: ({ p, r, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="160" r="150" fill={p.surface} opacity="0.5" />
      <g transform="translate(240 70)">
        <circle cx="0" cy="40" r="34" fill={SKINS[Math.floor(r() * 6)]} />
        <path d="M-36 30 C-40 -20 40 -20 36 30 C30 0 -30 0 -36 30 Z M-36 30 C-48 90 -30 120 -20 130 L-30 40 Z" fill={HAIR[Math.floor(r() * 5)]} />
        <path d="M-70 290 C-70 150 -50 90 0 90 C50 90 70 150 70 290 Z" fill={p.accent} />
        <path d="M-30 92 L0 150 L30 92" stroke={mix(p.accent, p.ink, 0.35)} strokeWidth="6" fill="none" />
      </g>
      <text x="40" y="320" fill={p.ink} fontSize="40" fontFamily="serif" fontStyle="italic" opacity="0.25">AW 27</text>
    </g>
  ),

  /* ---------------- education ---------------- */
  classroom: ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.4)} />
      <rect x="60" y="40" width="360" height="150" rx="6" fill={mix("#2f5d50", p.ink, 0.2)} stroke={mix("#b48a5a", p.surface, 0.2)} strokeWidth="10" />
      <path d="M90 150 L140 100 L180 130 L240 70" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" fill="none" /><text x="280" y="110" fill="#fff" opacity="0.75" fontSize="22" fontFamily="serif">E = mc²</text>
      <rect x="0" y="260" width="480" height="100" fill={mix("#b48a5a", p.surface, 0.5)} />
      {[90, 200, 310, 410].map((x, i) => <g key={x}><Person x={x} y={232} s={0.85} c={[p.accent, p.accent2, mix(p.accent, p.ink, 0.3), mix(p.accent2, p.ink, 0.3)][i]!} skin={SKINS[(i * 2 + Math.floor(r() * 6)) % 6]!} hair={HAIR[(i + 1) % 5]!} /><rect x={x - 46} y="290" width="92" height="14" fill={mix("#b48a5a", p.ink, 0.25)} /></g>)}
    </g>
  ),
  books: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      <rect x="40" y="290" width="400" height="14" fill={mix("#b48a5a", p.ink, 0.25)} />
      {Array.from({ length: 13 }, (_, i) => { const h = 120 + r() * 90, w = 22 + r() * 10; const x = 60 + i * 28; return <g key={i}><rect x={x} y={290 - h} width={w} height={h} fill={[p.accent, p.accent2, mix(p.ink, p.surface, 0.3), mix(p.accent, p.soft, 0.4), p.surface][i % 5]} /><rect x={x + 3} y={300 - h} width={w - 6} height="4" fill="#fff" opacity="0.5" /></g>; })}
      <g transform="translate(330 110) rotate(-12)"><rect x="0" y="0" width="100" height="70" rx="4" fill={p.surface} /><line x1="50" y1="0" x2="50" y2="70" stroke={mix(p.ink, p.surface, 0.7)} /></g>
    </g>
  ),
  campus: ({ p, r, id }) => (
    <g>
      <Sky id={id} />
      <path d="M0 280 Q240 250 480 280 V360 H0 Z" fill={mix("#6fae6a", p.accent2, 0.15)} />
      <rect x="110" y="130" width="260" height="150" fill={mix("#c9a27a", p.surface, 0.3)} />
      <path d="M100 135 L240 60 L380 135 Z" fill={mix(p.ink, p.accent, 0.3)} />
      {[140, 180, 220, 260, 300, 340].map((x) => <rect key={x} x={x - 8} y="150" width="16" height="130" fill={p.surface} />)}
      <circle cx="240" cy="104" r="16" fill={p.surface} /><path d="M240 92 v12 l8 6" stroke={p.ink} strokeWidth="2" fill="none" />
      {Array.from({ length: 4 }, (_, i) => <circle key={i} cx={i < 2 ? 40 + i * 30 : 400 + i * 20} cy={262 - r() * 14} r={26 + r() * 8} fill={mix("#3f7d3a", p.ink, 0.15)} />)}
      <path d="M230 280 L210 360 L270 360 L250 280 Z" fill={mix(p.soft, p.surface, 0.5)} />
    </g>
  ),
  graduate: ({ p, r, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="180" r="130" fill={p.accent2} opacity="0.3" />
      <g transform="translate(240 120)">
        <path d="M-80 240 C-80 120 -50 90 0 90 C50 90 80 120 80 240 Z" fill={mix(p.ink, p.accent, 0.3)} />
        <circle cx="0" cy="40" r="36" fill={SKINS[Math.floor(r() * 6)]} />
        <path d="M-70 0 L0 -30 L70 0 L0 30 Z" fill={p.ink} /><rect x="-30" y="6" width="60" height="18" fill={p.ink} />
        <path d="M60 4 v40" stroke={p.accent2} strokeWidth="3" /><circle cx="60" cy="46" r="5" fill={p.accent2} />
      </g>
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={40 + r() * 400} y={30 + r() * 120} width="8" height="14" fill={[p.accent, p.accent2, p.surface][i % 3]} transform={`rotate(${r() * 90} ${40 + i * 40} 80)`} />)}
    </g>
  ),

  /* ---------------- healthcare ---------------- */
  clinic: ({ p }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.5)} />
      <rect x="0" y="250" width="480" height="110" fill={mix(p.soft, p.accent2, 0.2)} />
      <rect x="40" y="50" width="180" height="150" rx="10" fill={p.surface} />
      <rect x="62" y="74" width="136" height="80" rx="6" fill={mix(p.accent, "#fff", 0.75)} /><path d="M80 120 h20 l10 -24 l14 44 l10 -20 h44" stroke={p.accent} strokeWidth="3" fill="none" />
      <rect x="260" y="40" width="180" height="200" rx="10" fill={mix(p.accent2, "#fff", 0.55)} />
      {[0, 1, 2].map((i) => <rect key={i} x="280" y={64 + i * 56} width="140" height="40" rx="8" fill={p.surface} />)}
      <circle cx="300" cy="84" r="10" fill={p.accent} /><circle cx="300" cy="140" r="10" fill={p.accent2} /><circle cx="300" cy="196" r="10" fill={p.accent} />
      <rect x="60" y="230" width="160" height="40" rx="20" fill={p.accent} /><rect x="70" y="270" width="12" height="50" fill={mix(p.ink, p.surface, 0.5)} /><rect x="198" y="270" width="12" height="50" fill={mix(p.ink, p.surface, 0.5)} />
      <path d="M440 250 q-12 -70 10 -110 q12 50 -10 110Z" fill="#5e9c76" /><rect x="425" y="245" width="30" height="40" rx="5" fill={p.surface} />
      <g transform="translate(130 300)"><rect x="-14" y="-40" width="28" height="80" rx="4" fill={p.surface} /><rect x="-40" y="-14" width="80" height="28" rx="4" fill={p.surface} /><rect x="-10" y="-34" width="20" height="68" fill={p.accent} opacity="0.8" /><rect x="-34" y="-10" width="68" height="20" fill={p.accent} opacity="0.8" /></g>
    </g>
  ),
  doctor: ({ p, r, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="170" r="140" fill={p.surface} opacity="0.55" />
      <g transform="translate(240 80)">
        <path d="M-90 280 C-90 140 -60 110 0 110 C60 110 90 140 90 280 Z" fill="#ffffff" />
        <path d="M-30 112 L0 170 L30 112" fill={p.accent} />
        <circle cx="0" cy="56" r="40" fill={SKINS[Math.floor(r() * 6)]} />
        <path d="M-40 50 C-44 0 44 0 40 50 C34 22 -34 22 -40 50 Z" fill={HAIR[Math.floor(r() * 5)]} />
        <path d="M-40 150 C-60 210 -10 230 0 200" stroke={p.ink} strokeWidth="5" fill="none" /><circle cx="2" cy="196" r="9" fill={mix(p.ink, p.surface, 0.3)} />
        <rect x="30" y="170" width="34" height="8" rx="2" fill={p.accent2} />
      </g>
    </g>
  ),
  care: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      <path d="M240 300 C120 220 80 160 120 110 C160 60 220 90 240 130 C260 90 320 60 360 110 C400 160 360 220 240 300 Z" fill={p.accent} opacity="0.85" />
      <path d="M120 300 C160 250 200 240 240 250 C280 240 320 250 360 300" stroke={mix(SKINS[Math.floor(r() * 6)]!, p.surface, 0.1)} strokeWidth="34" strokeLinecap="round" fill="none" />
      {Array.from({ length: 5 }, (_, i) => <Leaf key={i} x={60 + i * 90} y={60 + r() * 30} s={22} c={mix("#5e9c76", p.accent2, 0.3)} rot={r() * 360} />)}
    </g>
  ),

  /* ---------------- travel ---------------- */
  mountain: ({ p, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={340} y={100} />
      <path d="M0 260 L110 120 L190 210 L280 90 L390 230 L480 150 V360 H0 Z" fill={mix(p.ink, p.accent, 0.25)} />
      <path d="M110 120 L135 152 L118 150 L100 164 Z M280 90 L310 128 L292 124 L272 140 L262 116 Z" fill="#fff" opacity="0.9" />
      <path d="M0 290 L140 200 L240 270 L360 210 L480 270 V360 H0 Z" fill={mix(p.ink, "#3f7d3a", 0.4)} />
      <path d="M0 330 Q240 300 480 330 V360 H0 Z" fill={mix("#3f7d3a", p.ink, 0.2)} />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${20 + i * 52} 330 l12 -36 l12 36 Z`} fill={mix("#2f5d3a", p.ink, 0.2)} />)}
    </g>
  ),
  beach: ({ p, r, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={120} y={110} />
      <rect x="0" y="190" width="480" height="70" fill={mix(p.accent, "#2a9d8f", 0.5)} />
      {[0, 1, 2].map((i) => <path key={i} d={`M0 ${200 + i * 18} Q120 ${192 + i * 18} 240 ${200 + i * 18} T480 ${200 + i * 18}`} stroke="#fff" strokeOpacity="0.4" fill="none" />)}
      <path d="M0 250 Q240 225 480 250 V360 H0 Z" fill="#f1d9a7" />
      <path d="M360 330 C360 250 380 170 400 120" stroke="#8a5a3c" strokeWidth="9" fill="none" />
      {[0, 60, 120, 180, 240].map((a) => <path key={a} d="M0 0 C30 -10 60 0 80 20 C50 10 30 10 0 0 Z" fill="#3f8d4a" transform={`translate(400 120) rotate(${a + r() * 20})`} />)}
      <path d="M120 300 L180 250 L240 300 Z" fill={p.accent2} /><line x1="180" y1="250" x2="180" y2="330" stroke={mix(p.ink, p.surface, 0.4)} strokeWidth="3" />
      <rect x="200" y="300" width="90" height="10" rx="4" fill={p.accent} />
    </g>
  ),
  "old-town": ({ p, r, id }) => (
    <g>
      <Sky id={id} />
      {Array.from({ length: 8 }, (_, i) => { const x = i * 62 - 10, h = 150 + r() * 90; const c = [p.accent2, mix(p.accent, "#fff", 0.4), "#e9c46a", mix(p.soft, p.accent, 0.3), "#f4a261"][i % 5]!; return <g key={i}><rect x={x} y={360 - h} width="62" height={h} fill={c} /><path d={`M${x} ${360 - h} L${x + 31} ${330 - h} L${x + 62} ${360 - h} Z`} fill={mix(p.ink, "#b5543c", 0.5)} />{[0, 1, 2].map((k) => <rect key={k} x={x + 12 + (k % 2) * 22} y={380 - h + k * 40} width="14" height="22" rx="7" fill={mix(p.ink, p.surface, 0.4)} />)}</g>; })}
      <path d="M0 340 Q240 330 480 340 V360 H0 Z" fill={mix(p.ink, p.soft, 0.6)} />
    </g>
  ),
  plane: ({ p, id }) => (
    <g>
      <Sky id={id} />
      {[[80, 90, 1], [330, 230, 1.3], [400, 70, 0.8]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity="0.9"><ellipse cx="0" cy="0" rx="50" ry="18" fill="#fff" /><ellipse cx="30" cy="-10" rx="30" ry="18" fill="#fff" /><ellipse cx="-28" cy="-6" rx="24" ry="14" fill="#fff" /></g>)}
      <g transform="translate(240 170) rotate(-14)">
        <path d="M-150 0 C-150 -16 140 -20 160 0 C140 20 -150 16 -150 0 Z" fill={p.surface} />
        <path d="M-20 -6 L-80 -90 L-50 -90 L40 -6 Z M-20 6 L-80 90 L-50 90 L40 6 Z" fill={mix(p.surface, p.ink, 0.12)} />
        <path d="M-150 0 L-170 -40 L-140 -40 L-120 -4 Z" fill={p.accent} />
        {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={-90 + i * 20} cy="-4" r="3" fill={mix(p.accent2, p.ink, 0.3)} />)}
        <path d="M120 -6 C140 -6 150 -2 156 0" stroke={p.accent} strokeWidth="4" />
      </g>
      <path d="M20 330 Q140 280 260 300" stroke="#fff" strokeOpacity="0.6" strokeDasharray="4 8" fill="none" strokeWidth="3" />
    </g>
  ),

  /* ---------------- events & community ---------------- */
  stage: ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.ink, "#000", 0.25)} />
      {[80, 240, 400].map((x, i) => <path key={x} d={`M${x} 0 L${x - 90} 260 L${x + 90} 260 Z`} fill={[p.accent, p.accent2, p.accent][i]} opacity="0.22" />)}
      <rect x="40" y="70" width="400" height="150" rx="6" fill={mix(p.accent, p.accent2, 0.5)} opacity="0.9" />
      <text x="240" y="140" textAnchor="middle" fill="#fff" fontSize="34" fontWeight="700" fontFamily="sans-serif">KEYNOTE</text>
      <text x="240" y="172" textAnchor="middle" fill="#fff" opacity="0.8" fontSize="14" fontFamily="sans-serif">Day 1 · Main hall</text>
      <rect x="0" y="240" width="480" height="30" fill={mix(p.ink, p.surface, 0.2)} />
      <Person x={240} y={200} s={0.7} c={p.surface} skin={SKINS[Math.floor(r() * 6)]!} hair={HAIR[1]!} />
      {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={10 + i * 22 + r() * 8} cy={310 + (i % 2) * 18} r="16" fill={mix(p.ink, p.surface, 0.12 + r() * 0.1)} />)}
    </g>
  ),
  crowd: ({ p, r }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.accent, p.ink, 0.5)} />
      {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={r() * 480} cy={r() * 160} r={2 + r() * 4} fill={[p.accent2, "#fff", p.soft][i % 3]} opacity="0.7" />)}
      {Array.from({ length: 3 }, (_, row) => Array.from({ length: 8 }, (_, i) => <Person key={`${row}-${i}`} x={30 + i * 60 + (row % 2) * 30} y={170 + row * 50} s={0.8} c={[p.accent, p.accent2, p.surface, mix(p.ink, p.surface, 0.3)][(i + row) % 4]!} skin={SKINS[(i + row * 2) % 6]!} hair={HAIR[(i + row) % 5]!} />))}
      {Array.from({ length: 4 }, (_, i) => <path key={i} d={`M${60 + i * 120} 200 l-10 -60`} stroke={SKINS[i % 6]} strokeWidth="9" strokeLinecap="round" />)}
    </g>
  ),
  venue: ({ p, id }) => (
    <g>
      <Sky id={id} />
      <rect x="40" y="130" width="400" height="200" fill={mix(p.surface, p.soft, 0.4)} />
      <path d="M30 135 L240 60 L450 135 Z" fill={mix(p.ink, p.accent, 0.25)} />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={70 + i * 52} y="160" width="30" height="120" rx="15" fill={mix(p.accent2, "#fff", 0.5)} />)}
      <rect x="0" y="320" width="480" height="40" fill={mix(p.ink, p.soft, 0.6)} />
      {Array.from({ length: 6 }, (_, i) => <g key={i}><line x1={30 + i * 84} y1="300" x2={30 + i * 84} y2="340" stroke={p.ink} strokeWidth="3" /><path d={`M${16 + i * 84} 300 h28 l-4 -30 h-20 Z`} fill={[p.accent, p.accent2][i % 2]} /></g>)}
    </g>
  ),
  hands: ({ p, r, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="170" r="120" fill={p.surface} opacity="0.5" />
      {[[-1, 0], [1, 1]].map(([dir, i]) => <path key={i} d={`M${240 + dir! * 200} 300 C${240 + dir! * 140} 280 ${240 + dir! * 70} 250 ${240 + dir! * 20} 210 C${240 + dir! * 10} 200 ${240 + dir! * 30} 186 ${240 + dir! * 50} 198 C${240 + dir! * 90} 220 ${240 + dir! * 140} 230 ${240 + dir! * 200} 236 Z`} fill={SKINS[(i! * 3 + Math.floor(r() * 3)) % 6]} />)}
      <path d="M240 200 C240 160 240 120 240 100" stroke="#4f8a4a" strokeWidth="6" />
      <Leaf x={240} y={130} s={44} c="#5e9c5a" rot={-40} /><Leaf x={240} y={150} s={38} c="#4f8a4a" rot={-150} /><Leaf x={240} y={104} s={30} c="#6fae6a" rot={-90} />
      <ellipse cx="240" cy="204" rx="40" ry="10" fill="#8a5a3c" />
    </g>
  ),
  river: ({ p, id }) => (
    <g>
      <Sky id={id} /><Sun p={p} x={360} y={80} rr={30} />
      <path d="M0 160 L120 110 L220 150 L330 100 L480 150 V360 H0 Z" fill={mix("#3f7d3a", p.ink, 0.35)} />
      <path d="M0 210 Q140 170 260 200 T480 190 V360 H0 Z" fill={mix("#6fae6a", p.accent2, 0.15)} />
      <path d="M180 360 C200 300 300 260 280 210 C270 190 320 190 340 200 C320 230 260 270 300 360 Z" fill={mix(p.accent, "#2a9d8f", 0.6)} />
      {[0, 1, 2].map((i) => <path key={i} d={`M${230 + i * 14} ${330 - i * 30} q20 -10 30 0`} stroke="#fff" strokeOpacity="0.6" fill="none" strokeWidth="2" />)}
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={40 + i * 30} cy={230 + (i % 2) * 14} r="16" fill={mix("#2f5d3a", p.ink, 0.2)} />)}
    </g>
  ),
  garden: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      <rect x="0" y="260" width="480" height="100" fill={mix("#8a5a3c", p.surface, 0.3)} />
      {Array.from({ length: 7 }, (_, i) => { const x = 40 + i * 66, h = 80 + r() * 100; return <g key={i}><path d={`M${x} 260 v-${h}`} stroke="#4f8a4a" strokeWidth="4" /><Leaf x={x} y={260 - h * 0.5} s={26} c="#5e9c5a" rot={-30} /><Leaf x={x} y={260 - h * 0.7} s={22} c="#4f8a4a" rot={-150} /><circle cx={x} cy={260 - h} r={12 + r() * 6} fill={[p.accent, p.accent2, "#f2c14e"][i % 3]} /><circle cx={x} cy={260 - h} r="5" fill={p.surface} /></g>; })}
      <path d="M380 300 l30 -40 l14 10 l-30 40 Z" fill={mix(p.ink, p.surface, 0.4)} />
    </g>
  ),

  /* ---------------- finance ---------------- */
  card: ({ p, id }) => (
    <g>
      <BG id={id} /><circle cx="360" cy="90" r="120" fill={p.accent2} opacity="0.25" />
      <g transform="translate(250 190) rotate(-10)"><rect x="-150" y="-92" width="300" height="184" rx="18" fill={mix(p.ink, p.accent, 0.4)} /><rect x="-150" y="-92" width="300" height="184" rx="18" fill={`url(#${id}-a)`} opacity="0.6" /><rect x="-118" y="-46" width="44" height="34" rx="6" fill="#d9b25b" /><text x="-118" y="40" fill="#fff" fontSize="18" fontFamily="monospace" opacity="0.9">•••• •••• •••• 4821</text><circle cx="96" cy="-56" r="18" fill="#fff" opacity="0.5" /><circle cx="116" cy="-56" r="18" fill="#fff" opacity="0.3" /></g>
      <g transform="translate(140 230) rotate(6)"><rect x="-80" y="-120" width="130" height="240" rx="22" fill={p.ink} /><rect x="-70" y="-104" width="110" height="208" rx="12" fill={p.surface} /><rect x="-60" y="-90" width="60" height="8" rx="4" fill={p.ink} opacity="0.5" /><text x="-60" y="-50" fontSize="22" fontWeight="700" fill={p.ink} fontFamily="sans-serif">£2,480</text><path d="M-60 0 L-36 -18 L-12 -6 L14 -30 L30 -24" stroke={p.accent} strokeWidth="3" fill="none" />{[0, 1, 2].map((i) => <rect key={i} x="-60" y={30 + i * 22} width="90" height="14" rx="4" fill={p.soft} />)}</g>
    </g>
  ),
  growth: ({ p, id }) => (
    <g>
      <BG id={id} />
      <rect x="60" y="50" width="360" height="250" rx="16" fill={p.surface} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1="90" x2="390" y1={100 + i * 50} y2={100 + i * 50} stroke={p.ink} strokeOpacity="0.07" />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={100 + i * 48} y={250 - (i + 1) * 26} width="28" height={(i + 1) * 26} rx="4" fill={i === 5 ? p.accent : mix(p.accent, p.soft, 0.6)} />)}
      <path d="M100 230 C160 210 200 180 250 160 S350 90 390 80" stroke={p.accent2} strokeWidth="4" fill="none" /><circle cx="390" cy="80" r="7" fill={p.accent2} />
      <g transform="translate(390 280)">{[0, 1, 2].map((i) => <ellipse key={i} cx="0" cy={-i * 10} rx="30" ry="9" fill="#d9b25b" stroke="#b8902f" />)}</g>
    </g>
  ),
  vault: ({ p, id }) => (
    <g>
      <BG id={id} />
      <circle cx="240" cy="180" r="130" fill={mix(p.ink, p.accent, 0.3)} /><circle cx="240" cy="180" r="104" fill={mix(p.ink, p.accent, 0.15)} stroke={mix(p.surface, p.accent, 0.3)} strokeWidth="6" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={240 + Math.cos((i / 12) * Math.PI * 2) * 118} cy={180 + Math.sin((i / 12) * Math.PI * 2) * 118} r="6" fill={mix(p.surface, p.accent, 0.3)} />)}
      <circle cx="240" cy="180" r="36" fill={p.surface} /><path d="M240 150 v60 M210 180 h60" stroke={p.ink} strokeWidth="8" strokeLinecap="round" />
      <path d="M380 70 l40 14 v34 c0 26 -18 40 -40 48 c-22 -8 -40 -22 -40 -48 v-34 Z" fill={p.accent2} /><path d="M366 110 l10 10 l20 -20" stroke="#fff" strokeWidth="5" fill="none" />
    </g>
  ),

  /* ---------------- tech ---------------- */
  laptop: ({ p, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="160" r="150" fill={`url(#${id}-glow)`} />
      <rect x="80" y="50" width="320" height="210" rx="12" fill={p.ink} /><rect x="92" y="62" width="296" height="186" rx="4" fill={p.surface} />
      <rect x="92" y="62" width="70" height="186" fill={p.soft} />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x="102" y={80 + i * 20} width={40 + (i % 2) * 10} height="6" rx="3" fill={i === 0 ? p.accent : p.ink} opacity={i === 0 ? 1 : 0.3} />)}
      <rect x="176" y="78" width="80" height="10" rx="5" fill={p.ink} opacity="0.7" />
      {[0, 1, 2].map((i) => <rect key={i} x={176 + i * 68} y="100" width="60" height="44" rx="6" fill={i === 1 ? `url(#${id}-a)` : p.soft} />)}
      <path d="M180 220 L210 196 L240 206 L280 170 L320 182 L372 150" stroke={p.accent} strokeWidth="3" fill="none" />
      <path d="M40 260 L440 260 L420 290 L60 290 Z" fill={mix(p.ink, p.surface, 0.4)} />
    </g>
  ),
  phone: ({ p, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="180" r="140" fill={p.accent2} opacity="0.3" />
      {[[170, -8], [300, 8]].map(([x, rot], i) => (
        <g key={i} transform={`translate(${x} 180) rotate(${rot})`}>
          <rect x="-78" y="-150" width="156" height="300" rx="26" fill={p.ink} /><rect x="-68" y="-138" width="136" height="276" rx="16" fill={p.surface} />
          <rect x="-56" y="-122" width="70" height="10" rx="5" fill={p.ink} opacity="0.7" />
          <rect x="-56" y="-100" width="112" height="70" rx="10" fill={i ? p.soft : `url(#${id}-a)`} />
          {[0, 1, 2].map((k) => <g key={k}><circle cx="-44" cy={-6 + k * 34} r="10" fill={[p.accent, p.accent2, p.soft][k]} /><rect x="-26" y={-12 + k * 34} width="70" height="6" rx="3" fill={p.ink} opacity="0.5" /><rect x="-26" y={-2 + k * 34} width="46" height="5" rx="2" fill={p.ink} opacity="0.2" /></g>)}
          <rect x="-56" y="100" width="112" height="24" rx="12" fill={p.accent} />
        </g>
      ))}
    </g>
  ),
  dashboard: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      <rect x="30" y="30" width="420" height="300" rx="14" fill={p.surface} />
      <rect x="30" y="30" width="90" height="300" rx="14" fill={p.ink} />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x="46" y={60 + i * 26} width="58" height="7" rx="3" fill="#fff" opacity={i === 1 ? 0.9 : 0.35} />)}
      {[0, 1, 2].map((i) => <g key={i}><rect x={136 + i * 104} y="46" width="94" height="58" rx="8" fill={p.soft} /><rect x={146 + i * 104} y="58" width="40" height="6" rx="3" fill={p.ink} opacity="0.4" /><rect x={146 + i * 104} y="74" width={50 + i * 8} height="14" rx="4" fill={p.ink} opacity="0.85" /></g>)}
      <rect x="136" y="118" width="200" height="196" rx="8" fill={p.soft} opacity="0.6" />
      <path d={`M150 290 ${Array.from({ length: 8 }, (_, i) => `L${150 + i * 25} ${290 - 20 - r() * 120}`).join(" ")}`} stroke={p.accent} strokeWidth="3" fill="none" />
      <circle cx="394" cy="180" r="48" fill="none" stroke={p.soft} strokeWidth="20" /><circle cx="394" cy="180" r="48" fill="none" stroke={p.accent2} strokeWidth="20" strokeDasharray="200 302" transform="rotate(-90 394 180)" />
      {[0, 1, 2].map((i) => <rect key={i} x="350" y={250 + i * 20} width={88 - i * 14} height="8" rx="4" fill={[p.accent, p.accent2, p.ink][i]} opacity="0.7" />)}
    </g>
  ),

  /* ---------------- people & general ---------------- */
  portrait: ({ p, r, id }) => (
    <g>
      <BG id={id} /><circle cx="240" cy="160" r="130" fill={[p.accent2, p.accent, p.soft][Math.floor(r() * 3)]} opacity="0.5" />
      <g transform="translate(240 90)">
        <path d="M-100 270 C-100 150 -60 120 0 120 C60 120 100 150 100 270 Z" fill={[p.accent, mix(p.ink, p.surface, 0.3), p.accent2, mix(p.accent, p.ink, 0.4)][Math.floor(r() * 4)]} />
        <circle cx="0" cy="60" r="52" fill={SKINS[Math.floor(r() * 6)]} />
        <path d={r() > 0.5 ? "M-54 54 C-60 -10 60 -10 54 54 C44 20 -44 20 -54 54 Z" : "M-56 60 C-66 -20 66 -20 56 60 L60 120 L40 70 C30 30 -30 30 -40 70 L-60 120 Z"} fill={HAIR[Math.floor(r() * 5)]} />
      </g>
    </g>
  ),
  team: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      {[[110, 200, 0.95], [240, 180, 1.1], [370, 200, 0.95], [175, 250, 0.9], [305, 250, 0.9]].map(([x, y, s], i) => <Person key={i} x={x!} y={y!} s={s!} c={[p.accent, mix(p.ink, p.surface, 0.3), p.accent2, mix(p.accent, p.ink, 0.35), mix(p.accent2, p.ink, 0.3)][i]!} skin={SKINS[(i * 2 + Math.floor(r() * 6)) % 6]!} hair={HAIR[(i + Math.floor(r() * 5)) % 5]!} />)}
    </g>
  ),
  desk: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      <rect x="0" y="230" width="480" height="130" fill={mix("#b48a5a", p.surface, 0.35)} />
      <rect x="110" y="100" width="200" height="130" rx="8" fill={p.ink} /><rect x="120" y="110" width="180" height="104" rx="3" fill={p.surface} /><rect x="130" y="122" width="90" height="8" rx="4" fill={p.accent} /><rect x="130" y="138" width="150" height="5" rx="2" fill={p.ink} opacity="0.25" /><rect x="130" y="150" width="130" height="5" rx="2" fill={p.ink} opacity="0.25" /><rect x="130" y="170" width="70" height="34" rx="4" fill={p.soft} /><rect x="206" y="170" width="70" height="34" rx="4" fill={mix(p.accent2, "#fff", 0.5)} />
      <rect x="190" y="230" width="40" height="8" fill={p.ink} />
      <g transform="translate(380 210)"><rect x="-22" y="-10" width="44" height="40" rx="8" fill={p.surface} /><path d="M22 0 q16 4 0 18" stroke={p.surface} strokeWidth="5" fill="none" />{[0, 1, 2].map((i) => <path key={i} d={`M${-10 + i * 10} -20 q5 -10 0 -20`} stroke={p.ink} strokeOpacity="0.2" strokeWidth="2" fill="none" />)}</g>
      <path d="M60 230 q-10 -80 14 -120 q10 60 -14 120Z" fill="#5e9c5a" /><rect x="44" y="222" width="34" height="34" rx="5" fill={p.accent2} />
      <rect x={330 + r() * 10} y="245" width="70" height="50" rx="3" fill={p.surface} transform="rotate(-8 360 270)" />
    </g>
  ),
  notebook: ({ p, id }) => (
    <g>
      <BG id={id} />
      <g transform="translate(240 180) rotate(-6)"><rect x="-150" y="-110" width="300" height="220" rx="10" fill={p.surface} /><line x1="0" y1="-110" x2="0" y2="110" stroke={mix(p.ink, p.surface, 0.8)} strokeWidth="2" />{Array.from({ length: 8 }, (_, i) => <line key={i} x1="-136" x2="-14" y1={-80 + i * 22} y2={-80 + i * 22} stroke={p.accent2} strokeOpacity="0.35" />)}{Array.from({ length: 6 }, (_, i) => <rect key={i} x="-130" y={-92 + i * 22} width={60 + (i * 23) % 50} height="6" rx="3" fill={p.ink} opacity="0.55" />)}<path d="M20 -60 C60 -100 110 -40 80 0 C60 30 30 10 40 -20" stroke={p.accent} strokeWidth="3" fill="none" /><circle cx="90" cy="60" r="26" fill={p.soft} /></g>
      <rect x="360" y="60" width="12" height="190" rx="6" fill={p.accent} transform="rotate(28 366 155)" />
    </g>
  ),
  abstract: ({ p, r, id }) => (
    <g>
      <BG id={id} />
      <circle cx={120 + r() * 60} cy={120 + r() * 40} r="110" fill={p.accent} opacity="0.85" />
      <rect x={220 + r() * 40} y={100} width="180" height="180" rx="40" fill={p.accent2} opacity="0.8" transform={`rotate(${r() * 30} 330 190)`} />
      <path d={`M0 ${300 - r() * 40} Q240 ${200 + r() * 40} 480 ${280}`} stroke={p.ink} strokeWidth="10" fill="none" opacity="0.2" />
      <circle cx="380" cy="80" r="26" fill={p.surface} />
    </g>
  ),
  map: ({ p, id }) => (
    <g>
      <rect width="480" height="360" fill={mix(p.soft, p.surface, 0.5)} />
      <path d="M0 220 Q120 180 220 230 T480 200 V260 Q360 280 240 250 T0 280 Z" fill={mix(p.accent, "#7fb3d5", 0.6)} opacity="0.6" />
      {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60 + 40} y2="360" stroke="#fff" strokeWidth="8" />)}
      {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 70 + 20} x2="480" y2={i * 70 - 10} stroke="#fff" strokeWidth="6" />)}
      <rect x="300" y="60" width="90" height="60" rx="6" fill={mix("#6fae6a", p.surface, 0.3)} />
      <g transform="translate(240 160)"><path d="M0 0 C-30 -30 -30 -70 0 -70 C30 -70 30 -30 0 0 Z" fill={p.accent} /><circle cx="0" cy="-46" r="10" fill={p.surface} /><ellipse cx="0" cy="4" rx="14" ry="4" fill="#000" opacity="0.15" /></g>
      <rect width="480" height="360" fill={`url(#${id}-grain)`} />
    </g>
  ),
};
