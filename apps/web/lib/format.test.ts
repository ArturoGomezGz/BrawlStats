import { describe, expect, it } from 'vitest';
import { brawlerName, formatPercent, modeName, timeAgo } from './format';

describe('format', () => {
  it('traduce modos conocidos y humaniza los desconocidos', () => {
    expect(modeName('gemGrab')).toBe('Atrapagemas');
    expect(modeName('newFancyMode')).toBe('New Fancy Mode');
    expect(modeName(null)).toBe('Modo desconocido');
  });

  it('pone los nombres de brawler en formato título', () => {
    expect(brawlerName('EL PRIMO')).toBe('El Primo');
    expect(brawlerName(null)).toBe('—');
  });

  it('formatea porcentajes', () => {
    expect(formatPercent(2 / 3)).toBe('67 %');
    expect(formatPercent(null)).toBe('—');
  });

  it('describe cuánto tiempo pasó', () => {
    const now = Date.parse('2026-01-01T12:00:00Z');
    expect(timeAgo('2026-01-01T11:40:00Z', now)).toBe('hace 20 minutos');
    expect(timeAgo('2026-01-01T09:00:00Z', now)).toBe('hace 3 horas');
    expect(timeAgo('2025-12-30T12:00:00Z', now)).toBe('anteayer');
  });
});
