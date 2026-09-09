'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotableBooks, createProfileQuote } from '@/app/actions/quotes';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { CoverCropModal } from '@/components/CoverCropModal';
import { CardStylePicker } from '@/components/CardStylePicker';
import { DEFAULT_CARD_STYLE, DEFAULT_CARD_COLOR_BY_STYLE } from '@/lib/quoteFeedCard';

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
// que primero hay que elegir DE QUÉ libro es. Dos formas de elegirlo:
//   - De la lista (profile_quotable_books) — los libros de tus clubes
//     (cualquiera, no necesariamente terminado) más los agregados a mano
//     en Mi Biblioteca.
//   - "Otro libro" (migración 051) — cualquiera que no esté en esa lista:
//     título + autor a mano, con una portada opcional (mismo recorte de
//     marco ajustable que Mi Biblioteca, CoverCropModal — tampoco acá hay
//     una única proporción). No queda guardado en ningún lado más que en
//     la cita misma: no se agrega a Mi Biblioteca ni aparece después en
//     la lista de "tus libros" — es solo para esta cita puntual.
// Después de elegir el libro y escribir la cita, un estilo propio para
// verse en el feed (migración 050, CardStylePicker).
export function QuoteComposer({ onClose }) {
  const router = useRouter();
  const [books, setBooks] = useState(null); // null = cargando
  const [selectedBook, setSelectedBook] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualPendingFile, setManualPendingFile] = useState(null);
  const [manualCoverBlob, setManualCoverBlob] = useState(null);
  const [manualCoverPreviewUrl, setManualCoverPreviewUrl] = useState(null);
  const manualCoverInputRef = useRef(null);
  const [quoteText, setQuoteText] = useState('');
  const [cardStyle, setCardStyle] = useState(DEFAULT_CARD_STYLE);
  const [cardColor, setCardColor] = useState(DEFAULT_CARD_COLOR_BY_STYLE[DEFAULT_CARD_STYLE]);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getQuotableBooks().then((result) => {
      if (active) setBooks(result.books ?? []);
    });
    return () => { active = false; };
  }, []);

  // Libera el object URL de la portada del libro "a mano" al reemplazarla
  // o al desmontar — mismo criterio que PreviewImage (PostComposer.jsx).
  useEffect(() => {
    if (!manualCoverPreviewUrl) return undefined;
    return () => URL.revokeObjectURL(manualCoverPreviewUrl);
  }, [manualCoverPreviewUrl]);

  function resetManualEntry() {
    setManualEntry(false);
    setManualTitle('');
    setManualAuthor('');
    setManualPendingFile(null);
    setManualCoverBlob(null);
    setManualCoverPreviewUrl(null);
  }

  function handlePickManualCover(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setManualPendingFile(file);
  }

  function handleManualCropConfirm(blob) {
    setManualCoverBlob(blob);
    setManualCoverPreviewUrl(URL.createObjectURL(blob));
    setManualPendingFile(null);
  }

  function confirmManualBook() {
    if (!manualTitle.trim()) {
      setError('Escribe el título del libro.');
      return;
    }
    setError(null);
    setSelectedBook({
      title: manualTitle.trim(),
      author: manualAuthor.trim() || null,
      cover_url: manualCoverPreviewUrl,
      coverBlob: manualCoverBlob,
    });
  }

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
    // Un libro "a mano" trae la portada como blob (todavía sin subir); uno
    // de la lista ya trae su cover_url — createProfileQuote sube el blob
    // recién acá, al publicar (mismo patrón que AddPersonalBookForm).
    if (selectedBook.coverBlob) {
      formData.set('cover', selectedBook.coverBlob, 'portada.jpg');
    } else {
      formData.set('bookCoverUrl', selectedBook.cover_url ?? '');
    }
    formData.set('quoteText', quoteText.trim());
    formData.set('cardStyle', cardStyle);
    formData.set('cardColor', cardColor);

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
        {!selectedBook && manualEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={() => manualCoverInputRef.current?.click()}
                style={{
                  flexShrink: 0, width: 64, aspectRatio: '2 / 3', borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-default)', background: 'var(--surface-sunken)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, overflow: 'hidden',
                }}
              >
                {manualCoverPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob recién generado, no una URL persistida.
                  <img src={manualCoverPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <Icon name="image" size={20} color="var(--text-tertiary)" />
                )}
              </button>
              <input
                ref={manualCoverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePickManualCover}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <Input placeholder="Título" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
                <Input placeholder="Autor (opcional)" value={manualAuthor} onChange={(e) => setManualAuthor(e.target.value)} />
              </div>
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="md" type="button" onClick={resetManualEntry}>
                Volver
              </Button>
              <Button variant="primary" size="md" type="button" onClick={confirmManualBook}>
                Usar este libro
              </Button>
            </div>

            {manualPendingFile && (
              <CoverCropModal
                file={manualPendingFile}
                title="Ajusta la portada"
                onConfirm={handleManualCropConfirm}
                onCancel={() => setManualPendingFile(null)}
              />
            )}
          </div>
        )}

        {!selectedBook && !manualEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {books === null && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: '8px 0' }}>Cargando tus libros…</div>
              )}
              {books && books.length === 0 && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: '8px 0' }}>
                  Todavía no tienes libros para citar acá — agrega uno en Mi Biblioteca, empieza a leer uno en un club, o elige otro libro abajo.
                </div>
              )}
              {books?.map((book, i) => (
                <BookRow key={`${book.title}-${i}`} book={book} onClick={() => setSelectedBook(book)} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setManualEntry(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--accent-600)', fontFamily: 'var(--font-body)',
              }}
            >
              <Icon name="plus" size={14} color="var(--accent-600)" /> Otro libro (no está en la lista)
            </button>
          </div>
        )}

        {selectedBook && (
          <>
            <button
              type="button"
              onClick={() => { setSelectedBook(null); resetManualEntry(); }}
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
            <CardStylePicker
              style={cardStyle}
              color={cardColor}
              onChange={({ style, color }) => { setCardStyle(style); setCardColor(color); }}
              quoteText={quoteText}
              book={selectedBook}
            />
          </>
        )}

        {error && !manualEntry && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          {!manualEntry && (
            <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
          )}
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
