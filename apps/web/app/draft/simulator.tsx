'use client';

import { useState } from 'react';
import {
  MAX_BANS,
  MAX_PICKS_PER_TEAM,
  TEMPLATES,
  addFree,
  bannedBrawlers,
  newDraft,
  picksOf,
  removeBrawler,
  suggestFor,
  usedBrawlers,
  type DraftState,
  type StepType,
  type Team,
} from '@brawlstats/draft';
import type { BrawlerImage, MapInfo } from '../../lib/brawlify';

interface Advice {
  summary: string;
  ranking: { brawler: string; reason: string }[];
  /** true si salió de las plantillas porque la IA no está disponible. */
  fallback?: boolean;
}

type View = 'mode' | 'map' | 'bans' | 'picks';
const VIEWS: { id: View; label: string }[] = [
  { id: 'mode', label: '1. Modo' },
  { id: 'map', label: '2. Mapa' },
  { id: 'bans', label: '3. Bans' },
  { id: 'picks', label: '4. Picks' },
];
const MODES = Object.entries(TEMPLATES).map(([id, t]) => [id, t.label] as const);
const TEAMS: Team[] = ['A', 'B'];

const titleCase = (name: string) =>
  name
    .toLowerCase()
    .replace(/(^|[\s.-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());

interface Target {
  type: StepType;
  team: Team;
}

function Portrait({ image }: { image?: BrawlerImage }) {
  if (!image) return null;
  return (
    <img
      className="portrait"
      src={image.src}
      alt=""
      loading="lazy"
      width={40}
      height={40}
      onError={(e) => {
        const img = e.currentTarget;
        if (image.fallback && img.src !== image.fallback) img.src = image.fallback;
        else img.style.visibility = 'hidden';
      }}
    />
  );
}

export function DraftSimulator({
  roster,
  aiEnabled,
  maps = [],
  images = {},
}: {
  roster: string[];
  aiEnabled: boolean;
  maps?: MapInfo[];
  images?: Record<string, BrawlerImage>;
}) {
  const [view, setView] = useState<View>('mode');
  const [state, setState] = useState<DraftState>(() => newDraft(MODES[0]![0]));
  const [target, setTarget] = useState<Target | null>(null);
  const [filter, setFilter] = useState('');
  const [myTeam, setMyTeam] = useState<Team>('A');
  const [tag, setTag] = useState('');
  const [pool, setPool] = useState<{ name: string; brawlers: string[] } | null>(null);
  const [poolError, setPoolError] = useState('');
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const template = TEMPLATES[state.mode];
  const modeMaps: MapInfo[] = [
    ...maps.filter((m) => m.mode === state.mode),
    ...Object.keys(template?.maps ?? {})
      .filter((n) => !maps.some((m) => m.mode === state.mode && m.name === n))
      .map((name) => ({ name, mode: state.mode })),
  ];
  const used = usedBrawlers(state);
  const myPicks = picksOf(state, myTeam).length;

  function add(brawler: string) {
    const t: Target | null = view === 'bans' ? { type: 'ban', team: 'A' } : target;
    if (!t) return;
    setState((s) => addFree(s, { ...t, brawler }));
    setTarget(null);
    setFilter('');
    setAdvice(null);
  }

  function remove(brawler: string) {
    setState((s) => removeBrawler(s, brawler));
    setAdvice(null);
  }

  function go(next: View) {
    setView(next);
    setTarget(null);
    setFilter('');
  }

  function restart() {
    setState(newDraft(MODES[0]![0]));
    setAdvice(null);
    setError('');
    go('mode');
  }

  async function loadPool() {
    setPoolError('');
    const res = await fetch(`/draft/pool?tag=${encodeURIComponent(tag)}`);
    const body = (await res.json()) as { name?: string; brawlers?: string[]; message?: string };
    if (!res.ok || !body.brawlers) {
      setPool(null);
      setPoolError(body.message ?? 'No se pudo cargar ese jugador');
      return;
    }
    setPool({ name: body.name ?? tag, brawlers: body.brawlers });
  }

  /** Solo se llama a la IA cuando el usuario lo pide. */
  async function suggest() {
    setBusy(true);
    setError('');
    const step = { type: 'pick' as const, team: myTeam };
    const poolList = pool?.brawlers;
    try {
      if (!aiEnabled) throw new Error('disabled');
      const res = await fetch('/draft/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, step, pool: poolList }),
      });
      const body = (await res.json()) as Advice & { message?: string };
      if (!res.ok) throw new Error(body.message ?? 'La IA no respondió');
      setAdvice(body);
    } catch {
      // Sin IA (o si falla) se usan las plantillas para no dejar al usuario sin sugerencia.
      const top = suggestFor(state, step, { roster, pool: poolList, limit: 3 });
      setAdvice({
        summary: aiEnabled
          ? 'La IA no respondió; estas son las sugerencias de las plantillas.'
          : 'La IA no está configurada; estas son las sugerencias de las plantillas.',
        ranking: top.map((s) => ({
          brawler: s.brawler,
          reason: s.reasons.join('. ') || 'Buen nivel en este modo',
        })),
        fallback: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const slots = (team: Team, type: StepType) => {
    const list = picksOf(state, team);
    const max = MAX_PICKS_PER_TEAM;
    return (
      <ul className="slots">
        {Array.from({ length: max }, (_, i) => {
          const brawler = list[i];
          if (brawler) {
            return (
              <li key={i} className={`filled ${type}`}>
                <Portrait image={images[brawler]} />
                <span>{titleCase(brawler)}</span>
                <button type="button" className="link" onClick={() => remove(brawler)}>
                  quitar
                </button>
              </li>
            );
          }
          const selected = target?.team === team && target.type === type;
          return (
            <li key={i} className={selected ? 'selected' : ''}>
              <button type="button" className="link" onClick={() => setTarget({ team, type })}>
                {selected ? 'Elige abajo…' : `+ Agregar ${type === 'ban' ? 'ban' : 'pick'}`}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const banned = bannedBrawlers(state);

  const board = () => (
    <div className="board">
      {TEAMS.map((team) => (
        <section key={team} className="team" aria-label={`Equipo ${team}`}>
          <h3>
            Equipo {team}
            {team === myTeam ? ' (tú)' : ''}
          </h3>
          <p className="slot-title">Picks</p>
          {slots(team, 'pick')}
        </section>
      ))}
    </div>
  );

  /** Bans compartidos: sin equipo ni orden, y uno repetido por ambos equipos cuenta una vez. */
  const bansPanel = (editable: boolean) => (
    <div className="bans">
      <p className="slot-title">
        Bans ({banned.length}/{MAX_BANS})
      </p>
      <ul className="chips">
        {banned.length === 0 && <li className="muted small">Ninguno</li>}
        {banned.map((b) => (
          <li key={b} className="chip">
            <Portrait image={images[b]} />
            <span>{titleCase(b)}</span>
            {editable && (
              <button type="button" className="link" onClick={() => remove(b)}>
                quitar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  const pickerTarget: Target | null =
    view === 'bans' ? (banned.length < MAX_BANS ? { type: 'ban', team: 'A' } : null) : target;
  const picker = pickerTarget && (
    <div className="picker">
      <h3>
        {pickerTarget.type === 'ban' ? 'Banear un brawler' : `Pick del equipo ${pickerTarget.team}`}
      </h3>
      <input
        value={filter}
        autoFocus
        placeholder="Buscar brawler"
        aria-label="Buscar brawler"
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="roster">
        {roster
          .filter(
            (b) => !used.has(b) && titleCase(b).toLowerCase().includes(filter.trim().toLowerCase()),
          )
          .map((b) => (
            <li key={b}>
              <button type="button" className="secondary tile" onClick={() => add(b)}>
                <Portrait image={images[b]} />
                <span>{titleCase(b)}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );

  const nav = (back: View | null, next: View | null, nextLabel = 'Continuar') => (
    <div className="actions">
      {back && (
        <button type="button" className="secondary" onClick={() => go(back)}>
          Atrás
        </button>
      )}
      {next && (
        <button type="button" onClick={() => go(next)}>
          {nextLabel}
        </button>
      )}
      <button type="button" className="secondary" onClick={restart}>
        Reiniciar
      </button>
    </div>
  );

  return (
    <div className="sim">
      <ol className="stepper" aria-label="Pasos">
        {VIEWS.map((v) => (
          <li key={v.id} className={v.id === view ? 'current' : ''}>
            {v.label}
          </li>
        ))}
      </ol>

      {view === 'mode' && (
        <section>
          <h2>¿Qué modo se juega?</h2>
          <ul className="modes">
            {MODES.map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  className={state.mode === id ? '' : 'secondary'}
                  onClick={() => {
                    setState(newDraft(id));
                    setAdvice(null);
                    go('map');
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'map' && (
        <section>
          <h2>¿En qué mapa? ({template?.label})</h2>
          {modeMaps.length > 0 && (
            <ul className="maps">
              {modeMaps.map((m) => (
                <li key={m.name}>
                  <button
                    type="button"
                    className={`map-card ${state.map === m.name ? 'selected' : ''}`}
                    onClick={() => setState((s) => ({ ...s, map: m.name }))}
                  >
                    {m.image && <img src={m.image} alt="" loading="lazy" />}
                    <span>{m.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            value={state.map}
            placeholder="¿No aparece? Escribe el nombre del mapa (opcional)"
            aria-label="Mapa"
            onChange={(e) => setState((s) => ({ ...s, map: e.target.value }))}
          />
          {template?.maps[state.map]?.note && (
            <p className="muted">{template.maps[state.map]!.note}.</p>
          )}
          {nav('mode', 'bans', state.map.trim() ? 'Continuar' : 'Continuar sin mapa')}
        </section>
      )}

      {view === 'bans' && (
        <section>
          <h2>Bans de la partida</h2>
          <p>
            Agrega los brawlers baneados en la partida, en cualquier orden y sin importar qué equipo
            los baneó. Si los dos equipos banearon el mismo, agrégalo una sola vez.
          </p>
          {bansPanel(true)}
          {picker}
          {nav('map', 'picks')}
        </section>
      )}

      {view === 'picks' && (
        <section>
          <h2>Picks</h2>
          <p>
            Agrega los picks de ambos equipos en el orden que quieras. Puedes quitar cualquiera.
          </p>
          <div className="config">
            <label>
              Tu equipo
              <select value={myTeam} onChange={(e) => setMyTeam(e.target.value as Team)}>
                <option value="A">Equipo A</option>
                <option value="B">Equipo B</option>
              </select>
            </label>
          </div>
          <div className="pool">
            <input
              value={tag}
              placeholder="Tu tag (opcional) para sugerir solo con tus brawlers"
              aria-label="Tu tag"
              onChange={(e) => setTag(e.target.value)}
            />
            <button type="button" className="secondary" onClick={loadPool} disabled={!tag.trim()}>
              Cargar mis brawlers
            </button>
            {pool && (
              <span className="muted">
                {pool.name}: {pool.brawlers.length} brawlers{' '}
                <button type="button" className="link" onClick={() => setPool(null)}>
                  quitar
                </button>
              </span>
            )}
            {poolError && <span className="error">{poolError}</span>}
          </div>

          {bansPanel(false)}
          {board()}
          {picker}

          <div className="ai">
            <button
              type="button"
              onClick={suggest}
              disabled={busy || myPicks >= MAX_PICKS_PER_TEAM}
            >
              {busy ? 'Pensando…' : 'Sugerir con IA'}
            </button>
            <span className="muted">
              {' '}
              {myPicks >= MAX_PICKS_PER_TEAM
                ? 'Tu equipo ya tiene sus picks.'
                : `Sugiere el siguiente pick del equipo ${myTeam}.`}
            </span>
            {error && <p className="error">{error}</p>}
            {advice && (
              <div className="advice">
                <p>{advice.summary}</p>
                <ol>
                  {advice.ranking.map((r) => (
                    <li key={r.brawler}>
                      <div>
                        <strong>{titleCase(r.brawler)}</strong>
                        <p className="reasons">{r.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setState((s) =>
                            addFree(s, { type: 'pick', team: myTeam, brawler: r.brawler }),
                          );
                          setAdvice(null);
                        }}
                      >
                        Elegir
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          {nav('bans', null)}
        </section>
      )}
    </div>
  );
}
