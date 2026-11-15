const MODES: Record<string, string> = {
  gemGrab: 'Atrapagemas',
  brawlBall: 'Balón brawl',
  heist: 'Atraco',
  bounty: 'Caza estelar',
  hotZone: 'Zona restringida',
  knockout: 'Noqueo',
  wipeout: 'Aniquilación',
  soloShowdown: 'Supervivencia (solo)',
  duoShowdown: 'Supervivencia (dúo)',
  basketBrawl: 'Basket brawl',
  volleyBrawl: 'Voley brawl',
  payload: 'Carga',
};

export function modeName(mode: string | null): string {
  if (!mode) return 'Modo desconocido';
  return (
    MODES[mode] ?? mode.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  );
}

/** SHELLY → Shelly, EL PRIMO → El Primo */
export function brawlerName(name: string | null): string {
  if (!name) return '—';
  return name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-MX').format(n);
}

export function formatPercent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)} %`;
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}
