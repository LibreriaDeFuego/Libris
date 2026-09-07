'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPersonalBook } from '@/app/actions/library';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { CoverCropModal } from '@/components/CoverCropModal';

// Vista previa local de la portada ya recortada — mismo criterio que
// PreviewImage en PostComposer.jsx: libera el object URL anterior cada vez
// que cambia el blob o al desmontar.
function CoverPreview({ blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob recién generado, no una URL persistida.
    <img src={url} alt="" style={{ width: 84, aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
  );
}

// Botón "Agregar un libro" de Mi Biblioteca — abre un modal con título,
// autor y una portada opcional (recorte de marco ajustable, CoverCropModal,
// igual que la portada de un libro de club: acá tampoco hay una única
// proporción). El blob recortado se guarda en estado local hasta el envío
// final — se sube (Storage) e inserta (personal_books) juntos, en una sola
// invocación de la acción de servidor (mismo patrón que PostComposer).
export function AddPersonalBookForm() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [coverBlob, setCoverBlob] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setPendingFile(null);
    setCoverBlob(null);
    setTitle('');
    setAuthor('');
    setError(null);
  }

  function handlePickCover(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingFile(file);
  }

  function save() {
    if (!title.trim()) {
      setError('Escribe el título del libro.');
      return;
    }
    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('author', author.trim());
    if (coverBlob) formData.set('cover', coverBlob, 'portada.jpg');

    startTransition(async () => {
      const result = await addPersonalBook(null, formData);
      if (result?.error) setError(result.error);
      else {
        reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '12px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
          background: 'var(--accent-500)', color: '#fff', fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-sm)', fontWeight: 600,
        }}
      >
        <Icon name="plus" size={16} color="#fff" />
        Agregar un libro
      </button>

      {open && !pendingFile && (
        <Modal title="Agregar un libro" onClose={reset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{
                  flexShrink: 0, width: 84, aspectRatio: '2 / 3', borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-default)', background: 'var(--surface-sunken)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                }}
              >
                {coverBlob ? <CoverPreview blob={coverBlob} /> : <Icon name="image" size={20} color="var(--text-tertiary)" />}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePickCover}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="Autor (opcional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="md" type="button" onClick={reset} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" type="button" onClick={save} disabled={pending}>
                {pending ? 'Agregando…' : 'Agregar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {pendingFile && (
        <CoverCropModal
          file={pendingFile}
          title="Ajusta la portada"
          onConfirm={(blob) => { setCoverBlob(blob); setPendingFile(null); }}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </>
  );
}
