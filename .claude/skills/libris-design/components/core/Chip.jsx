import React from 'react';
export function Chip({children, tone='neutral', selected=false, onClick}) {
  const tones = {
    neutral:{bg: selected ? 'var(--accent-500)' : 'var(--surface-card)', fg: selected ? 'var(--text-on-accent)' : 'var(--text-secondary)', border: selected ? 'transparent' : 'var(--border-default)'},
    gold:{bg:'var(--gold-100)', fg:'var(--gold-700)', border:'transparent'},
  };
  const t = tones[tone];
  return React.createElement('button', {
    onClick, style:{
      background:t.bg, color:t.fg, border:`1px solid ${t.border}`, borderRadius:'var(--radius-pill)',
      padding:'6px 14px', fontFamily:'var(--font-body)', fontSize:'var(--fs-xs)', fontWeight:'var(--fw-medium)',
      cursor: onClick ? 'pointer':'default', whiteSpace:'nowrap',
    }
  }, children);
}
