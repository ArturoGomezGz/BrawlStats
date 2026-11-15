/**
 * Mapas e imágenes de brawlers desde la API pública de Brawlify (api.brawlify.com).
 * Es contenido de fans, sin llave; se cachea una hora y, si falla, la pantalla sigue
 * funcionando con los datos de las plantillas y sin imágenes.
 */
const BASE = 'https://api.brawlify.com/v1';
const REVALIDATE = 3600;

export interface MapInfo {
  name: string;
  /** Id del modo como en las plantillas, por ejemplo `gemGrab`. */
  mode: string;
  image?: string;
}

export interface BrawlerImage {
  src: string;
  /** Imagen alternativa si la principal no carga. */
  fallback?: string;
}

async function get(path: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { list?: unknown };
    return Array.isArray(body.list) ? body.list : [];
  } catch {
    return [];
  }
}

/** "Gem Grab" → "gemGrab", igual que los ids de las plantillas. */
export function modeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join('');
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

export async function getMaps(): Promise<MapInfo[]> {
  const list = await get('/maps');
  const seen = new Set<string>();
  const out: MapInfo[] = [];
  for (const raw of list) {
    const m = raw as {
      name?: unknown;
      imageUrl?: unknown;
      disabled?: unknown;
      gameMode?: { name?: unknown };
    };
    const name = str(m.name);
    const mode = str(m.gameMode?.name);
    if (!name || !mode || m.disabled === true) continue;
    const key = `${modeId(mode)}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, mode: modeId(mode), image: str(m.imageUrl) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Imágenes por nombre en mayúsculas, como lo devuelve Supercell. */
export async function getBrawlerImages(): Promise<Record<string, BrawlerImage>> {
  const list = await get('/brawlers');
  const out: Record<string, BrawlerImage> = {};
  for (const raw of list) {
    const b = raw as { id?: unknown; name?: unknown; imageUrl?: unknown };
    const name = str(b.name);
    if (!name) continue;
    const id = typeof b.id === 'number' ? b.id : undefined;
    const api = str(b.imageUrl);
    const border = id ? `https://cdn.brawlify.com/brawlers/borders/${id}.png` : undefined;
    const src = border ?? api;
    if (!src) continue;
    out[name.toUpperCase()] = { src, fallback: border && api ? api : undefined };
  }
  return out;
}
