import { KNOWN_BRAWLERS } from '@brawlstats/draft';
import { getAiEnabled, getBrawlers } from '../../lib/api';
import { DraftSimulator } from './simulator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulador de draft · Brawl Stats' };

export default async function DraftPage() {
  const [brawlers, aiEnabled] = await Promise.all([getBrawlers(), getAiEnabled()]);
  const roster =
    brawlers.ok && brawlers.data.brawlers.length > 0 ? brawlers.data.brawlers : KNOWN_BRAWLERS;

  return (
    <main className="draft">
      <a className="back" href="/">
        ← Inicio
      </a>
      <h1>Simulador de draft</h1>
      <p>
        Elige modo y mapa, haz los bans y picks por turnos y recibe sugerencias. Las plantillas son
        una estimación del meta, no estadísticas medidas.
      </p>
      <DraftSimulator roster={roster} aiEnabled={aiEnabled} />
    </main>
  );
}
