import React from 'react';
export function BookCard({title, club, chapterLabel, progress, cover}) {
  return React.createElement('div', {
    style:{
      background:'var(--neutral-900)', color:'#fff', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-md)',
      padding:16, display:'flex', gap:14, fontFamily:'var(--font-body)',
    }
  },
    React.createElement('div', {style:{
      width:64, height:92, borderRadius:'var(--radius-sm)', flexShrink:0,
      background: cover ? `center/cover no-repeat url(${cover})` : 'var(--accent-500)',
    }}),
    React.createElement('div', {style:{display:'flex', flexDirection:'column', justifyContent:'center', gap:4, minWidth:0}},
      React.createElement('div', {style:{fontFamily:'var(--font-display)', fontSize:'var(--fs-lg)', fontWeight:700, color:'#fff'}}, title),
      React.createElement('div', {style:{fontSize:'var(--fs-xs)', color:'#aaa'}}, club),
      React.createElement('div', {style:{fontSize:'var(--fs-2xs)', color:'var(--accent-500)', fontWeight:700, marginTop:2}}, `${chapterLabel} · ${progress}%`)
    )
  );
}
