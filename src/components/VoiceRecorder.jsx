'use client';

import { useRef, useState, useTransition } from 'react';
import { postVoiceComment } from '@/app/actions/media';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';

// 90 segundos — antes eran 300 (5 minutos). Una nota de voz, en el club o
// en el feed, es una reacción, no una conversación grabada: 90 segundos
// alcanza de sobra para eso y sube mucho más rápido en una conexión
// mediocre. Mismo tope en los dos lugares a propósito (VoiceRecorder es un
// solo componente para ambos).
const MAX_SECONDS = 90;

// 32 kbps — el equivalente, para audio, de lo que `compressImage` ya hace
// con las fotos: bajarle el peso ANTES de subir, no confiar en que el
// bucket lo rechace después. Sin este número, MediaRecorder graba al
// bitrate que el navegador elija por default (pensado para audio en
// general, no para una voz hablando) — bastante más pesado de lo
// necesario. 32 kbps en opus es un estándar de sobra para que una voz se
// escuche clara (mismo orden de magnitud que ya usan las notas de voz de
// WhatsApp) — 90 segundos a este bitrate pesan bastante menos de 1 MB, muy
// lejos del tope de MAX_AUDIO_BYTES/MAX_VOICE_BYTES (media.js/posts.js),
// que queda como red de seguridad, no como el límite real.
const AUDIO_BITS_PER_SECOND = 32000;

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

// `postAction`/`extraFields`/`showSpoilerOption` dejan reusar el mismo
// grabador desde otros lugares que publican una nota de voz de otra forma
// (migración 052: el panel de "Agregar" del perfil, junto a
// Comentario/Cita/Foto·GIF) — antes esto llamaba siempre a
// `postVoiceComment` con `clubBookId`/`chapterId` fijos. `extraFields` se
// vuelca tal cual en el FormData (por ejemplo `{ clubBookId, chapterId }`
// para una nota de capítulo; nada para un post, que no necesita más
// contexto que la sesión). `showSpoilerOption` esconde el checkbox de
// spoiler donde no aplica — los posts del perfil no tienen ese concepto.
export function VoiceRecorder({ postAction = postVoiceComment, extraFields, showSpoilerOption = true, onDone }) {
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

    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
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
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        if (value != null) formData.set(key, value);
      }
    }
    formData.set('audio', audio.blob, `nota.${audio.blob.type.includes('mp4') ? 'm4a' : 'webm'}`);
    formData.set('duration', String(seconds));
    if (transcript.trim()) formData.set('transcript', transcript.trim());
    if (showSpoilerOption && isSpoiler) formData.set('isSpoiler', 'on');

    startTransition(async () => {
      const result = await postAction(formData);
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

          {showSpoilerOption && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={isSpoiler} onChange={(event) => setIsSpoiler(event.target.checked)} />
              Contiene spoilers
            </label>
          )}

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
