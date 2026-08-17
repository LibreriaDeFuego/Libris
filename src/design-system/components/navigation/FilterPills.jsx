import React from 'react';
export function FilterPills({options, active, onChange}) {
  return React.createElement('div', {style:{display:'flex', gap:8, fontFamily:'var(--font-body)'}},
    options.map(opt => React.createElement('button', {
      key:opt, onClick:()=>onChange(opt),
      style:{
        padding:'7px 16px', borderRadius:'var(--radius-pill)', border: opt===active ? '1px solid transparent' : '1px solid var(--border-default)',
        background: opt===active ? 'var(--accent-500)' : 'var(--surface-card)', color: opt===active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
        fontSize:'var(--fs-sm)', fontWeight:600, cursor:'pointer',
      }
    }, opt))
  );
}
