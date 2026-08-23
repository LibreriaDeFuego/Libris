'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPost } from '@/app/actions/posts';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { PhotoCropModal } from '@/components/PhotoCropModal';

const pillStyle = {
  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
  cursor: 'pointer', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-primary)',
  background: 'var(--surface-card)', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-pill)', padding: '8px 12px',
};

// Vista previa local de la foto ya recortada, antes de subirla — libera el
// object URL anterior cada vez que cambia el blob o al desmontar.
function PreviewImage({ blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob recién generado, no una URL persistida.
    <img src={url} alt="" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
  );
}

// Círculo con "+" junto al nombre, del mismo tamaño que el botón de los
// tres puntos: elegís o sacás una foto de lo que estás leyendo, la ajustás
// en un recorte vertical (3:4, como un feed de fotos) y la publicás con un
// texto corto opcional. Aparece mezclada con comentarios y notas de voz en
// la Actividad del perfil.
export function PostComposer() {
  const [step, setStep] = useState('closed'); // closed | picking | cropping | composing
  const [pendingFile, setPendingFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep('closed');
    setPendingFile(null);
    setCroppedBlob(null);
    setCaption('');
    setError(null);
  }

  function handlePick(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingFile(file);
    setStep('cropping');
  }

  function handleCropConfirm(blob) {
    setCroppedBlob(blob);
    setPendingFile(null);
    setStep('composing');
  }

  function publish() {
    const formData = new FormData();
    formData.set('file', croppedBlob, 'foto.jpg');
    formData.set('caption', caption);
    startTransition(async () => {
      const result = await createPost(null, formData);
      if (result?.error) setError(result.error);
      else reset();
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Agregar una foto"
        onClick={() => setStep('picking')}
        style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 'var(--radius-round)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-500)', border: 'none', color: '#fff', cursor: 'pointer',
        }}
      >
        <Icon name="plus" size={18} color="#fff" />
      </button>

      {step === 'picking' && (
        <Modal title="Compartir una foto" onClose={reset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
              Compartí una foto de lo que estás leyendo. Se va a ver en tu Actividad.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={pillStyle}>
                <Icon name="image" size={13} />
                Elegir foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePick}
                  style={{ display: 'none' }}
                />
              </label>
              <label style={pillStyle}>
                <Icon name="camera" size={13} />
                Tomar foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handlePick}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </Modal>
      )}

      {step === 'cropping' && pendingFile && (
        <PhotoCropModal
          file={pendingFile}
          aspect={3 / 4}
          shape="square"
          outputSize={960}
          title="Ajusta la foto"
          onConfirm={handleCropConfirm}
          onCancel={reset}
        />
      )}

      {step === 'composing' && croppedBlob && (
        <Modal title="Compartir una foto" onClose={reset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PreviewImage blob={croppedBlob} />
            <Textarea
              placeholder="Escribí algo sobre esta foto (opcional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="md" type="button" onClick={reset} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" type="button" onClick={publish} disabled={pending}>
                {pending ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
