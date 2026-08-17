import React from 'react';
export function Tabs({items, active, onChange}) {
  return React.createElement('div', {style:{display:'flex', gap:24, borderBottom:'1px solid var(--border-subtle)', fontFamily:'var(--font-body)'}},
    items.map(item => React.createElement('button', {
      key:item, onClick:()=>onChange(item),
      style:{
        background:'none', border:'none', padding:'10px 2px', cursor:'pointer', fontSize:'var(--fs-base)',
        fontWeight: item===active ? 700 : 500, color: item===active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderBottom: item===active ? '2px solid var(--accent-500)' : '2px solid transparent', marginBottom:-1,
      }
    }, item))
  );
}
