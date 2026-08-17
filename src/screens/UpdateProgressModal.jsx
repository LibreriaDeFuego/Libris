'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Slider } from '@/design-system/components/forms/Slider.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress } from '@/app/actions/clubs';

export function UpdateProgressModal({ clubBookId, chapters, initialChapterId, initialPercent, initialReaction, onClose }) {
  const [chapterId, setChapterId] = useState(initialChapterId ?? chapters[0]?.id);
  const [progress, setProgress] = useState(initialPercent ?? 0);
  const [reaction, setReaction] = useState(initialReaction ?? null);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('chapterId', chapterId);
    formData.set('percent', String(progress));
    if (reaction) formData.set('reaction', reaction);

    startTransition(async () => {
      const result = await updateProgress(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <Modal title="Actualizar progreso" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Capítulo</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {chapters.map((c) => (
              <Chip key={c.id} selected={c.id === chapterId} onClick={() => setChapterId(c.id)}>{c.label}</Chip>
            ))}
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

        <Button variant="primary" size="lg" onClick={handleSave} disabled={pending || !chapterId}>
          {pending ? 'Guardando...' : 'Guardar progreso'}
        </Button>
      </div>
    </Modal>
  );
}
