import React from 'react';
export function Modal({title, children, onClose}) {
  return React.createElement('div', {
    style:{ position:'fixed', inset:0, background:'var(--surface-overlay)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:50 }
  },
    React.createElement('div', {
      style:{ background:'var(--surface-card)', borderRadius:'var(--radius-xl) var(--radius-xl) 0 0', width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto', padding:24, fontFamily:'var(--font-body)', boxShadow:'var(--shadow-lg)' }
    },
      React.createElement('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}},
        React.createElement('div', {style:{fontFamily:'var(--font-display)', fontSize:'var(--fs-xl)', fontWeight:600, color:'var(--text-primary)'}}, title),
        React.createElement('button', {onClick:onClose, style:{background:'var(--surface-sunken)', border:'none', borderRadius:'var(--radius-round)', width:32, height:32, cursor:'pointer', color:'var(--text-secondary)', fontSize:16}}, '×')
      ),
      children
    )
  );
}
