import React from 'react';
export function Slider({value=0, max=100, onChange}) {
  return React.createElement('input', {
    type:'range', min:0, max, value, onChange: e => onChange && onChange(Number(e.target.value)),
    style:{
      width:'100%', accentColor:'var(--accent-500)', height:6, borderRadius:'var(--radius-pill)',
    }
  });
}
