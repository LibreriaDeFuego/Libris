// Estética propia de las citas destacadas ADENTRO de la app (feed de
// Inicio/Perfil) — no confundir con quoteCard.js (la tarjeta que se
// arma como imagen para compartir en Instagram, otro sistema con sus
// propios 3 estilos: cover/dark/editorial).
//
// Se armaron 8 mockups (artifact aparte, con los tokens reales de la
// app) antes de elegir estos 4 — "Comilla" (comilla grande + portada
// chica), "Franja" (franja de color al borde), "Centrado" (todo
// centrado — antes era "fondo oscuro fijo", pero al separar el color
// en su propio eje pasó a ser solo el LAYOUT centrado) y "Papel" (fondo
// cálido con cinta decorativa) — y, aparte, el color de fondo, elegible
// sin importar el estilo.

export const CARD_STYLES = [
  { id: 'comilla', label: 'Comilla' },
  { id: 'franja', label: 'Franja' },
  { id: 'centrado', label: 'Centrado' },
  { id: 'papel', label: 'Papel' },
];

// Los 5 colores salen de tokens que YA existen en la app (nada nuevo
// inventado para esto) — así una cita, con cualquier combinación, sigue
// perteneciendo a la misma paleta que el resto de Libris.
export const CARD_COLORS = [
  { id: 'blanco', label: 'Blanco', bg: 'var(--surface-card)', dark: false },
  { id: 'crema', label: 'Crema', bg: 'var(--neutral-50)', dark: false },
  { id: 'coral', label: 'Coral', bg: 'var(--accent-50)', dark: false },
  { id: 'dorado', label: 'Dorado', bg: 'var(--gold-100)', dark: false },
  { id: 'noche', label: 'Noche', bg: 'var(--hero-bg)', dark: true },
];

// Combinación de partida al elegir un estilo por primera vez — "Centrado"
// arranca en "noche" (así se ve igual que el mockup original, la única
// tarjeta oscura en medio de un feed blanco) y el resto en un color claro
// acorde a su propia identidad.
export const DEFAULT_CARD_COLOR_BY_STYLE = {
  comilla: 'blanco',
  franja: 'blanco',
  centrado: 'noche',
  papel: 'crema',
};

export const DEFAULT_CARD_STYLE = 'comilla';

export function cardColorTokens(colorId) {
  const color = CARD_COLORS.find((c) => c.id === colorId) ?? CARD_COLORS[0];
  return {
    id: color.id,
    bg: color.bg,
    dark: color.dark,
    // El acento dorado (comilla, regla, cinta) se deja fijo en todos los
    // colores a propósito — ya se ve bien tanto sobre fondos claros como
    // sobre "noche" (mismo criterio que ya usaba el estilo "Centrado" del
    // mockup, con book_title en gold-300 sobre hero-bg).
    ink: color.dark ? 'var(--hero-cream)' : 'var(--text-primary)',
    inkSoft: color.dark ? 'rgba(255,248,236,.62)' : 'var(--text-tertiary)',
    border: color.dark ? 'none' : '1px solid var(--border-subtle)',
  };
}
