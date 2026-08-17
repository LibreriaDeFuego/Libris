import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function SpoilerBlock({children}) {
  const [revealed, setRevealed] = React.useState(false);
  if (revealed) return React.createElement('div', {style:{fontFamily:'var(--font-body)', fontSize:'var(--fs-base)', color:'var(--text-primary)', lineHeight:'var(--lh-normal)'}}, children);
  return React.createElement('button', {
    onClick:()=>setRevealed(true),
    style:{
      width:'100%', textAlign:'left', background:'var(--surface-sunken)', border:'1px dashed var(--border-strong)', borderRadius:'var(--radius-md)',
      padding:'12px 16px', fontFamily:'var(--font-body)', fontSize:'var(--fs-sm)', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
    }
  }, React.createElement(Icon, {name:'eye-off', size:16}), 'Este comentario tiene spoiler · toca para ver');
}
