'use client';

import { useEffect, useRef, useState } from 'react';

// Carrusel horizontal entre secciones — el héroe, "Tu camino" y "Actividad
// del club" en Mis clubes de lectura (o solo camino/actividad, debajo del
// héroe, en la pantalla de un club puntual). Scroll nativo con snap
// (funciona con el gesto de deslizar de toda la vida, sin librería), más
// los puntitos de abajo por si alguien no descubre que se puede deslizar —
// se pueden tocar para saltar directo a esa sección. `onActiveIndexChange`
// (opcional) avisa al padre en cuál quedó, por si necesita mostrar u
// ocultar algo alrededor del carrusel según cuál sección está activa.
export function SwipeableSections({ sections, onActiveIndexChange }) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const programmatic = useRef(false);
  const releaseTimer = useRef(null);

  useEffect(() => {
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

  function handleScroll() {
    if (programmatic.current) return;
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex((prev) => (prev === index ? prev : index));
  }

  function goTo(index) {
    const el = containerRef.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
    setActiveIndex(index);
    clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => { programmatic.current = false; }, 500);
  }

  if (!sections || sections.length === 0) return null;

  return (
    <div>
      {sections.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0 2px' }}>
          {sections.map((section, i) => (
            <button
              key={section.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={section.key}
              aria-current={i === activeIndex}
              style={{
                width: i === activeIndex ? 18 : 6, height: 6, borderRadius: 999, padding: 0, border: 'none', cursor: 'pointer',
                background: i === activeIndex ? 'var(--accent-500)' : 'var(--neutral-200)', transition: 'width .18s',
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar"
        style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', alignItems: 'flex-start' }}
      >
        {sections.map((section) => (
          <div key={section.key} style={{ flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'start' }}>
            {section.node}
          </div>
        ))}
      </div>
    </div>
  );
}
