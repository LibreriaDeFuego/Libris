'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

// Pantalla completa para ver una foto sin recortar. PhotoCarousel (y
// cualquier otro lugar que adjunte fotos) las muestra recortadas a un
// aspect-ratio fijo (objectFit: cover) para que el carrusel quede
// prolijo — acá, al tocar cualquiera, se ve la imagen entera tal cual es
// (objectFit: contain). Mismo createPortal que Modal.jsx y por el mismo
// motivo: así no importa en qué contexto de apilamiento viva el carrusel
// que la abrió, esto siempre pinta por encima de todo.
//
// Con varias fotos, el desplazamiento es el mismo scroll-snap nativo que
// ya usa PhotoCarousel (deslizar con el dedo) — la primera versión solo
// tenía flechas para tocar, y perdía justo el gesto que ya funcionaba en
// el carrusel chico. Las flechas se mantienen como alternativa (mouse,
// lector de pantalla), pero ya no son la única forma de pasar de foto.
export function PhotoLightbox({ urls, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef(null);
  const programmatic = useRef(false);

  // Posiciona en la foto tocada al abrir, sin animación — un scroll
  // "smooth" acá se vería como que la pantalla se desliza sola apenas
  // entrás.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollLeft = initialIndex * el.clientWidth;
    const t = setTimeout(() => { programmatic.current = false; }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll(e) {
    if (programmatic.current) return;
    const el = e.currentTarget;
    if (el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  }

  function goTo(e, delta) {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const next = (index + delta + urls.length) % urls.length;
    programmatic.current = true;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
    setTimeout(() => { programmatic.current = false; }, 400);
  }

  if (typeof document === 'undefined') return null;

  const arrowStyle = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 40, height: 40,
    borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, zIndex: 1,
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, zIndex: 1,
        }}
      >
        ×
      </button>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar"
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
          width: '100%', height: '100%',
        }}
      >
        {urls.map((url, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'start',
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage (bucket privado) o dinámica, igual que PhotoCarousel. */}
            <img
              src={url}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '92%', maxHeight: '88%', objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>

      {urls.length > 1 && (
        <>
          <button type="button" onClick={(e) => goTo(e, -1)} aria-label="Foto anterior" style={{ ...arrowStyle, left: 12 }}>‹</button>
          <button type="button" onClick={(e) => goTo(e, 1)} aria-label="Foto siguiente" style={{ ...arrowStyle, right: 12 }}>›</button>
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
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
