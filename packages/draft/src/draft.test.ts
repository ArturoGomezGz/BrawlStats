import { describe, expect, it } from 'vitest';
import {
  addFree,
  applyAction,
  buildSteps,
  currentStep,
  KNOWN_BRAWLERS,
  newDraft,
  picksOf,
  removeBrawler,
  suggestFor,
  suggest,
  undoAction,
} from './index.js';

describe('formato', () => {
  it('3 bans por equipo alternados y picks 1-2-2-1', () => {
    const steps = buildSteps('A');
    expect(steps).toHaveLength(12);
    expect(steps.slice(0, 6).map((s) => `${s.type}${s.team}`)).toEqual([
      'banA',
      'banB',
      'banA',
      'banB',
      'banA',
      'banB',
    ]);
    expect(
      steps
        .slice(6)
        .map((s) => s.team)
        .join(''),
    ).toBe('ABBAAB');
  });
});

describe('estado', () => {
  it('avanza, impide repetir y deshace', () => {
    let s = newDraft('gemGrab');
    s = applyAction(s, 'COLT');
    expect(() => applyAction(s, 'COLT')).toThrow();
    expect(currentStep(s)).toEqual({ type: 'ban', team: 'B' });
    expect(undoAction(s).actions).toHaveLength(0);
  });

  it('termina tras todos los pasos', () => {
    let s = newDraft('gemGrab');
    for (const b of KNOWN_BRAWLERS.slice(0, 12)) s = applyAction(s, b);
    expect(currentStep(s)).toBeNull();
    expect(suggest(s, { roster: KNOWN_BRAWLERS })).toEqual([]);
    expect(picksOf(s, 'A')).toHaveLength(3);
  });
});

describe('sugerencias', () => {
  const roster = KNOWN_BRAWLERS;

  it('no sugiere brawlers ya usados', () => {
    const s = applyAction(newDraft('brawlBall'), 'EL PRIMO');
    const names = suggest(s, { roster, limit: 200 }).map((x) => x.brawler);
    expect(names).not.toContain('EL PRIMO');
  });

  it('un enemigo elegido sube a su counter y baja a quien pierde contra él', () => {
    const bans = ['SHELLY', 'COLT', 'BULL', 'BO', 'CARL', 'RICO'];
    const run = (firstPick?: string) => {
      let s = newDraft('gemGrab', '', 'B'); // B abre
      for (const b of bans) s = applyAction(s, b);
      if (firstPick) s = applyAction(s, firstPick);
      return suggest(s, { roster, limit: 200 });
    };
    const score = (list: ReturnType<typeof run>, name: string) =>
      list.find((x) => x.brawler === name)!.score;
    const before = run('POCO'); // pick de B que no afecta a Edgar
    const after = run('PIPER');
    expect(score(after, 'EDGAR') - score(before, 'EDGAR')).toBeGreaterThan(10);
    expect(after.find((x) => x.brawler === 'EDGAR')?.reasons.join(' ')).toContain(
      'Counter de PIPER',
    );
  });

  it('en un ban prioriza lo más fuerte del modo', () => {
    const top = suggest(newDraft('gemGrab'), { roster, limit: 5 }).map((x) => x.brawler);
    expect(
      top.some((b) => ['SANDY', 'GALE', 'EMZ', 'AMBER', 'POCO', 'PAM', 'GENE'].includes(b)),
    ).toBe(true);
  });

  it('respeta la lista de brawlers propios en los picks', () => {
    let s = newDraft('heist');
    for (let i = 0; i < 6; i++) s = applyAction(s, KNOWN_BRAWLERS[i]!);
    const list = suggest(s, { roster, pool: ['SHELLY', 'COLT'] });
    expect(list.map((x) => x.brawler).sort()).toEqual(['COLT', 'SHELLY']);
  });
});

describe('draft libre', () => {
  it('permite cualquier orden, limita por equipo y deja quitar', () => {
    let s = newDraft('brawlBall');
    s = addFree(s, { type: 'pick', team: 'B', brawler: 'PIPER' });
    s = addFree(s, { type: 'pick', team: 'A', brawler: 'POCO' });
    expect(() => addFree(s, { type: 'pick', team: 'A', brawler: 'POCO' })).toThrow();
    s = addFree(s, { type: 'pick', team: 'A', brawler: 'BULL' });
    s = addFree(s, { type: 'pick', team: 'A', brawler: 'MAX' });
    expect(() => addFree(s, { type: 'pick', team: 'A', brawler: 'EDGAR' })).toThrow('lugar');
    expect(picksOf(removeBrawler(s, 'BULL'), 'A')).toEqual(['POCO', 'MAX']);
  });

  it('sugiere para un equipo y tipo sin importar el turno', () => {
    let s = newDraft('brawlBall');
    s = addFree(s, { type: 'pick', team: 'B', brawler: 'PIPER' });
    const list = suggestFor(s, { type: 'pick', team: 'A' }, { roster: KNOWN_BRAWLERS });
    expect(list.length).toBeGreaterThan(0);
    expect(list.map((x) => x.brawler)).not.toContain('PIPER');
  });
});
