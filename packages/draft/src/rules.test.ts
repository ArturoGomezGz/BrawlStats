import { afterEach, describe, expect, it } from 'vitest';
import {
  addFree,
  classesOf,
  DEFAULT_DRAFT_DATA,
  getDraftData,
  newDraft,
  setDraftData,
  suggestFor,
  triangleGaps,
  validateDraftData,
} from './index.js';

const pickFor = (state: ReturnType<typeof newDraft>, team: 'A' | 'B' = 'A') =>
  suggestFor(
    state,
    { type: 'pick', team },
    { roster: Object.keys(getDraftData().brawlers), limit: 300 },
  );
const find = (list: ReturnType<typeof pickFor>, name: string) =>
  list.find((x) => x.brawler === name)!;

afterEach(() => setDraftData());

describe('clasificación', () => {
  it('permite varias clases y respeta las excepciones del video', () => {
    expect(classesOf('LOU')).toEqual(expect.arrayContaining(['control', 'antitank']));
    expect(classesOf('LOU')).not.toContain('antiassassin');
    expect(classesOf('OTIS')).toEqual(expect.arrayContaining(['antitank', 'antiassassin']));
  });

  it('los datos de fábrica son válidos', () => {
    expect(validateDraftData(DEFAULT_DRAFT_DATA)).toEqual([]);
  });
});

describe('triángulo de clases', () => {
  it('contra un tanque rival sube al antitanque y baja al control', () => {
    const none = pickFor(newDraft('gemGrab'));
    const vsTank = pickFor(
      addFree(newDraft('gemGrab'), { type: 'pick', team: 'B', brawler: 'EL PRIMO' }),
    );
    const gain = (n: string) => find(vsTank, n).score - find(none, n).score;
    expect(gain('CHESTER')).toBeGreaterThan(0);
    expect(gain('AMBER')).toBeLessThan(0);
    expect(find(vsTank, 'CHESTER').reasons.join(' ')).toContain('triángulo');
  });

  it('no cuenta doble a un multiclase contra el mismo rival', () => {
    const vsTank = pickFor(
      addFree(newDraft('gemGrab'), { type: 'pick', team: 'B', brawler: 'EL PRIMO' }),
    );
    const none = pickFor(newDraft('gemGrab'));
    // Lou es antitanque (gana) y control (pierde contra tanque): el neto es una sola ventaja.
    expect(find(vsTank, 'LOU').score - find(none, 'LOU').score).toBeLessThanOrEqual(10);
  });
});

describe('reglas por modo', () => {
  it('Balón Brawl: el antitanque pesa más de first pick', () => {
    const list = pickFor(newDraft('brawlBall'));
    expect(find(list, 'CHESTER').reasons.join(' ')).toContain('first pick ideal');
  });

  it('Atraco: premia el daño a la caja si el equipo no lo tiene', () => {
    const base = pickFor(newDraft('heist'));
    const withDmg = pickFor(
      addFree(newDraft('heist'), { type: 'pick', team: 'A', brawler: 'COLT' }),
    );
    expect(find(base, 'PENNY').reasons.join(' ')).toContain('daño a la caja');
    expect(find(withDmg, 'PENNY').reasons.join(' ')).not.toContain('daño a la caja');
  });

  it('Noqueo: un asesino de first pick se penaliza', () => {
    const list = pickFor(newDraft('knockout'));
    expect(find(list, 'EDGAR').reasons.join(' ')).toContain('first pick');
  });

  it('el último pick pesa más lo que falta', () => {
    let s = newDraft('heist');
    s = addFree(s, { type: 'pick', team: 'B', brawler: 'POCO' });
    s = addFree(s, { type: 'pick', team: 'B', brawler: 'MAX' });
    s = addFree(s, { type: 'pick', team: 'B', brawler: 'KIT' });
    s = addFree(s, { type: 'pick', team: 'A', brawler: 'BULL' });
    s = addFree(s, { type: 'pick', team: 'A', brawler: 'SHELLY' });
    const last = pickFor(s);
    expect(find(last, 'PENNY').reasons.join(' ')).toContain('último pick');
  });
});

describe('mapa', () => {
  it('el agua favorece a quien juega en agua', () => {
    const plain = pickFor({ ...newDraft('heist'), map: 'Mapa sin datos' });
    const water = pickFor({ ...newDraft('heist'), map: 'Bridge Too Far' });
    expect(find(water, 'EVE').score).toBeGreaterThan(find(plain, 'EVE').score);
    expect(find(water, 'EVE').reasons.join(' ')).toContain('Agua');
  });
});

describe('datos editables', () => {
  it('setDraftData cambia el método sin tocar el motor', () => {
    const edited = {
      ...getDraftData(),
      brawlers: { ...getDraftData().brawlers, CHESTER: { classes: ['support' as const] } },
    };
    setDraftData(edited);
    expect(classesOf('CHESTER')).toEqual(['support']);
    setDraftData();
    expect(classesOf('CHESTER')).toContain('antitank');
  });

  it('rechaza datos inválidos', () => {
    const bad = { ...getDraftData(), brawlers: { X: { classes: ['volador'] } } } as never;
    expect(validateDraftData(bad).join()).toContain('volador');
    expect(() => setDraftData(bad)).toThrow();
  });
});

describe('composición', () => {
  it('indica qué le falta al equipo del triángulo', () => {
    expect(triangleGaps([])).toEqual(['control', 'tanque o asesino', 'antitanque']);
    expect(triangleGaps(['AMBER', 'BULL', 'CHESTER'])).toEqual([]);
    expect(triangleGaps(['AMBER'])).toEqual(['tanque o asesino', 'antitanque']);
  });
});
