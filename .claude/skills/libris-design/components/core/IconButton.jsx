import React from 'react';
export function IconButton({children, size=40, active=false, ...rest}) {
  return React.createElement('button', {
    ...rest,
    style:{
      width:size, height:size, borderRadius:'var(--radius-round)', display:'inline-flex',
      alignItems:'center', justifyContent:'center', border: active ? '1px solid var(--accent-500)' : '1px solid var(--border-default)',
      background: active ? 'var(--accent-50)' : 'var(--surface-card)', color: active ? 'var(--accent-600)' : 'var(--text-secondary)',
      cursor:'pointer', transition:'background var(--duration-fast)',
    }
  }, children);
}
