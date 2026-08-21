'use client';

import { useRef, useState, useTransition } from 'react';
import { postVoiceComment } from '@/app/actions/media';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';

const MAX_SECONDS = 300;

function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Elige un formato que el navegador sepa grabar: Chrome/Android usa webm,
// Safari mp4.
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const type of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function VoiceRecorder({ clubBookId, chapterId, onDone }) {
  const [status, setStatus] = useState('idle'); // idle | recording | ready
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState(null); // { blob, url }
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function startRecording() {
    setError(null);
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError('Tu navegador no permite grabar audio. Prueba con Chrome.');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('No pudimos acceder al micrófono. Revisa los permisos del navegador.');
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      // Soltamos el micrófono para que el navegador saque el indicador de
      // "grabando"; si no, queda encendido aunque ya no se use.
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setAudio({ blob, url: URL.createObjectURL(blob) });
      setStatus('ready');
    };

    recorder.start();
    recorderRef.current = recorder;
    setSeconds(0);
    setStatus('recording');

    timerRef.current = setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= MAX_SECONDS) stopRecording();
        return current + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    stopTimer();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function discard() {
    stopTimer();
    if (audio?.url) URL.revokeObjectURL(audio.url);
    setAudio(null);
    setSeconds(0);
    setStatus('idle');
    setTranscript('');
    setError(null);
  }

  function publish() {
    if (!audio) return;
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    if (chapterId) formData.set('chapterId', chapterId);
    formData.set('audio', audio.blob, `nota.${audio.blob.type.includes('mp4') ? 'm4a' : 'webm'}`);
    formData.set('duration', String(seconds));
    if (transcript.trim()) formData.set('transcript', transcript.trim());
    if (isSpoiler) formData.set('isSpoiler', 'on');

    startTransition(async () => {
      const result = await postVoiceComment(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        discard();
        onDone?.();
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {status === 'idle' && (
        <Button variant="secondary" size="md" onClick={startRecording} type="button">
          <Icon name="mic" size={16} />
          Grabar nota de voz
        </Button>
      )}

      {status === 'recording' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>
            Grabando… {formatSeconds(seconds)}
          </span>
          <Button variant="primary" size="sm" onClick={stopRecording} type="button">Listo</Button>
        </div>
      )}

      {status === 'ready' && audio && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <audio src={audio.url} controls style={{ flex: 1, height: 36 }} />
            <IconButton aria-label="Descartar grabación" onClick={discard} type="button">
              <Icon name="trash-2" size={16} />
            </IconButton>
          </div>

          <Textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={2}
            placeholder="Transcripción o resumen (opcional, ayuda a quien no puede escuchar)"
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={isSpoiler} onChange={(event) => setIsSpoiler(event.target.checked)} />
            Contiene spoilers
          </label>

          <Button variant="primary" size="md" onClick={publish} disabled={pending} type="button">
            {pending ? 'Publicando…' : `Publicar nota de ${formatSeconds(seconds)}`}
          </Button>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
