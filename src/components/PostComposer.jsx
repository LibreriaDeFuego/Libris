'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPost } from '@/app/actions/posts';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { PhotoCropModal } from '@/components/PhotoCropModal';

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

// Barra de "compartir", arriba del feed de Actividad de tu propio perfil —
// mismo patrón de compose-bar de cualquier red social, con tu avatar y un
// texto fantasma ("¿Qué estás leyendo?"), en vez del círculo con + suelto
// que tenía antes (ese quedaba debajo de las estadísticas, sin relación
// visual con el feed donde termina apareciendo la foto). Un solo input de
// archivo, sin "capture" — así el propio celular abre su selector nativo,
// que ya junta la cámara y la galería en un solo lugar (como en
// Instagram), en vez de obligar a elegir antes entre dos botones propios.
// De ahí se pasa directo al recorte vertical (3:4) y a un texto corto
// opcional antes de publicar.
//
// GIF (migración 039) es la excepción: no pasa por el recorte (canvas solo
// captura un frame, lo dejaría estático) — va directo a la vista previa
// con el archivo tal cual se eligió, y se sube sin tocar.
export function PostComposer({ profile }) {
  const inputRef = useRef(null);
  const [step, setStep] = useState('closed'); // closed | cropping | composing
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
    // Un GIF no pasa por el recorte: PhotoCropModal dibuja en un <canvas>
    // para recortar, y canvas solo puede capturar un frame — recortar un
    // GIF ahí lo dejaría animado por dentro pero estático al mostrarlo. Va
    // directo a la vista previa, tal cual se seleccionó.
    if (file.type === 'image/gif') {
      setCroppedBlob(file);
      setStep('composing');
      return;
    }
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
    const filename = croppedBlob.type === 'image/gif' ? 'foto.gif' : 'foto.jpg';
    formData.set('file', croppedBlob, filename);
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
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
          background: 'var(--surface-sunken)', textAlign: 'left', fontFamily: 'var(--font-body)',
        }}
      >
        <Avatar name={profile.display_name} src={profile.avatar_url} size={28} />
        <span style={{ flex: 1, fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>¿Qué estás leyendo?</span>
        <span
          style={{
            flexShrink: 0, width: 26, height: 26, borderRadius: 'var(--radius-round)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-500)',
          }}
        >
          <Icon name="image" size={13} color="#fff" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handlePick}
        style={{ display: 'none' }}
      />

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
              placeholder="Escribe algo sobre esta foto (opcional)"
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
