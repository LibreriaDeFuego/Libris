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

const toolbarButtonStyle = {
  width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
  background: 'var(--surface-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// Fila de "adjuntar" adentro de la ventana de compartir: foto, GIF o cita
// — mismo lugar, sin importar por dónde se entró (tocando la tarjeta o,
// en teoría, directo). Solo se muestra si todavía no hay ninguna foto/GIF
// adjunto (elegir "Cita" en ese punto, de todas formas, abandona el texto
// que se estaba escribiendo — son dos publicaciones distintas, no se
// pueden mezclar). Sin ícono de "GIF" en Lucide — se usa la sigla, mismo
// criterio que ya usa X en su propio compositor (tampoco es un pictograma
// ahí).
function AttachmentToolbar({ onPickPhoto, onPickGif, onPickQuote }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" aria-label="Agregar una foto" onClick={onPickPhoto} style={toolbarButtonStyle}>
        <Icon name="image" size={16} color="var(--accent-600)" />
      </button>
      <button type="button" aria-label="Agregar un GIF" onClick={onPickGif} style={toolbarButtonStyle}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent-600)', fontFamily: 'var(--font-body)' }}>GIF</span>
      </button>
      <button type="button" aria-label="Agregar una cita" onClick={onPickQuote} style={toolbarButtonStyle}>
        <Icon name="quote" size={16} color="var(--accent-600)" />
      </button>
    </div>
  );
}

// Barra de "compartir", arriba del feed de Actividad de tu propio perfil —
// tocarla (entera) abre la ventana para escribir. Adentro, una fila de
// íconos deja adjuntar una foto, un GIF o pasar a una cita destacada
// (migración 049/050): antes esas dos últimas opciones vivían en un menú
// aparte, sobre la barra — ahora todo lo que se puede agregar a la
// publicación se ve y se elige desde el mismo lugar donde se escribe.
//
// Dos inputs de archivo (uno por tipo, sin "capture" — así el celular abre
// su selector nativo de galería/cámara igual) en vez de uno solo: cada
// ícono filtra de entrada lo que tiene sentido elegir ahí (el selector del
// celular ya no ofrece GIF al tocar "Foto", ni fotos comunes al tocar
// "GIF"), aunque las dos rutas terminan en el mismo handlePick — este ya
// sabía distinguir por el tipo de archivo, así que sigue siendo el
// respaldo si algún selector no filtrara bien.
//
// Una vez elegida la foto (no GIF) se pasa al recorte vertical (3:4) y se
// vuelve al mismo compositor de texto, ahora con la foto adjunta —
// también se puede sacar la foto sin perder lo escrito (PreviewImage, ×).
// GIF (migración 039) es la excepción: no pasa por el recorte (canvas solo
// captura un frame, lo dejaría estático) — va directo a la vista previa
// con el archivo tal cual se eligió, y se sube sin tocar.
export function PostComposer({ profile }) {
  const router = useRouter();
  const photoInputRef = useRef(null);
  const gifInputRef = useRef(null);
  const [step, setStep] = useState('closed'); // closed | cropping | composing | quoting
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
      <button
        type="button"
        aria-label="Escribir algo sobre lo que estás leyendo"
        onClick={() => setStep('composing')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)',
          textAlign: 'left', fontFamily: 'var(--font-body)',
        }}
      >
        <Avatar name={profile.display_name} src={profile.avatar_url} size={28} />
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>¿Qué estás leyendo?</span>
      </button>

      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePick} style={{ display: 'none' }} />
      <input ref={gifInputRef} type="file" accept="image/gif" onChange={handlePick} style={{ display: 'none' }} />

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
              <AttachmentToolbar
                onPickPhoto={() => photoInputRef.current?.click()}
                onPickGif={() => gifInputRef.current?.click()}
                onPickQuote={() => setStep('quoting')}
              />
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
