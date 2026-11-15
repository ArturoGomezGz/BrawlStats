import Link from 'next/link';
import { errorText, type ApiResult } from '../lib/api';

export function ErrorView({ result }: { result: Extract<ApiResult<unknown>, { ok: false }> }) {
  return (
    <main>
      <h1>{result.error === 'not_found' ? 'No encontrado' : 'Algo salió mal'}</h1>
      <p className="error">{errorText(result.error)}</p>
      <Link href="/">Volver al buscador</Link>
    </main>
  );
}
