import { getApiHealth } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, health] = await Promise.all([searchParams, getApiHealth()]);

  return (
    <main>
      <h1>Brawl Stats</h1>
      <p>Busca a un jugador por su tag para ver su perfil, sus brawlers y sus últimas batallas.</p>
      <form action="/buscar" method="get">
        <input name="tag" placeholder="#2PP8QL0" aria-label="Tag del jugador" required />
        <button type="submit">Buscar</button>
      </form>
      {error === 'tag' && (
        <p className="error">Ese tag no es válido. Revísalo en tu perfil del juego.</p>
      )}
      <p className="status">
        Estado de la API: <span className={health === 'ok' ? 'ok' : 'error'}>{health}</span>
      </p>
    </main>
  );
}
