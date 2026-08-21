import React from 'react';
// tone='glass' es el botón circular translúcido que va sobre una foto (el
// héroe de portada): fondo de vidrio, blur y texto crema, sin importar
// active/hover — ahí el fondo siempre es la imagen, no una superficie propia.
export function IconButton({children, size=40, active=false, tone='light', ...rest}) {
  const toneStyle = tone === 'glass'
    ? { border: '1px solid rgba(255,248,236,0.18)', background: 'rgba(255,248,236,0.12)', color: 'var(--hero-cream)', backdropFilter: 'blur(14px)' }
    : {
        border: active ? '1px solid var(--accent-500)' : '1px solid var(--border-default)',
        background: active ? 'var(--accent-50)' : 'var(--surface-card)',
        color: active ? 'var(--accent-600)' : 'var(--text-secondary)',
      };
  return React.createElement('button', {
    ...rest,
    style:{
      width:size, height:size, borderRadius:'var(--radius-round)', display:'inline-flex',
      alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'background var(--duration-fast)',
      ...toneStyle,
    }
  }, children);
}
