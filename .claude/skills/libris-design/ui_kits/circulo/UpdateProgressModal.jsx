function UpdateProgressModal({ onClose }) {
  const { Modal, Chip, Slider, Input, Textarea, Button, Icon } = window.LibrisDesignSystem_f40bc3;
  const [chapter, setChapter] = React.useState('Cap. 14');
  const [progress, setProgress] = React.useState(55);
  const [reaction, setReaction] = React.useState(null);
  const chapters = ['Cap. 12','Cap. 13','Cap. 14','Cap. 15'];
  return (
    <Modal title="Actualizar progreso" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-secondary)', marginBottom:8, fontWeight:600 }}>Capítulo</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {chapters.map(c => <Chip key={c} selected={c===chapter} onClick={()=>setChapter(c)}>{c}</Chip>)}
            <Chip onClick={()=>{}}><Icon name="plus" size={12}/> Nuevo</Chip>
          </div>
        </div>

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'var(--fs-xs)', color:'var(--text-secondary)', marginBottom:8, fontWeight:600 }}>
            <span>Avance en el capítulo</span><span>{progress}%</span>
          </div>
          <Slider value={progress} onChange={setProgress}/>
        </div>

        <div>
          <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-secondary)', marginBottom:8, fontWeight:600 }}>¿Cómo estuvo?</div>
          <div style={{ display:'flex', gap:8 }}>
            <Chip selected={reaction==='great'} onClick={()=>setReaction('great')}><Icon name="thumbs-up" size={13}/> Genial capítulo</Chip>
            <Chip selected={reaction==='slow'} onClick={()=>setReaction('slow')}><Icon name="thumbs-down" size={13}/> Capítulo lento</Chip>
          </div>
        </div>

        <div>
          <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-secondary)', marginBottom:8, fontWeight:600 }}>Cita destacada</div>
          <Input placeholder="Escribe una cita destacada..."/>
        </div>

        <div>
          <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-secondary)', marginBottom:8, fontWeight:600 }}>Nota (opcional)</div>
          <Textarea placeholder="¿Qué te pareció este tramo del libro?"/>
        </div>

        <Button variant="primary" size="lg" onClick={onClose}>Guardar progreso</Button>
      </div>
    </Modal>
  );
}
window.UpdateProgressModal = UpdateProgressModal;
