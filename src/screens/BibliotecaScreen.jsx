'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { AddPersonalBookForm } from '@/components/AddPersonalBookForm';
import { EditPersonalBookForm } from '@/components/EditPersonalBookForm';
import { deletePersonalBook } from '@/app/actions/library';
import { formatDateRange } from '@/lib/bookDates';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'club', label: 'De mis clubes' },
  { id: 'personal', label: 'Agregados por mí' },
];

// Una portada de la grilla — mismo criterio que la estantería del Perfil
// (BookCover, PerfilScreen.jsx) para un libro sin portada subida: color
// sólido + el título encima, porque acá la portada es lo único que hay
// (el título también se repite abajo, aparte, pero adentro del
// rectángulo no hay más pista que esa si falta la imagen real). Un
// agregado a mano, en la propia biblioteca, se puede tocar para editar
// título/autor/fechas (migración 047) — una reseña de club no, esa se
// administra desde el club.
function BookTile({ book, isOwn, onDelete, onEdit }) {
  const editable = isOwn && book.source === 'personal';
  const dateLabel = formatDateRange(book.started_at, book.finished_at);

  return (
    <div
      onClick={editable ? onEdit : undefined}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      style={{ display: 'flex', flexDirection: 'column', cursor: editable ? 'pointer' : 'default' }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            aspectRatio: '2 / 3', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)',
            position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 8,
            background: book.cover_url ? `center/cover no-repeat url(${book.cover_url})` : 'var(--accent-500)',
          }}
        >
          {!book.cover_url && (
            <>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%)' }} />
              <span style={{ position: 'relative', fontFamily: 'var(--font-display)', fontSize: 12, lineHeight: 1.2, color: '#fff' }}>
                {book.title}
              </span>
            </>
          )}
        </div>
        {/* Solo se puede borrar lo agregado a mano — una reseña final se
            maneja desde el club, no acá. stopPropagation para no abrir
            también el editor al tocar la ×. */}
        {editable && (
          <button
            type="button"
            aria-label={`Quitar "${book.title}" de mi biblioteca`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(27,27,31,.55)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={11} color="#fff" />
          </button>
        )}
      </div>
      <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.25 }}>
        {book.title}
      </div>
      {book.author && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{book.author}</div>
      )}
      {dateLabel && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{dateLabel}</div>
      )}
    </div>
  );
}

// "Mi biblioteca" (o la de otra persona, sin el botón de agregar) — se
// llega tocando la estantería del Perfil o el número "Libros". Junta en
// una sola grilla los libros de reseña final de un club con los
// agregados a mano (profile_books_read, migración 046, campo "source"),
// cada uno con su fecha de empezado/terminado si la tiene (migración
// 047) — de ahí se pasa al Recuento del año.
export function BibliotecaScreen({ profile, isOwn, booksRead }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [editingBook, setEditingBook] = useState(null);
  const [, startTransition] = useTransition();

  const visible = filter === 'all' ? booksRead : booksRead.filter((b) => b.source === filter);
  const recuentoHref = isOwn ? '/perfil/biblioteca/recuento' : `/perfil/${profile.id}/biblioteca/recuento`;

  function handleDelete(book) {
    if (!window.confirm(`¿Quitar "${book.title}" de tu biblioteca?`)) return;
    startTransition(async () => {
      await deletePersonalBook(book.book_id);
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}>
          <Icon name="arrow-left" size={18} />
        </IconButton>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>
            {isOwn ? 'Mi biblioteca' : `Biblioteca de ${profile.display_name}`}
          </div>
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
            {booksRead.length} {booksRead.length === 1 ? 'libro' : 'libros'}
          </div>
        </div>
      </div>

      {isOwn && <AddPersonalBookForm />}

      {booksRead.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  flexShrink: 0, padding: '6px 13px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-2xs)', fontWeight: 700,
                  border: `1px solid ${filter === f.id ? 'var(--neutral-900)' : 'var(--border-default)'}`,
                  background: filter === f.id ? 'var(--neutral-900)' : 'var(--surface-card)',
                  color: filter === f.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link
            href={recuentoHref}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--accent-500)', whiteSpace: 'nowrap',
            }}
          >
            Recuento del año
            <Icon name="chevron-right" size={13} color="var(--accent-500)" />
          </Link>
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          {isOwn ? 'Todavía no tienes libros acá.' : 'Todavía no tiene libros acá.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 12px' }}>
          {visible.map((book) => (
            <BookTile
              key={book.book_id}
              book={book}
              isOwn={isOwn}
              onDelete={() => handleDelete(book)}
              onEdit={() => setEditingBook(book)}
            />
          ))}
        </div>
      )}

      {editingBook && (
        <EditPersonalBookForm book={editingBook} onClose={() => setEditingBook(null)} />
      )}
    </div>
  );
}
