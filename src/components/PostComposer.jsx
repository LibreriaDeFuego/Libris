'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/actions/posts';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { PhotoCropModal } from '@/components/PhotoCropModal';
import { QuoteComposer } from '@/components/QuoteComposer';

// Vista previa local de la foto ya recortada, antes de subirla — libera el
// object URL anterior cada vez que cambia el blob o al desmontar. La ×
// suelta la foto sin cerrar el compositor (queda el texto solo).
function PreviewImage({ blob, onRemove }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div style={{ position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob recién generado, no una URL persistida. */}
      <img src={url} alt="" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
      <button
        type="button"
        aria-label="Quitar la foto"
        onClick={onRemove}
        style={{
          position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 'var(--radius-round)',
          background: 'rgba(27,27,31,.6)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="x" size={13} color="#fff" />
      </button>
    </div>
  );
}

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
  fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--text-primary)',
  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
};

// Barra de "compartir", arriba del feed de Actividad de tu propio perfil.
// Tocar la tarjeta (avatar + texto fantasma) deja escribir directo, sin
// abrir ningún selector — el ícono, aparte, ofrece agregar una foto o una
// cita destacada (migración 049): antes el círculo entero abría el
// selector de fotos apenas se tocaba, sin dejar escribir solo texto.
//
// Un solo input de archivo, sin "capture" — así el propio celular abre su
// selector nativo, que ya junta la cámara y la galería en un solo lugar
// (como en Instagram). De ahí se pasa al recorte vertical (3:4) y se
// vuelve al mismo compositor de texto, ahora con la foto adjunta —
// también se puede sacar la foto sin perder lo escrito (PreviewImage, ×).
//
// GIF (migración 039) es la excepción: no pasa por el recorte (canvas solo
// captura un frame, lo dejaría estático) — va directo a la vista previa
// con el archivo tal cual se eligió, y se sube sin tocar.
export function PostComposer({ profile }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [step, setStep] = useState('closed'); // closed | cropping | composing | quoting
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep('closed');
    setMenuOpen(false);
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
    if (croppedBlob) {
      const filename = croppedBlob.type === 'image/gif' ? 'foto.gif' : 'foto.jpg';
      formData.set('file', croppedBlob, filename);
    }
    formData.set('caption', caption);
    startTransition(async () => {
      const result = await createPost(null, formData);
      if (result?.error) setError(result.error);
      else {
        reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 'var(--radius-pill)',
          background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)',
        }}
      >
        <button
          type="button"
          aria-label="Escribir algo sobre lo que estás leyendo"
          onClick={() => setStep('composing')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, padding: 0,
            border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
          }}
        >
          <Avatar name={profile.display_name} src={profile.avatar_url} size={28} />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>¿Qué estás leyendo?</span>
        </button>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Agregar una foto o una cita"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: 26, height: 26, borderRadius: 'var(--radius-round)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-500)',
            }}
          >
            <Icon name="image" size={13} color="#fff" />
          </button>

          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
              <div
                style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 5, minWidth: 180,
                  background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
                }}
              >
                <button type="button" style={menuItemStyle} onClick={() => { setMenuOpen(false); inputRef.current?.click(); }}>
                  <Icon name="image" size={14} /> Agregar foto
                </button>
                <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                <button type="button" style={menuItemStyle} onClick={() => { setMenuOpen(false); setStep('quoting'); }}>
                  <Icon name="quote" size={14} /> Agregar cita
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
          onCancel={() => { setPendingFile(null); setStep('composing'); }}
        />
      )}

      {step === 'composing' && (
        <Modal title="Compartir" onClose={reset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {croppedBlob && <PreviewImage blob={croppedBlob} onRemove={() => setCroppedBlob(null)} />}
            <Textarea
              placeholder="¿Qué estás leyendo?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={croppedBlob ? 2 : 4}
            />
            {!croppedBlob && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                  border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--accent-600)', fontFamily: 'var(--font-body)',
                }}
              >
                <Icon name="image" size={14} color="var(--accent-600)" /> Agregar una foto
              </button>
            )}
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="md" type="button" onClick={reset} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" type="button" onClick={publish} disabled={pending || (!caption.trim() && !croppedBlob)}>
                {pending ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {step === 'quoting' && <QuoteComposer onClose={reset} />}
    </>
  );
}
