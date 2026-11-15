import type { HistoryResponse } from '@brawlstats/brawl-client';
import { formatNumber } from '../lib/format';

const W = 640;
const H = 180;
const PAD = { l: 48, r: 12, t: 12, b: 24 };

/** Trofeos en cada sincronización. Con un solo punto muestra solo el valor. */
export function TrophyChart({ points }: { points: HistoryResponse['trophies'] }) {
  if (points.length < 2) {
    return (
      <p className="muted">
        Aún hay un solo registro ({points[0] ? formatNumber(points[0].trophies) : '—'} trofeos). La
        gráfica aparece cuando se acumulen más sincronizaciones.
      </p>
    );
  }
  const values = points.map((p) => p.trophies);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / span) * (H - PAD.t - PAD.b);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.trophies).toFixed(1)}`)
    .join(' ');
  const first = new Date(points[0]!.takenAt);
  const last = new Date(points.at(-1)!.takenAt);
  const day = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Trofeos de ${formatNumber(values[0]!)} a ${formatNumber(values.at(-1)!)}`}
    >
      <line x1={PAD.l} x2={W - PAD.r} y1={y(min)} y2={y(min)} className="grid" />
      <line x1={PAD.l} x2={W - PAD.r} y1={y(max)} y2={y(max)} className="grid" />
      <text x={PAD.l - 6} y={y(max) + 4} textAnchor="end" className="axis">
        {formatNumber(max)}
      </text>
      <text x={PAD.l - 6} y={y(min) + 4} textAnchor="end" className="axis">
        {formatNumber(min)}
      </text>
      <text x={PAD.l} y={H - 6} className="axis">
        {day(first)}
      </text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end" className="axis">
        {day(last)}
      </text>
      <path d={path} className="line" />
      <circle cx={x(points.length - 1)} cy={y(values.at(-1)!)} r="4" className="dot" />
    </svg>
  );
}

/** Victorias y derrotas por día. */
export function DailyChart({ days }: { days: HistoryResponse['daily'] }) {
  if (days.length === 0) return <p className="muted">Todavía no hay batallas guardadas.</p>;
  const shown = days.slice(-14);
  const peak = Math.max(...shown.map((d) => d.wins + d.losses), 1);
  const bw = (W - PAD.l - PAD.r) / shown.length;
  const h = (n: number) => (n / peak) * (H - PAD.t - PAD.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Victorias y derrotas por día">
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="grid" />
      <text x={PAD.l - 6} y={H - PAD.b + 4} textAnchor="end" className="axis">
        0
      </text>
      <text x={PAD.l - 6} y={PAD.t + 8} textAnchor="end" className="axis">
        {peak}
      </text>
      {shown.map((d, i) => {
        const width = Math.min(bw * 0.7, 56);
        const bx = PAD.l + i * bw + (bw - width) / 2;
        return (
          <g key={d.date}>
            <rect
              x={bx}
              y={H - PAD.b - h(d.wins)}
              width={width}
              height={h(d.wins)}
              className="win"
            />
            <rect
              x={bx}
              y={H - PAD.b - h(d.wins) - h(d.losses)}
              width={width}
              height={h(d.losses)}
              className="loss"
            />
            {(i === 0 || i === shown.length - 1) && (
              <text x={bx + width / 2} y={H - 6} textAnchor="middle" className="axis">
                {new Date(`${d.date}T12:00:00Z`).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
