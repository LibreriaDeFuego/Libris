import React from 'react';
export function VoiceNotePlayer({duration='0:42', transcript}) {
  const [open, setOpen] = React.useState(false);
  return React.createElement('div', {style:{background:'var(--surface-card-alt)', borderRadius:'var(--radius-md)', padding:12, fontFamily:'var(--font-body)'}},
    React.createElement('div', {style:{display:'flex', alignItems:'center', gap:10}},
      React.createElement('button', {
        onClick:()=>{}, style:{width:34, height:34, borderRadius:'var(--radius-round)', background:'var(--accent-500)', color:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0}
      }, React.createElement('span', {style:{width:0,height:0,borderTop:'6px solid transparent',borderBottom:'6px solid transparent',borderLeft:'9px solid #fff',marginLeft:2}})),
      React.createElement('div', {style:{flex:1, display:'flex', alignItems:'center', gap:2, height:20}},
        Array.from({length:24}).map((_,i)=>React.createElement('div', {key:i, style:{width:2, borderRadius:1, background:'var(--neutral-300)', height:6+((i*37)%14)}}))
      ),
      React.createElement('span', {style:{fontSize:'var(--fs-2xs)', color:'var(--text-tertiary)'}}, duration)
    ),
    transcript && React.createElement('button', {onClick:()=>setOpen(!open), style:{background:'none', border:'none', color:'var(--text-link)', fontSize:'var(--fs-2xs)', padding:0, marginTop:8, cursor:'pointer', fontWeight:600}}, open ? 'Ocultar transcripción' : 'Ver transcripción'),
    open && transcript && React.createElement('p', {style:{fontSize:'var(--fs-sm)', color:'var(--text-secondary)', marginTop:6, lineHeight:'var(--lh-normal)'}}, transcript)
  );
}
