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

// Descarga la tarjeta de la cita. Si ya se guardó una imagen al publicar
// (imageUrl), descarga exactamente esa — ni un pixel distinto de lo que se
// ve en el feed. Si no (citas de antes de que existiera esto, o si la subida
// falló en su momento), la arma de nuevo al vuelo a partir del texto y el
// estilo guardados, igual que siempre.
export function DownloadQuoteImageButton({ style, quoteText, book, clubName, personName, imageUrl, variant = 'secondary', size = 'sm', label = 'Descargar imagen' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const blob = imageUrl
        ? await fetch(imageUrl).then((res) => {
            if (!res.ok) throw new Error('No se pudo descargar la imagen.');
            return res.blob();
          })
        : await renderQuoteCard({ style, quoteText, book, clubName, personName });
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
