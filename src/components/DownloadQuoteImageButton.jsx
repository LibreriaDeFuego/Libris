'use client';

import { useState } from 'react';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { renderQuoteCard } from '@/lib/quoteCard';

function slugify(text) {
  return (text || 'cita')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'cita';
}

// Genera la tarjeta de la cita al vuelo y dispara la descarga del navegador
// — no se guarda ninguna imagen, se arma de nuevo cada vez a partir del
// texto y el estilo guardados.
export function DownloadQuoteImageButton({ style, quoteText, book, clubName, personName, variant = 'secondary', size = 'sm', label = 'Descargar imagen' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const blob = await renderQuoteCard({ style, quoteText, book, clubName, personName });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `libris-cita-${slugify(book?.title)}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo generar la imagen. Intenta de nuevo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button variant={variant} size={size} type="button" onClick={handleClick} disabled={pending}>
        <Icon name="download" size={14} />
        {pending ? 'Generando…' : label}
      </Button>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}
