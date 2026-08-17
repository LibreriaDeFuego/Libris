function CommentsFeed({ onBack }) {
  const { IconButton, Icon, Avatar, Blockquote, VoiceNotePlayer, SpoilerBlock } = window.LibrisDesignSystem_f40bc3;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'20px 18px 100px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <IconButton onClick={onBack}><Icon name="arrow-left" size={18}/></IconButton>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--fs-xl)', fontWeight:600, color:'var(--text-primary)' }}>Comentarios</div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <Avatar name="Julián Pérez" size={36}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'var(--fs-xs)', fontWeight:600, color:'var(--text-primary)' }}>Julián Pérez <span style={{ fontWeight:400, color:'var(--text-tertiary)' }}>· Cap. 13 · hace 1 h</span></div>
          <p style={{ fontSize:'var(--fs-base)', color:'var(--text-primary)', lineHeight:'var(--lh-normal)', margin:'4px 0 0' }}>La parte del faro me dejó pensando toda la noche. No esperaba que Elena tomara esa decisión.</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <Avatar name="Martina Solís" size={36}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'var(--fs-xs)', fontWeight:600, color:'var(--text-primary)' }}>Martina Solís <span style={{ fontWeight:400, color:'var(--text-tertiary)' }}>· Cap. 14 · hace 2 h</span></div>
          <div style={{ marginTop:6 }}><Blockquote>Un libro que se lee de un tirón.</Blockquote></div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <Avatar name="Cande Ibarra" size={36}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'var(--fs-xs)', fontWeight:600, color:'var(--text-primary)' }}>Cande Ibarra <span style={{ fontWeight:400, color:'var(--text-tertiary)' }}>· Cap. 14 · hace 4 h</span></div>
          <div style={{ marginTop:6 }}><VoiceNotePlayer duration="0:38" transcript="Che, este capítulo me voló la cabeza, sobre todo el final con Elena en el muelle."/></div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <Avatar name="Nico Duarte" size={36}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'var(--fs-xs)', fontWeight:600, color:'var(--text-primary)' }}>Nico Duarte <span style={{ fontWeight:400, color:'var(--text-tertiary)' }}>· Cap. 16 · hace 5 h</span></div>
          <div style={{ marginTop:6 }}><SpoilerBlock><p style={{ margin:0 }}>Al final del capítulo 16, el faro se derrumba y Elena decide quedarse en el pueblo.</p></SpoilerBlock></div>
        </div>
      </div>
    </div>
  );
}
window.CommentsFeed = CommentsFeed;
