import React from 'react';
export function Badge({children, tone='accent'}) {
  const tones = {
    accent:{bg:'var(--accent-500)', fg:'#fff'},
    gold:{bg:'var(--gold-500)', fg:'#fff'},
    neutral:{bg:'var(--neutral-200)', fg:'var(--text-primary)'},
  };
  const t = tones[tone];
  return React.createElement('span', {
    style:{
      background:t.bg, color:t.fg, borderRadius:'var(--radius-pill)', padding:'2px 9px',
      fontFamily:'var(--font-body)', fontSize:'11px', fontWeight:'var(--fw-semibold)', letterSpacing:'var(--ls-wide)',
      textTransform:'uppercase',
    }
  }, children);
}
