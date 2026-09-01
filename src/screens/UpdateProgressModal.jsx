'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress, addChapter } from '@/app/actions/clubs';
import { chapterDisplayLabel } from '@/lib/orderChapters';

// Tres formas de registrar en qué vas: por capítulo o por página (porque no
// todos leen la misma edición), o "Terminado" — declara el libro terminado
// y dispara, al guardar, el formulario de la reseña final (onFinished).
export function UpdateProgressModal({
  clubBookId, chapters, isAdmin,
  initialChapterId, initialCurrentPage, initialTotalPages, initialReaction,
  onClose, onFinished,
}) {
  const [mode, setMode] = useState(initialChapterId ? 'chapter' : (initialTotalPages ? 'page' : (chapters.length > 0 ? 'chapter' : 'page')));
  const [chapterId, setChapterId] = useState(initialChapterId ?? chapters[0]?.id ?? null);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage != null ? String(initialCurrentPage) : '');
  const [totalPages, setTotalPages] = useState(initialTotalPages != null ? String(initialTotalPages) : '');
  const [reaction, setReaction] = useState(initialReaction ?? null);
  const [error, setError] = useState(null);
  const [savePending, startSave] = useTransition();
  const [chapterPending, startChapter] = useTransition();

  // Ya sabemos el total de páginas de una vez anterior — no hace falta
  // volver a pedirlo cada vez que actualizás en qué página vas, solo si
  // cambiaste de edición.
  const [editingTotal, setEditingTotal] = useState(false);
  const knowsTotal = Boolean(totalPages);
  const showTotalInput = editingTotal || !knowsTotal;

  function handleSave() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('mode', mode);
    if (mode === 'page') {
      formData.set('currentPage', currentPage);
      formData.set('totalPages', totalPages);
    } else if (mode === 'chapter') {
      formData.set('chapterId', chapterId);
    }
    if (reaction) formData.set('reaction', reaction);

    startSave(async () => {
      const result = await updateProgress(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.finished && onFinished) {
        onFinished();
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
      }
    });
  }

  const canSave = mode === 'page'
    ? currentPage.trim() !== '' && totalPages.trim() !== ''
    : mode === 'finished'
      ? true
      : Boolean(chapterId);

  return (
    <Modal title="Actualizar progreso" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
            ¿Cómo quieres registrarlo?
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 'var(--lh-snug)' }}>
            Como cada quien puede tener una edición distinta, elige lo que te resulte más fácil de decir.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip selected={mode === 'chapter'} onClick={() => setMode('chapter')}>Por capítulo</Chip>
            <Chip selected={mode === 'page'} onClick={() => setMode('page')}>Por página</Chip>
            <Chip selected={mode === 'finished'} onClick={() => setMode('finished')}><Icon name="check-circle" size={13} /> Terminado</Chip>
          </div>
        </div>

        {mode === 'finished' ? (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            Al guardar, te vamos a pedir tu reseña — título y lo que quieras contar del libro.
          </div>
        ) : mode === 'chapter' ? (
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
        ) : (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              Página de tu edición
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input type="number" min="0" placeholder="Voy en la" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} />
              </div>
              {showTotalInput ? (
                <>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>de</span>
                  <div style={{ flex: 1 }}>
                    <Input type="number" min="1" placeholder="Total de páginas" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>de {totalPages} páginas</span>
              )}
            </div>
            {!showTotalInput && (
              <button
                type="button"
                onClick={() => setEditingTotal(true)}
                style={{
                  marginTop: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-link)', fontFamily: 'var(--font-body)',
                }}
              >
                ¿Cambiaste de edición? Actualizar el total de páginas
              </button>
            )}
          </div>
        )}

        {mode !== 'finished' && (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>¿Cómo estuvo?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip selected={reaction === 'great'} onClick={() => setReaction(reaction === 'great' ? null : 'great')}><Icon name="thumbs-up" size={13} /> Genial capítulo</Chip>
              <Chip selected={reaction === 'slow'} onClick={() => setReaction(reaction === 'slow' ? null : 'slow')}><Icon name="thumbs-down" size={13} /> Capítulo lento</Chip>
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {error}
          </div>
        )}

        <Button variant="primary" size="lg" onClick={handleSave} disabled={savePending || !canSave}>
          {savePending ? 'Guardando...' : mode === 'finished' ? 'Marcar como terminado' : 'Guardar progreso'}
        </Button>
      </div>
    </Modal>
  );
}
