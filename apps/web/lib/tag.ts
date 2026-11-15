/** Caracteres que usa Supercell en los tags de jugador y club. */
const TAG_PATTERN = /^[0289PYLQGRJCUV]{3,14}$/;

/**
 * Normaliza un tag escrito por el usuario: quita '#' y espacios, pasa a mayúsculas
 * y cambia la letra O por el número 0 (error común al copiarlo del juego).
 * Devuelve null si no es un tag válido.
 */
export function normalizeTag(input: string): string | null {
  const tag = input.trim().replace(/^#/, '').replace(/\s+/g, '').toUpperCase().replace(/O/g, '0');
  return TAG_PATTERN.test(tag) ? tag : null;
}
