import React from 'react';
export function Input({placeholder, value, onChange, ...rest}) {
  return React.createElement('input', {
    placeholder, value, onChange, ...rest,
    style:{
      width:'100%', padding:'12px 16px', borderRadius:'var(--radius-md)', border:'1px solid var(--border-default)',
      background:'var(--surface-card)', color:'var(--text-primary)', fontFamily:'var(--font-body)', fontSize:'var(--fs-base)',
      outline:'none',
    },
    onFocus: e => { e.currentTarget.style.borderColor = 'var(--accent-500)'; },
    onBlur: e => { e.currentTarget.style.borderColor = 'var(--border-default)'; },
  });
}
