'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { CardStylePicker } from '@/components/CardStylePicker';
import { DEFAULT_CARD_STYLE, DEFAULT_CARD_COLOR_BY_STYLE } from '@/lib/quoteFeedCard';
import { updateQuote } from '@/app/actions/clubs';

// Editar tu propia cita: texto + estilo propio para el feed (migración
// 050, CardStylePicker) — mismo selector que ya usa NewCommentForm al
// publicar.
export function EditQuoteModal({ quote, book, onClose }) {
  const [body, setBody] = useState(quote.body ?? '');
  const [cardStyle, setCardStyle] = useState(quote.card_style ?? DEFAULT_CARD_STYLE);
  const [cardColor, setCardColor] = useState(quote.card_color ?? DEFAULT_CARD_COLOR_BY_STYLE[quote.card_style ?? DEFAULT_CARD_STYLE]);
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
      formData.set('cardStyle', cardStyle);
      formData.set('cardColor', cardColor);
      if (isSpoiler) formData.set('isSpoiler', 'on');

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
            Cómo se ve en el feed
          </div>
          <CardStylePicker
            style={cardStyle}
            color={cardColor}
            onChange={({ style, color }) => { setCardStyle(style); setCardColor(color); }}
            quoteText={body}
            book={book}
          />
        </div>
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
