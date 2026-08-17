import React from 'react';
export function Avatar({name='', src, size=40}) {
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const palette = ['var(--accent-500)','var(--gold-500)','var(--success)','var(--neutral-600)'];
  const idx = name.length % palette.length;
  return src ? React.createElement('img', {src, alt:name, style:{width:size,height:size,borderRadius:'var(--radius-round)',objectFit:'cover'}}) :
  React.createElement('div', {style:{
    width:size, height:size, borderRadius:'var(--radius-round)', background:palette[idx], color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-body)', fontWeight:'var(--fw-semibold)',
    fontSize:size*0.38,
  }}, initials);
}
