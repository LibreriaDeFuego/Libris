import React from 'react';
export function Blockquote({children, attribution}) {
  return React.createElement('div', {
    style:{
      borderRadius:'var(--radius-md)', background:'var(--gold-100)', padding:'16px 20px', fontFamily:'var(--font-display)',
    }
  },
    React.createElement('div', {style:{fontSize:'var(--fs-lg)', fontStyle:'italic', color:'var(--neutral-900)', lineHeight:'var(--lh-snug)'}}, `"${children}"`),
    attribution && React.createElement('div', {style:{fontFamily:'var(--font-body)', fontSize:'var(--fs-xs)', color:'var(--gold-700)', marginTop:8, fontWeight:600}}, attribution)
  );
}
