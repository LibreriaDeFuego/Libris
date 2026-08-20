'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Slider } from '@/design-system/components/forms/Slider.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress, addChapter } from '@/app/actions/clubs';
import { chapterDisplayLabel } from '@/lib/orderChapters';

export function UpdateProgressModal({ clubBookId, chapters, isAdmin, initialChapterId, initialPercent, initialReaction, onClose }) {
  const [chapterId, setChapterId] = useState(initialChapterId ?? chapters[0]?.id);
  const [progress, setProgress] = useState(initialPercent ?? 0);
  const [reaction, setReaction] = useState(initialReaction ?? null);
  const [error, setError] = useState(null);
  const [savePending, startSave] = useTransition();
  const [chapterPending, startChapter] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('chapterId', chapterId);
    formData.set('percent', String(progress));
    if (reaction) formData.set('reaction', reaction);

    startSave(async () => {
      const result = await updateProgress(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  // Agrega el capítulo siguiente y lo deja seleccionado. La lista de chips se
  // refresca sola cuando el server action revalida la home.
  function handleAddChapter() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);

    startChapter(async () => {
      const result = await addChapter(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.chapter) {
        setError(null);
        setChapterId(result.chapter.id);
        setProgress(0);
      }
    });
  }

  return (
    <Modal title="Actualizar progreso" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Capítulo</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 132, overflowY: 'auto' }}>
            {chapters.map((c) => (
              <Chip key={c.id} selected={c.id === chapterId} onClick={() => setChapterId(c.id)}>{chapterDisplayLabel(c)}</Chip>
            ))}
            {isAdmin && (
              <Chip onClick={chapterPending ? undefined : handleAddChapter}>
                <Icon name="plus" size={12} /> {chapterPending ? 'Agregando...' : 'Nuevo'}
              </Chip>
            )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
            <span>Avance en el capítulo</span><span>{progress}%</span>
          </div>
          <Slider value={progress} onChange={setProgress} />
        </div>

        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>¿Cómo estuvo?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip selected={reaction === 'great'} onClick={() => setReaction(reaction === 'great' ? null : 'great')}><Icon name="thumbs-up" size={13} /> Genial capítulo</Chip>
            <Chip selected={reaction === 'slow'} onClick={() => setReaction(reaction === 'slow' ? null : 'slow')}><Icon name="thumbs-down" size={13} /> Capítulo lento</Chip>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {error}
          </div>
        )}

        <Button variant="primary" size="lg" onClick={handleSave} disabled={savePending || !chapterId}>
          {savePending ? 'Guardando...' : 'Guardar progreso'}
        </Button>
      </div>
    </Modal>
  );
}
