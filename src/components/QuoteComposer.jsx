'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotableBooks, createProfileQuote } from '@/app/actions/quotes';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Una fila de la lista de libros para elegir — mismo criterio de siempre
// para uno sin portada (color sólido), en miniatura.
function BookRow({ book, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 8,
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
        background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          width: 32, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: book.cover_url ? `center/cover no-repeat url(${book.cover_url})` : 'var(--accent-500)',
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.title}
        </div>
        {book.author && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{book.author}</div>}
      </div>
    </button>
  );
}

// Agregar una cita destacada desde el perfil (migración 049) — sin
// club_book_id (no se está mirando ningún libro puntual de un club), así
// que primero hay que elegir DE QUÉ libro es: la lista sale de
// profile_quotable_books — los libros de tus clubes (cualquiera, no
// necesariamente terminado) más los agregados a mano en Mi Biblioteca.
// Alcance chico a propósito: sin estilo de tarjeta para compartir (eso es
// cosa de las citas de club, ver quoteCard.js) — el feed la muestra con
// el tratamiento genérico (portada + texto en cursiva) que ya usa
// cualquier cita sin imagen guardada.
export function QuoteComposer({ onClose }) {
  const router = useRouter();
  const [books, setBooks] = useState(null); // null = cargando
  const [selectedBook, setSelectedBook] = useState(null);
  const [quoteText, setQuoteText] = useState('');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getQuotableBooks().then((result) => {
      if (active) setBooks(result.books ?? []);
    });
    return () => { active = false; };
  }, []);

  function publish() {
    if (!selectedBook) {
      setError('Elige un libro.');
      return;
    }
    if (!quoteText.trim()) {
      setError('Escribe la cita.');
      return;
    }
    const formData = new FormData();
    formData.set('bookTitle', selectedBook.title);
    formData.set('bookAuthor', selectedBook.author ?? '');
    formData.set('bookCoverUrl', selectedBook.cover_url ?? '');
    formData.set('quoteText', quoteText.trim());

    startTransition(async () => {
      const result = await createProfileQuote(null, formData);
      if (result?.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <Modal title="Agregar una cita" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!selectedBook ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {books === null && (
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: '8px 0' }}>Cargando tus libros…</div>
            )}
            {books && books.length === 0 && (
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: '8px 0' }}>
                Todavía no tienes libros para citar — agrega uno en Mi Biblioteca o empieza a leer uno en un club.
              </div>
            )}
            {books?.map((book, i) => (
              <BookRow key={`${book.title}-${i}`} book={book} onClick={() => setSelectedBook(book)} />
            ))}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedBook(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}
            >
              <div
                style={{
                  width: 32, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: selectedBook.cover_url ? `center/cover no-repeat url(${selectedBook.cover_url})` : 'var(--accent-500)',
                }}
              />
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
                {selectedBook.title}
              </div>
              <Icon name="chevron-down" size={14} color="var(--text-tertiary)" />
            </button>
            <Textarea
              placeholder="Escribe la cita"
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              rows={4}
            />
          </>
        )}

        {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          {selectedBook && (
            <Button variant="primary" size="md" type="button" onClick={publish} disabled={pending}>
              {pending ? 'Publicando…' : 'Publicar'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
