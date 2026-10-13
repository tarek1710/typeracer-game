import type { CarKind } from '../game/types';

const WHEEL = '#0b1220';

/** Wheels as four dark rectangles; racers get big exposed ones. */
function Wheels({ big = false }: { big?: boolean }) {
  const h = big ? 9 : 6, w = big ? 15 : 13;
  return (
    <>
      {[16, 66].map((x) => (
        <g key={x}>
          <rect x={x} y={big ? 2 : 3} width={w} height={h} rx="2" fill={WHEEL} />
          <rect x={x} y={big ? 33 : 35} width={w} height={h} rx="2" fill={WHEEL} />
        </g>
      ))}
    </>
  );
}

const Lights = ({ x = 97 }: { x?: number }) => (
  <>
    <circle cx={x} cy="13" r="2.2" fill="#fef08a" />
    <circle cx={x} cy="31" r="2.2" fill="#fef08a" />
  </>
);

/**
 * Top-down cars facing right, drawn in different body styles so you can tell them apart at a glance:
 * van (slowest, boxy) -> hatch -> coupe -> racer (open-wheel, fastest). `player` is a striped rally car.
 */
export function CarSprite({ color, kind }: { color: string; kind: CarKind }) {
  return (
    <svg viewBox="0 0 100 44" width="100%" className="car-glow" style={{ ['--car' as string]: color, display: 'block' }} aria-hidden="true">
      <ellipse cx="50" cy="42" rx="42" ry="2.5" fill="rgba(0,0,0,.45)" />
      {kind === 'van' && (
        <>
          <Wheels />
          <rect x="3" y="7" width="92" height="30" rx="5" fill={color} />
          <rect x="3" y="7" width="92" height="30" rx="5" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />
          <rect x="9" y="11" width="52" height="22" rx="3" fill="rgba(255,255,255,.2)" />
          <rect x="64" y="11" width="22" height="22" rx="3" fill="#7dd3fc" opacity=".7" />
          <rect x="1" y="12" width="3" height="20" rx="1" fill="#ef4444" />
          <Lights x={94} />
        </>
      )}
      {kind === 'hatch' && (
        <>
          <Wheels />
          <rect x="5" y="8" width="90" height="28" rx="13" fill={color} />
          <rect x="30" y="12" width="34" height="20" rx="7" fill="#0b1220" opacity=".85" />
          <polygon points="60,12 72,15 72,29 60,32" fill="#7dd3fc" opacity=".7" />
          <rect x="3" y="14" width="3" height="16" rx="1" fill="#ef4444" />
          <Lights x={94} />
        </>
      )}
      {kind === 'coupe' && (
        <>
          <Wheels />
          <path d="M4 12 Q4 8 12 8 L68 9 Q92 13 98 22 Q92 31 68 35 L12 36 Q4 36 4 32 Z" fill={color} />
          <rect x="1" y="8" width="6" height="28" rx="1.5" fill="#0b1220" opacity=".8" />
          <rect x="28" y="14" width="28" height="16" rx="7" fill="#0b1220" opacity=".9" />
          <polygon points="52,14 66,17.5 66,26.5 52,30" fill="#7dd3fc" opacity=".75" />
          <path d="M70 22 H92" stroke="#fff" strokeWidth="2" opacity=".35" strokeLinecap="round" />
          <Lights x={96} />
        </>
      )}
      {kind === 'racer' && (
        <>
          <Wheels big />
          <rect x="1" y="6" width="8" height="32" rx="1.5" fill={color} />
          <rect x="1" y="6" width="8" height="32" rx="1.5" fill="none" stroke="#0b1220" strokeWidth="1" />
          <path d="M9 18 L78 16.5 L98 21 L98 23 L78 27.5 L9 26 Z" fill={color} />
          <rect x="88" y="8" width="7" height="28" rx="1.5" fill={color} opacity=".95" />
          <rect x="88" y="8" width="7" height="28" rx="1.5" fill="none" stroke="#0b1220" strokeWidth="1" />
          <ellipse cx="50" cy="22" rx="8" ry="4.2" fill="#0b1220" />
          <circle cx="50" cy="22" r="2.4" fill="#fff" opacity=".85" />
        </>
      )}
      {kind === 'player' && (
        <>
          <Wheels />
          <path d="M4 12 Q4 8 12 8 L68 9 Q92 13 98 22 Q92 31 68 35 L12 36 Q4 36 4 32 Z" fill={color} />
          <path d="M6 22 H94" stroke="#fff" strokeWidth="4" opacity=".9" />
          <rect x="1" y="8" width="6" height="28" rx="1.5" fill="#0b1220" opacity=".8" />
          <rect x="28" y="14" width="28" height="16" rx="7" fill="#0b1220" opacity=".9" />
          <polygon points="52,14 66,17.5 66,26.5 52,30" fill="#7dd3fc" opacity=".8" />
          <Lights x={96} />
        </>
      )}
    </svg>
  );
}
