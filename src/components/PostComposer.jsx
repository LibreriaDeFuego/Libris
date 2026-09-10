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
import { VoiceRecorder } from '@/components/VoiceRecorder';

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

// Una pestaña de TIPO del compositor — mismo componente, mismo estilo
// (ícono + rótulo apilados, rayita coral bajo la activa) que ya usa el
// panel de "Agregar" de Tu camino (ChapterPath.jsx, TypeTabButton). "icon"
// es opcional — "Comentario" no lleva (el rótulo solo ya deja claro qué es,
// un ícono ahí era redundante); minHeight mantiene las cuatro pestañas del
// mismo alto aunque una no tenga ícono arriba del texto.
function TypeTabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        minHeight: 36, fontSize: 9.5, fontWeight: 700, padding: '8px 2px 7px', border: 'none', background: 'none',
        cursor: 'pointer', fontFamily: 'var(--font-body)', position: 'relative',
        color: active ? 'var(--accent-600)' : 'var(--text-tertiary)',
      }}
    >
      {icon && <Icon name={icon} size={14} color={active ? 'var(--accent-600)' : 'var(--text-tertiary)'} />}
      {label}
      {active && (
        <span style={{ position: 'absolute', left: 6, right: 6, bottom: -1, height: 2, background: 'var(--accent-500)', borderRadius: '2px 2px 0 0' }} />
      )}
    </button>
  );
}

// El compositor de texto + foto/GIF, compartido por las pestañas
// "Comentario" y "Foto/GIF" — son la misma forma por dentro (createPost ya
// acepta las dos cosas juntas o por separado, desde la migración 049); la
// diferencia es si el selector nativo de archivos se abre solo al montar
// (autoOpenPicker) y si queda además el link "Agregar foto o GIF" para
// volver a abrirlo a mano (showAddPhotoLink) — en "Comentario" no se
// muestra: ya existe la pestaña "Foto/GIF" dedicada a eso, tenerlo también
// acá era redundante. En "Foto/GIF" sigue mostrándose, para poder elegir
// otra foto si se saca la que había. Un GIF no pasa por el recorte
// (PhotoCropModal usa un <canvas>, que solo captura un frame — dejaría el
// GIF animado por dentro pero estático al mostrarlo), una foto común sí.
function TextOrPhotoTab({ autoOpenPicker, showAddPhotoLink = true, onDone }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (autoOpenPicker) fileInputRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePick(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type === 'image/gif') {
      setCroppedBlob(file);
      return;
    }
    setPendingFile(file);
  }

  function handleCropConfirm(blob) {
    setCroppedBlob(blob);
    setPendingFile(null);
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
        router.refresh();
        onDone();
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {croppedBlob && <PreviewImage blob={croppedBlob} onRemove={() => setCroppedBlob(null)} />}
      <Textarea
        placeholder="¿Qué estás leyendo?"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={croppedBlob ? 2 : 4}
      />
      {!croppedBlob && showAddPhotoLink && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            border: 'none', background: 'none', cursor: 'pointer', padding: 0,
            fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--accent-600)', fontFamily: 'var(--font-body)',
          }}
        >
          <Icon name="image-plus" size={15} color="var(--accent-600)" /> Agregar foto o GIF
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePick} style={{ display: 'none' }} />

      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
      <Button variant="primary" size="md" type="button" onClick={publish} disabled={pending || (!caption.trim() && !croppedBlob)}>
        {pending ? 'Publicando…' : 'Publicar'}
      </Button>

      {pendingFile && (
        <PhotoCropModal
          file={pendingFile}
          aspect={3 / 4}
          shape="square"
          outputSize={960}
          title="Ajusta la foto"
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}

// Barra de "compartir", arriba del feed de Actividad de tu propio perfil —
// tocarla (entera) abre la ventana para escribir, ya en la pestaña
// "Comentario". Adentro, cuatro pestañas de tipo — Comentario · Cita ·
// Foto/GIF · Voz (migración 052) — mismas cuatro y mismo estilo que ya
// tiene el panel de "Agregar" de Tu camino (ChapterPath.jsx): antes esto
// era una fila de íconos sueltos (AttachmentToolbar) que cambiaban el modo
// del mismo compositor; ahora son pestañas explícitas, una decisión más
// visible y consistente con el resto de la app.
//
// Cada pestaña remonta su propio componente (key={activeTab}) al
// cambiarla — cambiar de tipo nunca arrastra texto, foto o audio de la
// pestaña anterior, mismo criterio que ya sigue el panel de Tu camino.
// "Comentario" y "Foto/GIF" son la misma forma por dentro (TextOrPhotoTab)
// con distinta configuración: la segunda abre el selector nativo de
// entrada, la primera lo deja como un link chico para abrirlo a mano —
// las dos pueden terminar publicando texto solo, foto sola, o las dos
// cosas juntas (createPost ya acepta cualquier combinación).
export function PostComposer({ profile }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('comment'); // 'comment' | 'quote' | 'photo' | 'voice'

  function close() {
    setOpen(false);
    setActiveTab('comment');
  }

  return (
    <>
      <button
        type="button"
        aria-label="Escribir algo sobre lo que estás leyendo"
        onClick={() => setOpen(true)}
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

      {open && (
        <Modal title="Compartir" onClose={close}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 10 }}>
              <TypeTabButton active={activeTab === 'comment'} onClick={() => setActiveTab('comment')} label="Comentario" />
              <TypeTabButton active={activeTab === 'quote'} onClick={() => setActiveTab('quote')} icon="quote" label="Cita" />
              <TypeTabButton active={activeTab === 'photo'} onClick={() => setActiveTab('photo')} icon="image" label="Foto/GIF" />
              <TypeTabButton active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} icon="mic" label="Voz" />
            </div>

            {activeTab === 'comment' && <TextOrPhotoTab key="comment" autoOpenPicker={false} showAddPhotoLink={false} onDone={close} />}
            {activeTab === 'photo' && <TextOrPhotoTab key="photo" autoOpenPicker onDone={close} />}
            {activeTab === 'quote' && <QuoteComposer embedded onClose={close} />}
            {activeTab === 'voice' && <VoiceRecorder showSpoilerOption={false} onDone={close} />}
          </div>
        </Modal>
      )}
    </>
  );
}
