function Discover() {
  const { Tabs, EditorialCard } = window.LibrisDesignSystem_f40bc3;
  const [tab, setTab] = React.useState('Guías');
  const items = {
    'Guías': [
      { title:'Cómo armar un club de lectura', subtitle:'8 pasos para empezar bien' },
      { title:'Manejar spoilers sin pelear', subtitle:'Reglas simples para el grupo' },
    ],
    'Autores': [
      { title:'Julio Cortázar', subtitle:'Modera el club "Rayuela en voz alta"' },
      { title:'Samanta Schweblin', subtitle:'Lee junto a 3 clubes esta temporada' },
    ],
    'Cursos': [
      { title:'Taller de lectura crítica', subtitle:'4 semanas · con certificado' },
      { title:'Cómo escribir reseñas', subtitle:'Curso corto · 3 clases' },
    ],
  };
  const cat = { 'Guías':'Guía', 'Autores':'Autor', 'Cursos':'Curso' }[tab];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18, padding:'20px 18px 100px' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--fs-xl)', fontWeight:600, color:'var(--text-primary)' }}>Descubrir</div>
      <Tabs items={['Guías','Autores','Cursos']} active={tab} onChange={setTab}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {items[tab].map((it,i)=>(<EditorialCard key={i} category={cat} title={it.title} subtitle={it.subtitle}/>))}
      </div>
    </div>
  );
}
window.Discover = Discover;
