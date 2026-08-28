'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { VoiceNotePlayer } from '@/design-system/components/content/VoiceNotePlayer.jsx';
import { updateVoiceComment } from '@/app/actions/media';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// Editar tu propia nota de voz: el audio queda fijo (se puede volver a
// escuchar arriba) — lo único editable es la transcripción/resumen escrito
// a mano, y el spoiler. Grabar de nuevo no está acá — para eso conviene
// borrar y grabar otra.
export function EditVoiceModal({ comment, onClose }) {
  const [transcript, setTranscript] = useState(comment.voice_transcript ?? '');
  const [isSpoiler, setIsSpoiler] = useState(comment.is_spoiler ?? false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set('commentId', comment.id);
    formData.set('transcript', transcript.trim());
    if (isSpoiler) formData.set('isSpoiler', 'on');

    startTransition(async () => {
      const result = await updateVoiceComment(formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <Modal title="Editar nota de voz" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <VoiceNotePlayer
          src={comment.audio_url ?? undefined}
          duration={formatDuration(comment.voice_duration_seconds)}
        />
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Transcripción o resumen (opcional, ayuda a quien no puede escuchar)"
          rows={3}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} />
          Contiene spoilers
        </label>
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="button" onClick={handleSave} disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
