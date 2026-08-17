import React from 'react';
export function Button({variant='primary', size='md', children, icon, disabled=false, ...rest}) {
  const sizes = {sm:{padding:'8px 14px',fontSize:'var(--fs-sm)'}, md:{padding:'11px 20px',fontSize:'var(--fs-base)'}, lg:{padding:'14px 26px',fontSize:'var(--fs-md)'}};
  const variants = {
    primary:{background:'var(--accent-500)', color:'var(--text-on-accent)', border:'1px solid transparent'},
    secondary:{background:'var(--surface-card)', color:'var(--text-primary)', border:'1px solid var(--border-default)'},
    ghost:{background:'transparent', color:'var(--accent-600)', border:'1px solid transparent'},
  };
  const base = {
    fontFamily:'var(--font-body)', fontWeight:'var(--fw-semibold)', borderRadius:'var(--radius-pill)',
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px', whiteSpace:'nowrap', cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1, transition:'transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast)',
  };
  return React.createElement('button', {
    disabled, ...rest,
    style:{...base, ...sizes[size], ...variants[variant]},
    onMouseDown: e => { if(!disabled) e.currentTarget.style.transform='scale(0.97)'; },
    onMouseUp: e => { e.currentTarget.style.transform='scale(1)'; },
    onMouseLeave: e => { e.currentTarget.style.transform='scale(1)'; },
  }, icon, children);
}
