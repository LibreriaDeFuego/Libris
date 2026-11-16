// Las seis insignias de capítulo (migración 067) — una por persona por
// capítulo, nunca más de una; tocar la que ya tenías puesta la saca. El
// mismo peso visual para las seis a propósito: "lo dejé aquí" no avisa
// nada grave, es solo una marca más entre las demás.
//
// "verb" arma la burbuja en tercera persona para quien NO la puso —
// "A Camila le {verb}", "A Camila y a Javier les {verb}", "Te {verb} a
// ti y a Camila" si vos también la pusiste. "lo_deje" no entra en ese
// molde (el sujeto hace la acción, no "le pasa algo a alguien") —
// tiene su propio armado en sentenceFor, más abajo.
export const CHAPTER_BADGE_TYPES = [
  { kind: 'engancho', emoji: '🪝', label: 'Me enganchó', bg: '#FFD2C4', text: '#9A3F12', verb: 'enganchó' },
  { kind: 'corazon_roto', emoji: '💔', label: 'Me rompió el corazón', bg: '#F6D7DC', text: '#8A3B49', verb: 'rompió el corazón' },
  { kind: 'risa', emoji: '😂', label: 'Me hizo reír', bg: '#FFE9A8', text: '#7A5300', verb: 'hizo reír' },
  { kind: 'sorpresa', emoji: '😱', label: 'No lo vi venir', bg: '#DCD6F2', text: '#4B3D82', verb: 'sorprendió' },
  { kind: 'fome', emoji: '😴', label: 'Fome', bg: '#E4E3DE', text: '#5A5952', verb: 'pareció fome' },
  { kind: 'lo_deje', emoji: '🏳️', label: 'Lo dejé aquí', bg: '#D7E3EE', text: '#3E5570', verb: null },
];

export function badgeTypeOf(kind) {
  return CHAPTER_BADGE_TYPES.find((b) => b.kind === kind) ?? null;
}

// "Camila" / "Camila y Javier" / "Camila, Javier y Ana".
function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

// La burbuja de un capítulo para UNA insignia — `names` son los demás
// (nunca incluye a quien mira, la propia ya se ve en el broche del
// nodo), `includesMe` dice si quien mira también la puso.
export function badgeSentence(kind, names, includesMe) {
  const type = badgeTypeOf(kind);
  if (!type) return '';

  if (kind === 'lo_deje') {
    if (includesMe && names.length > 0) return `Tú y ${joinNames(names)} lo dejaron aquí`;
    if (includesMe) return 'Tú lo dejaste aquí';
    if (names.length === 1) return `${names[0]} lo dejó aquí`;
    return `${joinNames(names)} lo dejaron aquí`;
  }

  if (includesMe && names.length > 0) return `Te ${type.verb} a ti y a ${joinNames(names)}`;
  if (includesMe) return `Te ${type.verb}`;
  if (names.length === 1) return `A ${names[0]} le ${type.verb}`;
  return `A ${joinNames(names)} les ${type.verb}`;
}
