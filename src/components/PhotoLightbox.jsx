'use client';

import { createPortal } from 'react-dom';
import { useState } from 'react';

// Pantalla completa para ver una foto sin recortar. PhotoCarousel (y
// cualquier otro lugar que adjunte fotos) las muestra recortadas a un
// aspect-ratio fijo (objectFit: cover) para que el carrusel quede
// prolijo — acá, al tocar cualquiera, se ve la imagen entera tal cual es
// (objectFit: contain). Mismo createPortal que Modal.jsx y por el mismo
// motivo: así no importa en qué contexto de apilamiento viva el carrusel
// que la abrió, esto siempre pinta por encima de todo.
export function PhotoLightbox({ urls, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  if (typeof document === 'undefined') return null;

  function goTo(e, delta) {
    e.stopPropagation();
    setIndex((i) => (i + delta + urls.length) % urls.length);
  }

  const arrowStyle = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 40, height: 40,
    borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage (bucket privado) o dinámica, igual que PhotoCarousel. */}
      <img
        src={urls[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '92%', maxHeight: '88%', objectFit: 'contain' }}
      />

      {urls.length > 1 && (
        <>
          <button type="button" onClick={(e) => goTo(e, -1)} aria-label="Foto anterior" style={{ ...arrowStyle, left: 12 }}>‹</button>
          <button type="button" onClick={(e) => goTo(e, 1)} aria-label="Foto siguiente" style={{ ...arrowStyle, right: 12 }}>›</button>
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {urls.map((_, i) => (
              <span
                key={i}
                style={{ width: 6, height: 6, borderRadius: '50%', background: i === index ? '#fff' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
