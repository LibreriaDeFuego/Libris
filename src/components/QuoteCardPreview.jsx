'use client';

import { useEffect, useRef, useState } from 'react';
import { renderQuoteCard } from '@/lib/quoteCard';

// Vista previa real de la tarjeta — el mismo dibujo que se genera al
// descargar, no una aproximación. Se regenera sola (con un pequeño debounce)
// cada vez que cambia el texto o el estilo elegido, para que la persona vea
// exactamente cómo va a quedar antes de publicar.
export function QuoteCardPreview({ style, quoteText, book, clubName, personName }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef(null);
  const text = quoteText?.trim();

  useEffect(() => {
    if (!text) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      renderQuoteCard({ style, quoteText: text, book, clubName, personName })
        .then((blob) => {
          if (cancelled) return;
          const nextUrl = URL.createObjectURL(blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = nextUrl;
          setPreviewUrl(nextUrl);
        })
        .catch(() => {
          // Si algo falla (por ejemplo, la portada no carga por CORS) se
          // deja la vista previa anterior en vez de romper el formulario.
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- "book" es un objeto nuevo en cada render del padre; comparar por sus campos evita regenerar la vista previa en un loop.
  }, [style, text, book?.title, book?.author, book?.cover_url, book?.cover_has_title, clubName, personName]);

  // Al desmontar, liberar la última URL generada.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  if (!text) return null;

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative',
        background: 'var(--surface-sunken)', aspectRatio: style === 'dark' ? '1 / 1' : '4 / 5',
        maxWidth: 220, margin: '0 auto',
      }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- vista previa generada en el navegador (blob URL), no una imagen de /public
        <img src={previewUrl} alt="Vista previa de la tarjeta" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
          Generando vista previa…
        </div>
      )}
      {loading && previewUrl && (
        <div
          style={{
            position: 'absolute', top: 8, right: 8, background: 'rgba(27,27,31,0.6)', color: '#fff',
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
          }}
        >
          Actualizando…
        </div>
      )}
    </div>
  );
}
