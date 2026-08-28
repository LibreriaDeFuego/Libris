'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { QUOTE_STYLES, renderQuoteCard } from '@/lib/quoteCard';
import { QuoteCardPreview } from '@/components/QuoteCardPreview';
import { StyleSwatch } from '@/components/NewCommentForm';
import { updateQuote } from '@/app/actions/clubs';

// Editar tu propia cita: mismo texto + selector de estilo + vista previa
// real que ya usa NewCommentForm al publicar — acá regenera la tarjeta con
// el texto nuevo y la reemplaza (updateQuote se encarga de borrar la
// imagen vieja en Storage).
export function EditQuoteModal({ quote, book, clubName, personName, onClose }) {
  const [body, setBody] = useState(quote.body ?? '');
  const [quoteStyle, setQuoteStyle] = useState(quote.quote_style ?? 'cover');
  const [isSpoiler, setIsSpoiler] = useState(quote.is_spoiler ?? false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const text = body.trim();
    if (!text) {
      setError('Escribe algo antes de guardar.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('commentId', quote.id);
      formData.set('body', text);
      formData.set('quoteStyle', quoteStyle);
      if (isSpoiler) formData.set('isSpoiler', 'on');

      // Mismo "mejor esfuerzo" que al publicar: si esto falla, se guarda
      // igual, solo que sin imagen (el feed cae al tratamiento genérico).
      try {
        const blob = await renderQuoteCard({ style: quoteStyle, quoteText: text, book, clubName, personName });
        formData.set('quoteImage', blob, 'cita.jpg');
      } catch {
        // sigue sin la imagen.
      }

      const result = await updateQuote(formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <Modal title="Editar cita" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe una cita destacada..."
          rows={3}
        />
        <div>
          <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Estilo de la tarjeta
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {QUOTE_STYLES.map((s) => (
              <StyleSwatch key={s.id} id={s.id} label={s.label} selected={quoteStyle === s.id} onSelect={setQuoteStyle} coverUrl={book?.cover_url} />
            ))}
          </div>
        </div>
        <QuoteCardPreview style={quoteStyle} quoteText={body} book={book} clubName={clubName} personName={personName} />
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
