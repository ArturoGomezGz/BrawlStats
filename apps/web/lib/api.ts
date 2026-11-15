const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function getApiHealth(): Promise<'ok' | 'error'> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
