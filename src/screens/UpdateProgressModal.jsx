'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { updateProgress } from '@/app/actions/clubs';
import { chapterDisplayLabel } from '@/lib/orderChapters';

// Solo la vía "por página" — por capítulo ya se hace tocando un nodo en
// Tu camino, y "Terminado" ya tiene su propio nodo de FIN al final del
// camino. Este modal, al que se llega únicamente desde "Actualizar por
// página", ya no necesita elegir entre esas otras dos formas.
//
// Sí pregunta, aparte, en qué capítulo vas — opcional (tocar el mismo chip
// lo deselecciona) porque no todo el mundo lo tiene claro mirando solo la
// página. Con eso, aunque actualices por página, "Tu camino" también
// muestra el nodo correcto — el % sigue saliendo de la página, esto solo
// ubica dónde estás.
export function UpdateProgressModal({ clubBookId, chapters = [], initialCurrentPage, initialTotalPages, initialChapterId, onClose }) {
  const [currentPage, setCurrentPage] = useState(initialCurrentPage != null ? String(initialCurrentPage) : '');
  const [totalPages, setTotalPages] = useState(initialTotalPages != null ? String(initialTotalPages) : '');
  const [chapterId, setChapterId] = useState(initialChapterId ?? null);
  const [error, setError] = useState(null);
  const [savePending, startSave] = useTransition();

  // Ya sabemos el total de páginas de una vez anterior — no hace falta
  // volver a pedirlo cada vez que actualizás en qué página vas, solo si
  // cambiaste de edición.
  const [editingTotal, setEditingTotal] = useState(false);
  const knowsTotal = Boolean(totalPages);
  const showTotalInput = editingTotal || !knowsTotal;

  function handleSave() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('mode', 'page');
    formData.set('currentPage', currentPage);
    formData.set('totalPages', totalPages);
    if (chapterId) formData.set('chapterId', chapterId);

    startSave(async () => {
      const result = await updateProgress(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  const canSave = currentPage.trim() !== '' && totalPages.trim() !== '';

  return (
    <Modal title="Actualizar por página" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        {chapters.length > 0 && (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              Para que también se vea en Tu camino, ¿nos cuentas en qué capítulo vas?
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 132, overflowY: 'auto' }}>
              {chapters.map((c) => (
                <Chip key={c.id} selected={c.id === chapterId} onClick={() => setChapterId(chapterId === c.id ? null : c.id)}>
                  {chapterDisplayLabel(c)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {error}
          </div>
        )}

        <Button variant="primary" size="lg" onClick={handleSave} disabled={savePending || !canSave}>
          {savePending ? 'Guardando...' : 'Guardar progreso'}
        </Button>
      </div>
    </Modal>
  );
}
