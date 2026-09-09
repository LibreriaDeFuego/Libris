'use client';

import { useState } from 'react';
import { CARD_STYLES, CARD_COLORS, DEFAULT_CARD_COLOR_BY_STYLE } from '@/lib/quoteFeedCard';
import { QuoteFeedCard } from '@/components/QuoteFeedCard';

const labelStyle = {
  fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
};

// Selector de la estética propia de una cita (migración 050) — estilo
// (layout) + color de fondo, con vista previa en vivo (el mismo
// QuoteFeedCard que va a mostrar el feed, no una aproximación aparte).
// No confundir con StyleSwatch/QUOTE_STYLES (NewCommentForm.jsx) — ese
// selector es para la tarjeta que se arma como imagen, para compartir en
// Instagram; este es para cómo se ve la cita adentro de la propia app.
//
// Elegir un estilo por primera vez arrastra el color por default de ESE
// estilo (DEFAULT_CARD_COLOR_BY_STYLE) — pero solo mientras la persona
// no haya tocado el color a mano todavía; en cuanto lo toca una vez, el
// color queda fijo y cambiar de estilo ya no lo pisa.
export function CardStylePicker({ style, color, onChange, quoteText, book }) {
  const [colorTouched, setColorTouched] = useState(false);

  function selectStyle(nextStyle) {
    onChange({ style: nextStyle, color: colorTouched ? color : DEFAULT_CARD_COLOR_BY_STYLE[nextStyle] });
  }

  function selectColor(nextColor) {
    setColorTouched(true);
    onChange({ style, color: nextColor });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={labelStyle}>Estilo de la cita</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CARD_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={style === s.id}
              onClick={() => selectStyle(s.id)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-2xs)', fontWeight: 700,
                border: `1px solid ${style === s.id ? 'var(--neutral-900)' : 'var(--border-default)'}`,
                background: style === s.id ? 'var(--neutral-900)' : 'var(--surface-card)',
                color: style === s.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={labelStyle}>Color de fondo</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {CARD_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={color === c.id}
              onClick={() => selectColor(c.id)}
              style={{
                width: 28, height: 28, borderRadius: 'var(--radius-round)', background: c.bg, cursor: 'pointer', padding: 0,
                border: color === c.id ? '2px solid var(--accent-500)' : '1px solid var(--border-default)',
              }}
            />
          ))}
        </div>
      </div>

      <QuoteFeedCard style={style} color={color} quoteText={quoteText?.trim() || 'Así se va a ver tu cita.'} book={book} />
    </div>
  );
}
