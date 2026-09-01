'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress } from '@/app/actions/clubs';
import { groupChaptersByVolume, chapterDisplayLabel } from '@/lib/orderChapters';

// Solo la vía "por página" — por capítulo ya se hace tocando un nodo en
// Tu camino, y "Terminado" ya tiene su propio nodo de FIN al final del
// camino. Este modal, al que se llega únicamente desde "Actualizar por
// página", ya no necesita elegir entre esas otras dos formas.
//
// Sí pregunta, aparte, en qué capítulo vas — opcional (elegir "Prefiero
// no decirlo" limpia la selección) porque no todo el mundo lo tiene claro
// mirando solo la página. Con eso, aunque actualices por página, "Tu
// camino" también muestra el nodo correcto — el % sigue saliendo de la
// página, esto solo ubica dónde estás. Un `<select>` nativo, agrupado por
// volumen si el libro tiene más de uno — se probaron chips (se desordenan
// con muchos capítulos), chips cercanos + "ver todos" y un selector
// numérico antes de elegir este: escala a cualquier cantidad de
// capítulos sin armar ningún scroll propio, el sistema operativo se
// encarga.
export function UpdateProgressModal({ clubBookId, chapters = [], volumes = [], initialCurrentPage, initialTotalPages, initialChapterId, onClose }) {
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
  const chapterGroups = groupChaptersByVolume(chapters, volumes);

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
            <div style={{ position: 'relative' }}>
              <select
                value={chapterId ?? ''}
                onChange={(e) => setChapterId(e.target.value || null)}
                style={{
                  width: '100%', padding: '12px 40px 12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                  background: 'var(--surface-card)', color: chapterId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--fs-base)', outline: 'none', cursor: 'pointer',
                  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                }}
              >
                <option value="">Prefiero no decirlo</option>
                {chapterGroups.map((group) => (
                  group.volume ? (
                    <optgroup key={group.volume.id} label={group.volume.name}>
                      {group.chapters.map((c) => <option key={c.id} value={c.id}>{chapterDisplayLabel(c)}</option>)}
                    </optgroup>
                  ) : (
                    group.chapters.map((c) => <option key={c.id} value={c.id}>{chapterDisplayLabel(c)}</option>)
                  )
                ))}
              </select>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                <Icon name="chevron-down" size={16} color="var(--text-tertiary)" />
              </span>
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
