import React from 'react';
export function ProgressBar({value=0, label}) {
  return React.createElement('div', null,
    label && React.createElement('div', {style:{display:'flex', justifyContent:'space-between', fontSize:'var(--fs-xs)', color:'var(--text-secondary)', marginBottom:6, fontFamily:'var(--font-body)'}},
      React.createElement('span', null, label), React.createElement('span', null, `${value}%`)),
    React.createElement('div', {style:{height:8, borderRadius:'var(--radius-pill)', background:'var(--surface-sunken)', overflow:'hidden'}},
      React.createElement('div', {style:{width:`${value}%`, height:'100%', background:'var(--accent-500)', borderRadius:'var(--radius-pill)', transition:'width var(--duration-base) var(--ease-standard)'}}))
  );
}
