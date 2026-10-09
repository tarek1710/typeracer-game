export function LineChart({ title, data, unit, color, min, max }: {
  title: string; data: number[]; unit: string; color: string; min?: number; max?: number;
}) {
  const W = 360, H = 140, P = 24;
  const lo = min ?? Math.max(0, Math.floor(Math.min(...data, Infinity) - 5));
  const hi = max ?? Math.ceil(Math.max(...data, lo + 10) + 5);
  const x = (i: number) => P + (data.length <= 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (data.length - 1));
  const y = (v: number) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * P);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="rounded-xl bg-black/30 p-3">
      <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</figcaption>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Finish a race to see your trend.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title} over your last ${data.length} races`}>
          {[0, 0.5, 1].map((f) => {
            const v = lo + f * (hi - lo);
            return (
              <g key={f}>
                <line x1={P} x2={W - P / 2} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.08)" />
                <text x={P - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{v.toFixed(0)}{unit}</text>
              </g>
            );
          })}
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={color}><title>{v.toFixed(1)}{unit}</title></circle>)}
        </svg>
      )}
    </figure>
  );
}
