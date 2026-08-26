'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPost } from '@/app/actions/posts';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { PhotoCropModal } from '@/components/PhotoCropModal';

// Vista previa local de la foto ya recortada, antes de subirla — libera el
// object URL anterior cada vez que cambia el blob o al desmontar. Cuadrada
// (1:1), igual que el recorte y que el cuadro donde se va a mostrar dentro
// de la tarjeta con título.
function PreviewImage({ blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob recién generado, no una URL persistida.
    <img src={url} alt="" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
  );
}

// Círculo chico con "+" junto al nombre: un solo input de archivo, sin
// "capture" — así el propio celular abre su selector nativo, que ya junta
// la cámara y la galería en un solo lugar (como en Instagram), en vez de
// obligar a elegir antes entre dos botones propios. De ahí se pasa directo
// al recorte cuadrado (1:1) y a un título (obligatorio, va en la tarjeta
// con color propio) más un texto más largo, opcional, antes de publicar.
// Aparece mezclada con comentarios y notas de voz en la Actividad del perfil.
export function PostComposer() {
  const inputRef = useRef(null);
  const [step, setStep] = useState('closed'); // closed | cropping | composing
  const [pendingFile, setPendingFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep('closed');
    setPendingFile(null);
    setCroppedBlob(null);
    setTitle('');
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
    formData.set('title', title);
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
        onClick={() => inputRef.current?.click()}
        style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 'var(--radius-round)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-500)', border: 'none', color: '#fff', cursor: 'pointer',
        }}
      >
        <Icon name="plus" size={14} color="#fff" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePick}
        style={{ display: 'none' }}
      />

      {step === 'cropping' && pendingFile && (
        <PhotoCropModal
          file={pendingFile}
          aspect={1}
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
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
            <Textarea
              placeholder="Contanos más (opcional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
            />
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="md" type="button" onClick={reset} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" type="button" onClick={publish} disabled={pending || !title.trim()}>
                {pending ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
