'use client';

import { useEffect, useRef, useState } from 'react';
import { cropToState, defaultCrop } from '@/lib/coverFrame';

// Posiciona la portada dentro de su contenedor según el encuadre guardado
// (o "Llenar" centrado si el libro todavía no tiene uno). El contenedor
// puede ser de cualquier tamaño — el héroe real (fluido) o la vista previa
// del editor (390×844 fijo) — porque el crop es independiente del tamaño.
export function CoverImage({ src, crop, alt = '' }) {
  const wrapRef = useRef(null);
  const [nat, setNat] = useState(null);
  const [transform, setTransform] = useState(null);

  useEffect(() => {
    if (!nat) return;

    function recompute() {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const box = { x: 0, y: 0, w: rect.width, h: rect.height };
      const usedCrop = crop ?? defaultCrop(nat);
      const { s, tx, ty } = cropToState(box, nat, usedCrop);
      setTransform({ s, tx, ty, w: nat.w });
    }

    recompute();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nat, crop]);

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- necesita transform-origin/scale en px reales para el encuadre; next/image no lo permite.
        <img
          src={src}
          alt={alt}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{
            position: 'absolute',
            transformOrigin: '0 0',
            maxWidth: 'none',
            width: transform ? transform.w : undefined,
            transform: transform ? `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.s})` : undefined,
            opacity: transform ? 1 : 0,
            transition: 'opacity 150ms ease',
          }}
        />
      )}
    </div>
  );
}
