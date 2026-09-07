'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { formatBookDate, finishedYear } from '@/lib/bookDates';

// Una portada del Recuento — de solo lectura (nada de borrar ni editar
// acá, eso es cosa de Mi Biblioteca): mismo criterio de siempre para un
// libro sin portada subida (color sólido + título encima), más la fecha
// en la que se terminó abajo.
function RecapTile({ book }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
      <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.25 }}>
        {book.title}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
        {formatBookDate(book.finished_at)}
      </div>
    </div>
  );
}

// "Recuento del año" — el "Year in Books" de Goodreads: cuántos libros
// terminó esa persona en un año puntual, y cuáles. Un libro cuenta para
// el año en que se TERMINÓ (finished_at), no en el que se empezó — mismo
// criterio que Goodreads. Se llega desde Mi Biblioteca; usa la misma
// lista de libros que ya trae esa pantalla (booksRead), no pide nada
// nuevo al servidor.
export function RecuentoScreen({ profile, isOwn, booksRead }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const found = new Set(booksRead.map(finishedYear).filter(Boolean));
    found.add(currentYear);
    return [...found].sort((a, b) => b - a);
  }, [booksRead, currentYear]);

  const [selectedYear, setSelectedYear] = useState(years[0]);

  const booksThisYear = useMemo(
    () => booksRead.filter((book) => finishedYear(book) === selectedYear),
    [booksRead, selectedYear],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}>
          <Icon name="arrow-left" size={18} />
        </IconButton>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>
            {isOwn ? 'Tu recuento del año' : `Recuento de ${profile.display_name}`}
          </div>
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
            {booksThisYear.length} {booksThisYear.length === 1 ? 'libro' : 'libros'} en {selectedYear}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setSelectedYear(year)}
            style={{
              flexShrink: 0, padding: '6px 13px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-2xs)', fontWeight: 700,
              border: `1px solid ${selectedYear === year ? 'var(--neutral-900)' : 'var(--border-default)'}`,
              background: selectedYear === year ? 'var(--neutral-900)' : 'var(--surface-card)',
              color: selectedYear === year ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {year}
          </button>
        ))}
      </div>

      {booksThisYear.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          {isOwn ? `Todavía no terminaste ningún libro en ${selectedYear}.` : `Todavía no terminó ningún libro en ${selectedYear}.`}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 12px' }}>
          {booksThisYear.map((book) => <RecapTile key={book.book_id} book={book} />)}
        </div>
      )}
    </div>
  );
}
