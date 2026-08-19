import React from 'react';

// El botón de play era decorativo en el prototipo; ahora reproduce de verdad
// cuando recibe `src`. Sin `src` conserva el aspecto original (útil para mocks).
export function VoiceNotePlayer({duration='0:42', transcript, src}) {
  const [open, setOpen] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { audio.play(); } else { audio.pause(); }
  };

  return React.createElement('div', {style:{background:'var(--surface-card-alt)', borderRadius:'var(--radius-md)', padding:12, fontFamily:'var(--font-body)'}},
    src && React.createElement('audio', {
      ref: audioRef, src, preload:'none',
      onPlay:()=>setPlaying(true), onPause:()=>setPlaying(false), onEnded:()=>setPlaying(false),
      style:{display:'none'},
    }),
    React.createElement('div', {style:{display:'flex', alignItems:'center', gap:10}},
      React.createElement('button', {
        type:'button', onClick: src ? toggle : undefined,
        'aria-label': playing ? 'Pausar nota de voz' : 'Reproducir nota de voz',
        style:{width:34, height:34, borderRadius:'var(--radius-round)', background:'var(--accent-500)', color:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: src ? 'pointer':'default', flexShrink:0}
      }, playing
        ? React.createElement('span', {style:{display:'flex', gap:3}},
            React.createElement('span', {style:{width:3, height:12, background:'#fff'}}),
            React.createElement('span', {style:{width:3, height:12, background:'#fff'}}))
        : React.createElement('span', {style:{width:0,height:0,borderTop:'6px solid transparent',borderBottom:'6px solid transparent',borderLeft:'9px solid #fff',marginLeft:2}})),
      React.createElement('div', {style:{flex:1, display:'flex', alignItems:'center', gap:2, height:20}},
        Array.from({length:24}).map((_,i)=>React.createElement('div', {key:i, style:{width:2, borderRadius:1, background: playing ? 'var(--accent-300)' : 'var(--neutral-300)', height:6+((i*37)%14), transition:'background var(--duration-fast)'}}))
      ),
      React.createElement('span', {style:{fontSize:'var(--fs-2xs)', color:'var(--text-tertiary)'}}, duration)
    ),
    transcript && React.createElement('button', {type:'button', onClick:()=>setOpen(!open), style:{background:'none', border:'none', color:'var(--text-link)', fontSize:'var(--fs-2xs)', padding:0, marginTop:8, cursor:'pointer', fontWeight:600}}, open ? 'Ocultar transcripción' : 'Ver transcripción'),
    open && transcript && React.createElement('p', {style:{fontSize:'var(--fs-sm)', color:'var(--text-secondary)', marginTop:6, lineHeight:'var(--lh-normal)'}}, transcript)
  );
}
