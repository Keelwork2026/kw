import type { Starter } from "@/lib/site/starters";

/**
 * A designed miniature of a starter template: browser frame, navigation,
 * headline, imagery (drawn shapes, not photos) and the template's key
 * screens, in its own palette. Pure SVG, so it's crisp at any size.
 */
export function TemplatePreview({ starter, className = "", idSuffix = "" }: { starter: Starter; className?: string; idSuffix?: string }) {
  const { palette: c, kind, headline, sub } = starter.design;
  const id = `tp-${starter.slug}${idSuffix}`;
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={`Preview of the ${starter.name} template`} className={`block h-auto w-full ${className}`} style={{ fontFamily: "var(--font-sans)" }}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.accent} /><stop offset="1" stopColor={c.accent2} /></linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.accent2} stopOpacity="0.9" /><stop offset="1" stopColor={c.accent} stopOpacity="0.85" /></linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.7" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" stopOpacity="0.85" /><stop offset="0.35" stopColor={c.accent2} stopOpacity="0.9" /><stop offset="1" stopColor={c.accent} /></radialGradient>
        <clipPath id={`${id}-clip`}><rect x="0" y="0" width="320" height="200" rx="10" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="320" height="200" fill={c.bg} />
        {/* browser chrome */}
        <rect width="320" height="16" fill={c.surface} />
        <circle cx="9" cy="8" r="2.4" fill="#ff5f57" /><circle cx="16" cy="8" r="2.4" fill="#febc2e" /><circle cx="23" cy="8" r="2.4" fill="#28c840" />
        <rect x="110" y="4" width="100" height="8" rx="4" fill={c.soft} />
        <text x="160" y="10.2" textAnchor="middle" fontSize="5" fill={c.muted}>{starter.slug}.app</text>
        <Body kind={kind} c={c} id={id} headline={headline} sub={sub} name={starter.name} />
      </g>
      <rect x="0.5" y="0.5" width="319" height="199" rx="10" fill="none" stroke={c.ink} strokeOpacity="0.08" />
    </svg>
  );
}

type P = { c: Starter["design"]["palette"]; id: string; headline: string; sub: string; name: string };

function Nav({ c, name, dark = false, cta = "Get started" }: { c: P["c"]; name: string; dark?: boolean; cta?: string }) {
  return (
    <g>
      <text x="14" y="30" fontSize="7.5" fontWeight="700" fill={dark ? c.ink : c.ink}>{name}</text>
      {[0, 1, 2].map((i) => <rect key={i} x={170 + i * 28} y="25.5" width="20" height="4" rx="2" fill={c.muted} opacity="0.45" />)}
      <rect x="262" y="21" width="46" height="13" rx="6.5" fill={c.ink} /><text x="285" y="29.6" textAnchor="middle" fontSize="5" fontWeight="600" fill={c.bg}>{cta}</text>
    </g>
  );
}

function Lines({ x, y, w, n = 2, c, gap = 6 }: { x: number; y: number; w: number; n?: number; c: P["c"]; gap?: number }) {
  return <g>{Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * gap} width={i === n - 1 ? w * 0.6 : w} height="3" rx="1.5" fill={c.muted} opacity="0.35" />)}</g>;
}

function Body({ kind, ...p }: P & { kind: Starter["design"]["kind"] }) {
  const { c, id, headline, sub, name } = p;
  switch (kind) {
    case "booking":
      return (
        <g>
          <Nav c={c} name={name} cta="Book a class" />
          <text x="14" y="58" fontSize="15" fontWeight="700" fill={c.ink}>{headline}</text>
          <Lines x={14} y={66} w={110} c={c} />
          <rect x="14" y="82" width="52" height="13" rx="6.5" fill={c.accent} /><text x="40" y="90.5" textAnchor="middle" fontSize="5" fontWeight="600" fill="#fff">See timetable</text>
          {/* image: sunrise over hills */}
          <rect x="176" y="40" width="130" height="62" rx="8" fill={`url(#${id}-sun)`} />
          <path d="M176 92 Q206 70 236 86 T306 80 V102 H176 Z" fill={c.ink} opacity="0.25" />
          <path d="M176 98 Q216 84 256 94 T306 92 V102 H176 Z" fill={c.ink} opacity="0.35" />
          <text x="14" y="118" fontSize="6.5" fontWeight="700" fill={c.ink}>{sub}</text>
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
            <g key={d}>
              <rect x={14 + i * 60} y="124" width="54" height="62" rx="6" fill={c.surface} stroke={c.ink} strokeOpacity="0.07" />
              <text x={20 + i * 60} y="134" fontSize="5" fontWeight="700" fill={c.muted}>{d}</text>
              <rect x={20 + i * 60} y="139" width="42" height="18" rx="4" fill={i % 2 ? c.soft : c.accent} opacity={i % 2 ? 1 : 0.9} />
              <text x={23 + i * 60} y="146" fontSize="4.4" fontWeight="700" fill={i % 2 ? c.ink : "#fff"}>{["Vinyasa", "Yin", "Power", "Restore", "Flow"][i]}</text>
              <text x={23 + i * 60} y="152.5" fontSize="3.8" fill={i % 2 ? c.muted : "#fff"} opacity="0.9">{["07:00", "18:30", "12:15", "19:00", "08:00"][i]} · {[4, 0, 9, 2, 6][i]} left</text>
              <rect x={20 + i * 60} y="161" width="42" height="18" rx="4" fill={c.soft} />
              <text x={23 + i * 60} y="168" fontSize="4.4" fontWeight="700" fill={c.ink}>{["Hatha", "Pilates", "Barre", "Flow", "Yin"][i]}</text>
              <text x={23 + i * 60} y="174.5" fontSize="3.8" fill={c.muted}>{["17:30", "07:45", "19:15", "07:00", "17:00"][i]}</text>
            </g>
          ))}
        </g>
      );
    case "portfolio":
      return (
        <g>
          <Nav c={c} name={name} cta="Contact" />
          <text x="14" y="62" fontSize="19" fontWeight="700" fill={c.ink} style={{ fontFamily: "var(--font-serif)" }} fontStyle="italic">{headline}</text>
          <text x="14" y="74" fontSize="5.5" fill={c.muted}>{sub}</text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={14 + i * 100} y="84" width="92" height={i === 1 ? 98 : 74} rx="6" fill={[c.accent, c.soft, c.accent2][i]} />
              {i === 0 ? <><circle cx="50" cy="118" r="18" fill="#fff" opacity="0.25" /><rect x="66" y="98" width="30" height="40" rx="4" fill="#fff" opacity="0.3" /></> : null}
              {i === 1 ? <><rect x="128" y="96" width="68" height="44" rx="4" fill={c.surface} /><rect x="134" y="102" width="30" height="4" rx="2" fill={c.ink} opacity="0.6" /><rect x="134" y="110" width="56" height="24" rx="3" fill={c.accent} opacity="0.25" /><circle cx="162" cy="160" r="12" fill={c.accent2} opacity="0.6" /></> : null}
              {i === 2 ? <><path d={`M${214} ${150} L${244} ${104} L${274} ${150} Z`} fill="#fff" opacity="0.35" /><circle cx="286" cy="104" r="9" fill="#fff" opacity="0.5" /></> : null}
            </g>
          ))}
          <text x="14" y="168" fontSize="5" fontWeight="700" fill={c.ink}>Northwind rebrand</text>
          <text x="114" y="191" fontSize="5" fontWeight="700" fill={c.ink}>Atlas app</text>
          <text x="214" y="168" fontSize="5" fontWeight="700" fill={c.ink}>Studio Ono</text>
        </g>
      );
    case "dashboard":
      return (
        <g>
          <rect x="0" y="16" width="62" height="184" fill={c.surface} />
          <rect x="10" y="26" width="10" height="10" rx="3" fill={`url(#${id}-a)`} /><text x="24" y="33.5" fontSize="6.5" fontWeight="700" fill={c.ink}>{headline}</text>
          {["Overview", "Reports", "Sources", "Team", "Billing"].map((t, i) => (
            <g key={t}><rect x="8" y={46 + i * 14} width="46" height="10" rx="3" fill={i === 0 ? c.soft : "transparent"} /><text x="13" y={53 + i * 14} fontSize="4.8" fontWeight={i === 0 ? 700 : 500} fill={i === 0 ? c.accent : c.muted}>{t}</text></g>
          ))}
          <text x="72" y="32" fontSize="8" fontWeight="700" fill={c.ink}>Overview</text><text x="72" y="40" fontSize="4.5" fill={c.muted}>{sub}</text>
          {[["Visitors", "48.2k", "+12%"], ["Sign-ups", "1,904", "+8%"], ["Conversion", "3.9%", "+0.4"], ["Revenue", "$12.4k", "+15%"]].map(([k, v, d], i) => (
            <g key={k}>
              <rect x={72 + i * 61} y="46" width="55" height="30" rx="5" fill={c.surface} />
              <text x={77 + i * 61} y="55" fontSize="4.2" fill={c.muted}>{k}</text>
              <text x={77 + i * 61} y="66" fontSize="8" fontWeight="700" fill={c.ink}>{v}</text>
              <text x={77 + i * 61} y="72.5" fontSize="3.8" fontWeight="700" fill={c.accent2}>{d}</text>
            </g>
          ))}
          <rect x="72" y="82" width="150" height="104" rx="5" fill={c.surface} />
          <text x="78" y="92" fontSize="4.8" fontWeight="700" fill={c.ink}>Visitors</text>
          <path d="M78 170 L95 160 L112 164 L129 148 L146 152 L163 134 L180 140 L197 120 L214 110 V178 H78 Z" fill={c.accent} opacity="0.12" />
          <path d="M78 170 L95 160 L112 164 L129 148 L146 152 L163 134 L180 140 L197 120 L214 110" fill="none" stroke={c.accent} strokeWidth="1.6" strokeLinejoin="round" />
          {[0, 1, 2, 3].map((i) => <line key={i} x1="78" x2="216" y1={110 + i * 20} y2={110 + i * 20} stroke={c.ink} strokeOpacity="0.06" />)}
          <rect x="228" y="82" width="83" height="104" rx="5" fill={c.surface} />
          <text x="234" y="92" fontSize="4.8" fontWeight="700" fill={c.ink}>By source</text>
          {[52, 38, 26, 18, 10].map((w, i) => (
            <g key={i}><text x="234" y={104 + i * 15} fontSize="3.8" fill={c.muted}>{["Search", "Direct", "Social", "Email", "Ads"][i]}</text><rect x="234" y={106 + i * 15} width={w} height="5" rx="2.5" fill={i === 0 ? c.accent : c.accent2} opacity={1 - i * 0.12} /></g>
          ))}
        </g>
      );
    case "shop":
      return (
        <g>
          <Nav c={c} name={name} cta="Cart (2)" />
          <rect x="14" y="40" width="292" height="66" rx="8" fill={c.soft} />
          <text x="26" y="66" fontSize="14" fontWeight="700" fill={c.ink}>{headline}</text>
          <text x="26" y="77" fontSize="5.5" fill={c.muted}>{sub}</text>
          <rect x="26" y="84" width="44" height="12" rx="6" fill={c.accent} /><text x="48" y="92" textAnchor="middle" fontSize="5" fontWeight="600" fill="#fff">Shop now</text>
          {/* bowls */}
          <ellipse cx="236" cy="92" rx="38" ry="7" fill={c.ink} opacity="0.12" />
          <path d="M202 70 Q236 112 270 70 Z" fill={c.accent} /><ellipse cx="236" cy="70" rx="34" ry="6" fill={c.accent} /><ellipse cx="236" cy="70" rx="30" ry="4.5" fill={c.bg} />
          <path d="M262 82 Q282 104 300 82 Z" fill={c.accent2} /><ellipse cx="281" cy="82" rx="19" ry="3.6" fill={c.accent2} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={14 + i * 74} y="114" width="66" height="50" rx="6" fill={c.surface} />
              <ellipse cx={47 + i * 74} cy="148" rx="18" ry="3" fill={c.ink} opacity="0.1" />
              <path d={`M${31 + i * 74} 132 Q${47 + i * 74} ${154} ${63 + i * 74} 132 Z`} fill={[c.accent, c.accent2, c.muted, c.accent][i]} opacity={[1, 1, 0.6, 0.6][i]} />
              <ellipse cx={47 + i * 74} cy="132" rx="16" ry="3" fill={[c.accent, c.accent2, c.muted, c.accent][i]} opacity={[1, 1, 0.6, 0.6][i]} />
              <text x={14 + i * 74} y="172" fontSize="5" fontWeight="700" fill={c.ink}>{["Tide bowl", "Moss cup", "Ash plate", "Ember vase"][i]}</text>
              <text x={14 + i * 74} y="180" fontSize="4.5" fill={c.muted}>{["$38", "$24", "$42", "$56"][i]}</text>
            </g>
          ))}
        </g>
      );
    case "habits":
      return (
        <g>
          <text x="14" y="34" fontSize="11" fontWeight="700" fill={c.ink}>{headline}</text>
          <text x="14" y="43" fontSize="5" fill={c.muted}>{sub} · 12-day streak</text>
          <circle cx="292" cy="32" r="10" fill="none" stroke={c.soft} strokeWidth="3.5" /><circle cx="292" cy="32" r="10" fill="none" stroke={c.accent} strokeWidth="3.5" strokeDasharray="50 63" transform="rotate(-90 292 32)" strokeLinecap="round" />
          {["🧘 Stretch", "📚 Read 20 min", "💧 Water", "🚶 Walk", "✍️ Journal"].map((t, i) => (
            <g key={t}>
              <rect x="14" y={52 + i * 22} width="180" height="18" rx="6" fill={c.surface} />
              <text x="20" y={63.5 + i * 22} fontSize="5.5" fontWeight="600" fill={c.ink}>{t}</text>
              <text x="150" y={63.5 + i * 22} fontSize="4.5" fill={c.muted}>{[12, 5, 21, 3, 8][i]} days</text>
              <circle cx="183" cy={61 + i * 22} r="5" fill={i === 3 ? "none" : c.accent} stroke={c.accent} strokeWidth="1.2" />
              {i !== 3 ? <path d={`M180.5 ${61 + i * 22} l1.8 1.8 l3.2 -3.4`} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" /> : null}
            </g>
          ))}
          <rect x="204" y="52" width="104" height="106" rx="6" fill={c.surface} />
          <text x="210" y="62" fontSize="5" fontWeight="700" fill={c.ink}>Last 12 weeks</text>
          {Array.from({ length: 84 }, (_, i) => {
            const v = (i * 37) % 7;
            return <rect key={i} x={210 + (i % 12) * 8} y={68 + Math.floor(i / 12) * 12} width="6.4" height="9.6" rx="1.6" fill={v < 1 ? c.soft : c.accent} opacity={v < 1 ? 1 : 0.35 + (v / 7) * 0.65} />;
          })}
          <rect x="14" y="166" width="294" height="22" rx="8" fill={c.ink} />
          <text x="24" y="179.5" fontSize="5.2" fontWeight="600" fill={c.bg}>Evening nudge at 20:30 · one habit left today</text>
          <rect x="262" y="171" width="38" height="12" rx="6" fill={c.accent2} /><text x="281" y="179" textAnchor="middle" fontSize="4.8" fontWeight="700" fill={c.ink}>Check in</text>
        </g>
      );
    case "waitlist":
      return (
        <g>
          <circle cx="250" cy="70" r="70" fill={c.accent} opacity="0.25" />
          <circle cx="80" cy="170" r="60" fill={c.accent2} opacity="0.25" />
          <text x="14" y="30" fontSize="7.5" fontWeight="700" fill={c.ink}>{name}</text>
          <rect x="120" y="44" width="80" height="11" rx="5.5" fill={c.surface} /><text x="160" y="51.5" textAnchor="middle" fontSize="4.6" fill={c.muted}>Launching this spring</text>
          <text x="160" y="80" textAnchor="middle" fontSize="15" fontWeight="700" fill={c.ink}>{headline}</text>
          <text x="160" y="92" textAnchor="middle" fontSize="5.5" fill={c.muted}>The calmer way to plan your week — early access soon.</text>
          <rect x="82" y="102" width="156" height="18" rx="9" fill={c.surface} stroke={c.ink} strokeOpacity="0.15" />
          <text x="92" y="113" fontSize="5" fill={c.muted}>you@example.com</text>
          <rect x="182" y="104" width="54" height="14" rx="7" fill={`url(#${id}-a)`} /><text x="209" y="113" textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff">Join the list</text>
          <text x="160" y="130" textAnchor="middle" fontSize="4.6" fill={c.muted}>{sub} · no spam</text>
          {["Plan in seconds", "Shared with family", "Private by default"].map((t, i) => (
            <g key={t}><rect x={22 + i * 96} y="144" width="88" height="40" rx="7" fill={c.surface} /><circle cx={34 + i * 96} cy="158" r="5" fill={i === 1 ? c.accent2 : c.accent} opacity="0.8" /><text x={44 + i * 96} y="160" fontSize="5" fontWeight="700" fill={c.ink}>{t}</text><Lines x={30 + i * 96} y={168} w={70} c={c} n={2} gap={5} /></g>
          ))}
        </g>
      );
    case "restaurant":
      return (
        <g>
          <rect x="0" y="16" width="320" height="86" fill={c.ink} />
          <path d="M0 80 Q40 70 80 80 T160 80 T240 80 T320 80 V102 H0 Z" fill={c.accent2} opacity="0.5" />
          <path d="M0 88 Q40 80 80 88 T160 88 T240 88 T320 88 V102 H0 Z" fill={c.accent2} opacity="0.7" />
          <circle cx="262" cy="46" r="14" fill={c.accent} opacity="0.9" />
          <text x="14" y="32" fontSize="7.5" fontWeight="700" fill={c.bg}>{name}</text>
          <text x="14" y="60" fontSize="14" fontWeight="700" fill={c.bg} style={{ fontFamily: "var(--font-serif)" }} fontStyle="italic">{headline}</text>
          <rect x="14" y="68" width="48" height="12" rx="6" fill={c.accent} /><text x="38" y="76" textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff">Reserve</text>
          <rect x="66" y="68" width="48" height="12" rx="6" fill="none" stroke={c.bg} strokeOpacity="0.6" /><text x="90" y="76" textAnchor="middle" fontSize="5" fontWeight="600" fill={c.bg}>Order ahead</text>
          <text x="14" y="118" fontSize="7" fontWeight="700" fill={c.ink}>{sub}</text>
          {[["Grilled sea bass", "salsa verde, new potatoes", "£24", "GF"], ["Crab linguine", "chilli, lemon, parsley", "£21", ""], ["Roast squash", "whipped feta, hazelnuts", "£17", "V"], ["Oysters ×6", "shallot vinegar", "£16", "GF"]].map(([n, d, pr, t], i) => (
            <g key={n}>
              <text x={14 + (i % 2) * 152} y={132 + Math.floor(i / 2) * 26} fontSize="5.4" fontWeight="700" fill={c.ink}>{n}</text>
              <text x={14 + (i % 2) * 152} y={139 + Math.floor(i / 2) * 26} fontSize="4.4" fill={c.muted}>{d}</text>
              <text x={150 + (i % 2) * 152} y={132 + Math.floor(i / 2) * 26} textAnchor="end" fontSize="5.4" fontWeight="700" fill={c.accent}>{pr}</text>
              {t ? <><rect x={14 + (i % 2) * 152} y={142 + Math.floor(i / 2) * 26} width="12" height="7" rx="3.5" fill={c.soft} /><text x={20 + (i % 2) * 152} y={147 + Math.floor(i / 2) * 26} textAnchor="middle" fontSize="3.6" fontWeight="700" fill={c.ink}>{t}</text></> : null}
            </g>
          ))}
          <rect x="14" y="180" width="292" height="12" rx="4" fill={c.soft} /><text x="20" y="188" fontSize="4.6" fill={c.ink}>Open Tue–Sun · 12:00–22:30 · 4 Quay Street</text>
        </g>
      );
    case "blog":
      return (
        <g>
          <Nav c={c} name={headline} cta="Subscribe" />
          <rect x="14" y="40" width="170" height="92" rx="6" fill={`url(#${id}-b)`} />
          <path d="M14 112 Q60 84 104 104 T184 96 V132 H14 Z" fill={c.ink} opacity="0.18" />
          <path d="M40 132 L64 92 L88 132 Z" fill={c.ink} opacity="0.22" /><path d="M66 132 L92 82 L118 132 Z" fill={c.ink} opacity="0.3" />
          <text x="14" y="146" fontSize="4.5" fontWeight="700" fill={c.accent}>ESSAY · 9 MIN READ</text>
          <text x="14" y="160" fontSize="9" fontWeight="700" fill={c.ink} style={{ fontFamily: "var(--font-serif)" }}>The marsh at first light</text>
          <Lines x={14} y={168} w={170} c={c} n={3} gap={6} />
          <text x="196" y="46" fontSize="5" fontWeight="700" fill={c.muted}>{sub.toUpperCase()}</text>
          {["Notes from a rainy ridge", "What the river keeps", "Members: winter field kit", "On walking slowly"].map((t, i) => (
            <g key={t}><text x="196" y={60 + i * 30} fontSize="6" fontWeight="700" fill={c.ink} style={{ fontFamily: "var(--font-serif)" }}>{t}</text><Lines x={196} y={65 + i * 30} w={110} c={c} n={2} gap={5} />{i === 2 ? <rect x="282" y={52 + i * 30} width="24" height="8" rx="4" fill={c.accent2} opacity="0.85" /> : null}</g>
          ))}
        </g>
      );
    case "crm":
      return (
        <g>
          <rect x="0" y="16" width="54" height="184" fill={c.ink} />
          <text x="10" y="32" fontSize="6.5" fontWeight="700" fill={c.bg}>{name}</text>
          {["Pipeline", "Contacts", "Companies", "Tasks", "Reports"].map((t, i) => <text key={t} x="10" y={50 + i * 13} fontSize="4.8" fontWeight={i === 0 ? 700 : 500} fill={c.bg} opacity={i === 0 ? 1 : 0.6}>{t}</text>)}
          <text x="64" y="32" fontSize="9" fontWeight="700" fill={c.ink}>{headline}</text><text x="64" y="41" fontSize="4.8" fill={c.muted}>{sub} · 23 deals</text>
          {["Lead", "Qualified", "Proposal", "Won"].map((col, i) => (
            <g key={col}>
              <rect x={64 + i * 63} y="48" width="58" height="140" rx="5" fill={c.soft} />
              <text x={69 + i * 63} y="57" fontSize="4.8" fontWeight="700" fill={c.ink}>{col}</text>
              {Array.from({ length: [3, 3, 2, 1][i]! }, (_, j) => (
                <g key={j}>
                  <rect x={68 + i * 63} y={62 + j * 32} width="50" height="27" rx="4" fill={c.surface} />
                  <text x={72 + i * 63} y={70 + j * 32} fontSize="4.6" fontWeight="700" fill={c.ink}>{["Acme Ltd", "Northwind", "Globex", "Initech", "Umbrella", "Hooli", "Stark Co", "Wayne", "Tyrell"][i * 3 + j]}</text>
                  <text x={72 + i * 63} y={77 + j * 32} fontSize="4.2" fill={i === 3 ? c.accent2 : c.accent} fontWeight="700">${[12, 8, 24, 31, 16, 9, 42, 18, 27][i * 3 + j]}k</text>
                  <circle cx={112 + i * 63} cy={83 + j * 32} r="3" fill={[c.accent, c.accent2, c.muted][(i + j) % 3]} />
                </g>
              ))}
            </g>
          ))}
        </g>
      );
  }
}
