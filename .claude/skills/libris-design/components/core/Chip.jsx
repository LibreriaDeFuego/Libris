import React from 'react';
// type='button' por defecto: sin eso, un Chip dentro de un <form> se comporta
// como submit y dispara el envío al usarse como simple selector.
export function Chip({children, tone='neutral', selected=false, onClick, type='button', ...rest}) {
  const tones = {
    neutral:{bg: selected ? 'var(--accent-500)' : 'var(--surface-card)', fg: selected ? 'var(--text-on-accent)' : 'var(--text-secondary)', border: selected ? 'transparent' : 'var(--border-default)'},
    gold:{bg:'var(--gold-100)', fg:'var(--gold-700)', border:'transparent'},
  };
  const t = tones[tone];
  return React.createElement('button', {
    onClick, type, ...rest, style:{
      background:t.bg, color:t.fg, border:`1px solid ${t.border}`, borderRadius:'var(--radius-pill)',
      padding:'6px 14px', fontFamily:'var(--font-body)', fontSize:'var(--fs-xs)', fontWeight:'var(--fw-medium)',
      cursor: onClick ? 'pointer':'default', whiteSpace:'nowrap',
    }
  }, children);
}
