// Las seis insignias de capítulo (migración 067) — una por persona por
// capítulo, nunca más de una; tocar la que ya tenías puesta la saca. El
// mismo peso visual para las seis a propósito: "lo dejé aquí" no avisa
// nada grave, es solo una marca más entre las demás.
export const CHAPTER_BADGE_TYPES = [
  { kind: 'engancho', emoji: '🪝', label: 'Me enganchó', bg: '#FFD2C4', text: '#9A3F12' },
  { kind: 'corazon_roto', emoji: '💔', label: 'Me rompió el corazón', bg: '#F6D7DC', text: '#8A3B49' },
  { kind: 'risa', emoji: '😂', label: 'Me hizo reír', bg: '#FFE9A8', text: '#7A5300' },
  { kind: 'sorpresa', emoji: '😱', label: 'No lo vi venir', bg: '#DCD6F2', text: '#4B3D82' },
  { kind: 'fome', emoji: '😴', label: 'Fome', bg: '#E4E3DE', text: '#5A5952' },
  { kind: 'lo_deje', emoji: '🏳️', label: 'Lo dejé aquí', bg: '#D7E3EE', text: '#3E5570' },
];

export function badgeTypeOf(kind) {
  return CHAPTER_BADGE_TYPES.find((b) => b.kind === kind) ?? null;
}
