import { describe, expect, it } from 'vitest';
import { normalizeTag } from './tag';

describe('normalizeTag', () => {
  it('quita el # y pasa a mayúsculas', () => {
    expect(normalizeTag('#2pp')).toBe('2PP');
  });

  it('cambia la letra O por 0 y quita espacios', () => {
    expect(normalizeTag(' #8q o9 ')).toBe('8Q09');
  });

  it('rechaza caracteres que no usa Supercell', () => {
    expect(normalizeTag('#ABC')).toBeNull();
    expect(normalizeTag('')).toBeNull();
  });
});
