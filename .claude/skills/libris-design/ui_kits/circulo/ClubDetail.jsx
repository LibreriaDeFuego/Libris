function ClubDetail({ onUpdateProgress, onOpenComments }) {
  const { BookCard, Button, IconButton, Icon, Avatar } = window.LibrisDesignSystem_f40bc3;
  const previews = [
    { type:'text', name:'Julián Pérez', time:'hace 1 h', body:'La parte del faro me dejó pensando toda la noche.' },
    { type:'quote', name:'Martina Solís', time:'hace 2 h', body:'"Un libro que se lee de un tirón."' },
    { type:'voice', name:'Cande Ibarra', time:'hace 4 h', body:'0:38' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, padding:'20px 18px 100px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--fs-xl)', fontWeight:600, color:'var(--text-primary)' }}>Letras en Vela</div>
          <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-secondary)' }}>Club privado · 14 miembros</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <IconButton><Icon name="bell" size={18}/></IconButton>
          <IconButton><Icon name="share-2" size={18}/></IconButton>
        </div>
      </div>

      <BookCard title="Rayuela" club="Julio Cortázar" chapterLabel="Cap. 14 de 20" progress={68} />

      <div style={{ display:'flex', gap:10 }}>
        <div style={{ flex:1 }}><Button variant="primary" size="md" onClick={onUpdateProgress}><Icon name="book-open" size={16}/>Actualizar progreso</Button></div>
        <Button variant="secondary" size="md" onClick={onOpenComments}>Comentarios</Button>
      </div>

      <div style={{ background:'var(--success)', borderRadius:'var(--radius-lg)', padding:14, display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ display:'flex' }}>
          {['Sol','Bea','Nico'].map((n,i)=>(<div key={n} style={{ marginLeft: i>0 ? -10 : 0, border:'2px solid var(--success)', borderRadius:'50%' }}><Avatar name={n} size={30}/></div>))}
        </div>
        <div style={{ fontSize:'var(--fs-xs)', color:'#fff', fontWeight:600, lineHeight:'var(--lh-snug)' }}>3 clubes más están leyendo Rayuela esta semana</div>
      </div>

      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--fs-lg)', fontWeight:600, color:'var(--text-primary)', marginBottom:12 }}>Impresiones recientes</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {previews.map((p,i)=>(
            <div key={i} style={{ background:'var(--surface-card)', borderRadius:'var(--radius-md)', padding:12, display:'flex', gap:10, boxShadow:'var(--shadow-sm)' }}>
              <Avatar name={p.name} size={34}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'var(--fs-xs)', fontWeight:600, color:'var(--text-primary)' }}>{p.name} <span style={{ fontWeight:400, color:'var(--text-tertiary)' }}>· {p.time}</span></div>
                {p.type==='voice' ? (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, color:'var(--text-secondary)', fontSize:'var(--fs-xs)' }}><Icon name="mic" size={14}/>Nota de voz · {p.body}</div>
                ) : (
                  <div style={{ fontSize:'var(--fs-sm)', color: p.type==='quote' ? 'var(--gold-700)':'var(--text-secondary)', fontStyle: p.type==='quote' ? 'italic':'normal', marginTop:2 }}>{p.body}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.ClubDetail = ClubDetail;
