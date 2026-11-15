import type {
  ApiErrorBody,
  BattlelogResponse,
  BrawlersResponse,
  Club,
  HistoryResponse,
  PlayerResponse,
} from '@brawlstats/brawl-client';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: ApiErrorBody['error']; message: string };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      ...init,
    });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    return {
      ok: false,
      error: body?.error ?? 'internal',
      message: body?.message ?? 'Error inesperado',
    };
  } catch {
    return { ok: false, error: 'unavailable', message: 'No se pudo contactar a la API' };
  }
}

export const getPlayer = (tag: string) => request<PlayerResponse>(`/players/${tag}`);
export const getBattlelog = (tag: string) =>
  request<BattlelogResponse>(`/players/${tag}/battlelog`);
export const getHistory = (tag: string) => request<HistoryResponse>(`/players/${tag}/history`);
export const getClub = (tag: string) => request<Club>(`/clubs/${tag}`);
export const setFollow = (tag: string, follow: boolean) =>
  request<{ tracked: boolean }>(`/players/${tag}/follow`, { method: follow ? 'PUT' : 'DELETE' });

export const getBrawlers = () => request<BrawlersResponse>('/brawlers');
export const getAiEnabled = async () => {
  const res = await request<{ enabled: boolean }>('/health/ai');
  return res.ok && res.data.enabled;
};
export const analyzeDraft = (body: unknown) =>
  request<{ summary: string; ranking: { brawler: string; reason: string }[] }>('/draft/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export async function getApiHealth(): Promise<'ok' | 'error'> {
  const res = await request<{ status: string }>('/health');
  return res.ok ? 'ok' : 'error';
}

/** Texto en español para cada tipo de error de la API. */
export function errorText(error: ApiErrorBody['error']): string {
  switch (error) {
    case 'invalid_tag':
      return 'Ese tag no es válido. Revísalo en tu perfil del juego.';
    case 'not_found':
      return 'No encontramos nada con ese tag.';
    case 'ai_disabled':
      return 'La IA no está configurada en este servidor.';
    case 'ai_failed':
      return 'La IA no pudo responder ahora. Intenta de nuevo.';
    case 'rate_limited':
      return 'Supercell está limitando las consultas. Intenta de nuevo en un minuto.';
    default:
      return 'No pudimos consultar los datos de Brawl Stars. Intenta de nuevo en unos minutos.';
  }
}
