import Link from 'next/link';
import { notFound } from 'next/navigation';
import { normalizeTag } from '@brawlstats/brawl-client/tag';
import { DailyChart, TrophyChart } from '../../../components/charts';
import { ErrorView } from '../../../components/error-view';
import { getBattlelog, getHistory, getPlayer } from '../../../lib/api';
import { brawlerName, formatNumber, formatPercent, modeName, timeAgo } from '../../../lib/format';
import { toggleFollow } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  return { title: `#${tag} · Brawl Stats` };
}

export default async function Jugador({ params }: { params: Promise<{ tag: string }> }) {
  const tag = normalizeTag((await params).tag);
  if (!tag) notFound();

  const [player, battlelog, history] = await Promise.all([
    getPlayer(tag),
    getBattlelog(tag),
    getHistory(tag),
  ]);
  if (!player.ok) return <ErrorView result={player} />;

  const p = player.data;
  const brawlers = [...p.brawlers].sort((a, b) => b.trophies - a.trophies);
  const clubTag = p.club?.tag?.replace('#', '');

  return (
    <main>
      <Link href="/" className="back">
        ← Buscar otro jugador
      </Link>
      <header className="profile">
        <div>
          <h1>{p.name}</h1>
          <p className="muted">
            #{tag} · nivel {p.expLevel}
          </p>
          {clubTag && p.club?.name && (
            <p>
              Club: <Link href={`/club/${clubTag}`}>{p.club.name}</Link>
            </p>
          )}
        </div>
        <form action={toggleFollow}>
          <input type="hidden" name="tag" value={tag} />
          <input type="hidden" name="follow" value={String(!p.tracked)} />
          <button type="submit" className={p.tracked ? 'secondary' : undefined}>
            {p.tracked ? 'Dejar de seguir' : 'Seguir jugador'}
          </button>
        </form>
      </header>

      <section className="stats">
        <div>
          <strong>{formatNumber(p.trophies)}</strong>
          <span>Trofeos</span>
        </div>
        <div>
          <strong>{formatNumber(p.highestTrophies)}</strong>
          <span>Récord</span>
        </div>
        <div>
          <strong>{formatNumber(p['3vs3Victories'] ?? 0)}</strong>
          <span>Victorias 3v3</span>
        </div>
        <div>
          <strong>{battlelog.ok ? formatPercent(battlelog.data.winRate) : '—'}</strong>
          <span>Win rate reciente</span>
        </div>
      </section>

      <section>
        <h2>Historial</h2>
        {!p.tracked ? (
          <p className="muted">
            Sigue a este jugador para guardar sus batallas y ver su progreso de trofeos y su win
            rate por día. La API de Supercell solo conserva las últimas 25 batallas.
          </p>
        ) : history.ok ? (
          <>
            <p className="muted">{formatNumber(history.data.totalBattles)} batallas guardadas.</p>
            <h3>Trofeos</h3>
            <TrophyChart points={history.data.trophies} />
            <h3>Victorias y derrotas por día</h3>
            <DailyChart days={history.data.daily} />
            <p className="legend">
              <span className="swatch win" /> Victorias <span className="swatch loss" /> Derrotas
            </p>
          </>
        ) : (
          <p className="error">No pudimos cargar el historial.</p>
        )}
      </section>

      <section>
        <h2>Últimas batallas</h2>
        {battlelog.ok ? (
          battlelog.data.battles.length === 0 ? (
            <p className="muted">Este jugador no tiene batallas recientes.</p>
          ) : (
            <ul className="battles">
              {battlelog.data.battles.map((b) => (
                <li key={b.battleTime} className={b.result ?? 'none'}>
                  <span className="result">
                    {b.result === 'victory'
                      ? 'Victoria'
                      : b.result === 'defeat'
                        ? 'Derrota'
                        : b.result === 'draw'
                          ? 'Empate'
                          : b.rank
                            ? `Puesto ${b.rank}`
                            : '—'}
                  </span>
                  <span>
                    {modeName(b.mode)}
                    {b.map ? ` · ${b.map}` : ''}
                  </span>
                  <span>{brawlerName(b.brawler)}</span>
                  <span className="muted">
                    {b.trophyChange ? `${b.trophyChange > 0 ? '+' : ''}${b.trophyChange} · ` : ''}
                    {timeAgo(b.battleTime)}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="error">No pudimos cargar las batallas.</p>
        )}
      </section>

      <section>
        <h2>Brawlers ({brawlers.length})</h2>
        <ul className="brawlers">
          {brawlers.map((b) => (
            <li key={b.id}>
              <strong>{brawlerName(b.name)}</strong>
              <span>Poder {b.power}</span>
              <span>{formatNumber(b.trophies)} 🏆</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
