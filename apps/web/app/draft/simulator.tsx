'use client';

import { useMemo, useState } from 'react';
import {
  TEMPLATES,
  applyAction,
  bansOf,
  currentStep,
  newDraft,
  picksOf,
  suggest,
  undoAction,
  usedBrawlers,
  type Team,
} from '@brawlstats/draft';

interface AiAdvice {
  summary: string;
  ranking: { brawler: string; reason: string }[];
}

const SLOTS = 3;
const MODES = Object.entries(TEMPLATES).map(([id, t]) => [id, t.label] as const);

const titleCase = (name: string) =>
  name
    .toLowerCase()
    .replace(/(^|[\s.-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());

export function DraftSimulator({ roster, aiEnabled }: { roster: string[]; aiEnabled: boolean }) {
  const [state, setState] = useState(() => newDraft(MODES[0]![0]));
  const [myTeam, setMyTeam] = useState<Team>('A');
  const [filter, setFilter] = useState('');
  const [tag, setTag] = useState('');
  const [pool, setPool] = useState<{ name: string; brawlers: string[] } | null>(null);
  const [poolError, setPoolError] = useState('');
  const [advice, setAdvice] = useState<AiAdvice | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const step = currentStep(state);
  const used = usedBrawlers(state);
  const maps = Object.keys(TEMPLATES[state.mode]?.maps ?? {});
  const mapNote = TEMPLATES[state.mode]?.maps[state.map]?.note;

  // El pool solo limita las sugerencias de los picks de mi equipo.
  const activePool = step?.type === 'pick' && step.team === myTeam ? pool?.brawlers : undefined;
  const suggestions = useMemo(
    () => suggest(state, { roster, pool: activePool, limit: 10 }),
    [state, roster, activePool],
  );

  const choices = roster.filter(
    (b) => !used.has(b) && titleCase(b).toLowerCase().includes(filter.trim().toLowerCase()),
  );

  function choose(brawler: string) {
    setState((s) => applyAction(s, brawler));
    setAdvice(null);
    setAiError('');
  }

  function reset(patch: Partial<typeof state> = {}) {
    setState((s) => ({ ...newDraft(s.mode, s.map, s.firstTeam), ...patch, actions: [] }));
    setAdvice(null);
    setAiError('');
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

  async function askAi() {
    setAiBusy(true);
    setAiError('');
    try {
      const res = await fetch('/draft/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, pool: activePool }),
      });
      const body = (await res.json()) as AiAdvice & { message?: string };
      if (!res.ok) throw new Error(body.message ?? 'La IA no respondió');
      setAdvice(body);
    } catch (err) {
      setAdvice(null);
      setAiError(err instanceof Error ? err.message : 'La IA no respondió');
    } finally {
      setAiBusy(false);
    }
  }

  const teamColumn = (team: Team) => {
    const bans = bansOf(state, team);
    const picks = picksOf(state, team);
    const active = step?.team === team;
    return (
      <section className={`team${active ? ' active' : ''}`} aria-label={`Equipo ${team}`}>
        <h3>
          Equipo {team}
          {team === myTeam ? ' (tú)' : ''}
        </h3>
        <p className="slot-title">Bans</p>
        <ul className="slots">
          {Array.from({ length: SLOTS }, (_, i) => (
            <li key={i} className={`ban${bans[i] ? ' filled' : ''}`}>
              {bans[i] ? titleCase(bans[i]!) : '—'}
            </li>
          ))}
        </ul>
        <p className="slot-title">Picks</p>
        <ul className="slots">
          {Array.from({ length: SLOTS }, (_, i) => (
            <li key={i} className={`pick${picks[i] ? ' filled' : ''}`}>
              {picks[i] ? titleCase(picks[i]!) : '—'}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="sim">
      <div className="config">
        <label>
          Modo
          <select value={state.mode} onChange={(e) => reset({ mode: e.target.value, map: '' })}>
            {MODES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mapa (opcional)
          <input
            list="maps"
            value={state.map}
            placeholder="Sin mapa"
            onChange={(e) => setState((s) => ({ ...s, map: e.target.value }))}
          />
          <datalist id="maps">
            {maps.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label>
          Empieza
          <select
            value={state.firstTeam}
            onChange={(e) => reset({ firstTeam: e.target.value as Team })}
          >
            <option value="A">Equipo A</option>
            <option value="B">Equipo B</option>
          </select>
        </label>
        <label>
          Tu equipo
          <select value={myTeam} onChange={(e) => setMyTeam(e.target.value as Team)}>
            <option value="A">Equipo A</option>
            <option value="B">Equipo B</option>
          </select>
        </label>
      </div>
      {mapNote && <p className="muted">Mapa: {mapNote}.</p>}

      <div className="pool">
        <input
          value={tag}
          placeholder="Tu tag (opcional) para usar solo tus brawlers"
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

      <div className={`turn${step ? '' : ' done'}`} role="status">
        {step
          ? `Turno del equipo ${step.team}${step.team === myTeam ? ' (tú)' : ''}: ${
              step.type === 'ban' ? 'banear' : 'elegir'
            } un brawler (${state.actions.length + 1}/12)`
          : 'Draft terminado'}
      </div>

      <div className="board">
        {teamColumn('A')}
        {teamColumn('B')}
      </div>

      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={state.actions.length === 0}
          onClick={() => setState(undoAction)}
        >
          Deshacer
        </button>
        <button type="button" className="secondary" onClick={() => reset()}>
          Reiniciar
        </button>
      </div>

      {step && (
        <>
          <h2>Sugerencias</h2>
          <ol className="suggestions">
            {suggestions.map((s) => (
              <li key={s.brawler}>
                <div>
                  <strong>{titleCase(s.brawler)}</strong>
                  <span className="muted"> · {s.score}</span>
                  {s.reasons.length > 0 && <p className="reasons">{s.reasons.join('. ')}.</p>}
                </div>
                <button type="button" onClick={() => choose(s.brawler)}>
                  {step.type === 'ban' ? 'Banear' : 'Elegir'}
                </button>
              </li>
            ))}
            {suggestions.length === 0 && (
              <li className="muted">Ningún brawler de tu lista está disponible.</li>
            )}
          </ol>

          <div className="ai">
            <button
              type="button"
              className="secondary"
              onClick={askAi}
              disabled={!aiEnabled || aiBusy}
              title={aiEnabled ? undefined : 'La IA no está configurada en este servidor'}
            >
              {aiBusy ? 'Pensando…' : 'Pedir opinión de IA'}
            </button>
            {!aiEnabled && <span className="muted"> La IA no está configurada.</span>}
            {aiError && <p className="error">{aiError}</p>}
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
                      <button type="button" onClick={() => choose(r.brawler)}>
                        {step.type === 'ban' ? 'Banear' : 'Elegir'}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <h2>Todos los brawlers</h2>
          <input
            value={filter}
            placeholder="Buscar brawler"
            aria-label="Buscar brawler"
            onChange={(e) => setFilter(e.target.value)}
          />
          <ul className="roster">
            {choices.map((b) => (
              <li key={b}>
                <button type="button" className="secondary" onClick={() => choose(b)}>
                  {titleCase(b)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
