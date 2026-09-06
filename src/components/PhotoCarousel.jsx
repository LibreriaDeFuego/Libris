'use client';

import { useState } from 'react';

// Carrusel simple con scroll-snap nativo — sin ninguna librería, mismo
// criterio que el resto de la app (PhotoCropModal, PostComposer, etc. ya
// evitan dependencias para esto). Cada foto ocupa el ancho completo, se
// desliza con el dedo, y una fila de puntitos abajo marca en cuál está —
// solo aparece si hay más de una. Se usa tanto en Comentarios del club
// como en ActivityCard (Inicio/Perfil) para las fotos que se adjuntan a
// un comentario de capítulo (migración 042).
export function PhotoCarousel({ urls, aspectRatio = '3 / 4', maxWidth }) {
  const [index, setIndex] = useState(0);

  function handleScroll(e) {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  if (!urls || urls.length === 0) return null;

  return (
    <div style={{ position: 'relative', maxWidth }} onClick={(e) => e.stopPropagation()}>
      <div
        onScroll={handleScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          borderRadius: 'var(--radius-lg)', WebkitOverflowScrolling: 'touch',
        }}
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage (bucket privado) o dinámica, no algo que next/image pueda optimizar sin repetir la firma.
          <img
            key={i}
            src={url}
            alt=""
            style={{ width: '100%', aspectRatio, objectFit: 'cover', flexShrink: 0, scrollSnapAlign: 'start' }}
          />
        ))}
      </div>
      {urls.length > 1 && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none' }}>
          {urls.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: '0 0 2px rgba(0,0,0,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
