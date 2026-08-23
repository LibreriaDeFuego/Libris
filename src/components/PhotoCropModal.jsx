'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/design-system/components/core/Button.jsx';
import { baseScale, clamp, stateToCrop } from '@/lib/coverFrame';
import { canvasToBlob } from '@/lib/imageProcessing';

const STAGE_WIDTH = 260;

// Recorte al estilo Instagram (arrastrar + acercar) antes de subir una
// foto: misma matemática que el encuadre de portada de club
// (src/lib/coverFrame.js — box/nat/s/tx/ty), aplicada a un recuadro fijo
// en vez del héroe de la app. "aspect" es ancho/alto (1 = cuadrado, la
// proporción de la foto de perfil); queda listo para reusarse con otra
// proporción — por ejemplo 4:5, como el feed de fotos de Instagram — el
// día que exista un feed de fotos en Libris.
export function PhotoCropModal({
  file,
  aspect = 1,
  shape = 'circle',
  outputSize = 480,
  title = 'Ajusta la foto',
  onConfirm,
  onCancel,
}) {
  const dragRef = useRef(null);
  const imgElRef = useRef(null);

  const [nat, setNat] = useState(null);
  const [state, setState] = useState({ s: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const box = { x: 0, y: 0, w: STAGE_WIDTH, h: Math.round(STAGE_WIDTH / aspect) };

  // Un objeto URL por archivo (se libera al cambiar de archivo o desmontar).
  const imgUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl]);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      const natSize = { w: img.naturalWidth, h: img.naturalHeight };
      const s = baseScale(box, natSize);
      setNat(natSize);
      setState({ s, tx: box.x + (box.w - natSize.w * s) / 2, ty: box.y + (box.h - natSize.h * s) / 2 });
    };
    img.src = imgUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgUrl]);

  function clampState(s, tx, ty) {
    const c = clamp(box, nat, s, tx, ty);
    return { s, tx: c.tx, ty: c.ty };
  }

  function handlePointerDown(e) {
    if (!nat) return;
    dragRef.current = { px: e.clientX, py: e.clientY, tx: state.tx, ty: state.ty };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!dragRef.current || !nat) return;
    const tx = dragRef.current.tx + (e.clientX - dragRef.current.px);
    const ty = dragRef.current.ty + (e.clientY - dragRef.current.py);
    setState(clampState(state.s, tx, ty));
  }
  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  const base = nat ? baseScale(box, nat) : 1;
  const zoomPct = nat ? Math.round((state.s / base) * 100) : 100;

  function handleZoomSlider(e) {
    if (!nat) return;
    const value = Number(e.target.value);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const nx = (cx - state.tx) / state.s;
    const ny = (cy - state.ty) / state.s;
    const s = (base * value) / 100;
    setState(clampState(s, cx - nx * s, cy - ny * s));
  }

  async function handleConfirm() {
    if (!nat || !imgElRef.current) return;
    setSaving(true);
    try {
      const crop = stateToCrop(box, nat, state.s, state.tx, state.ty);
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = Math.round(outputSize / aspect);
      canvas.getContext('2d').drawImage(
        imgElRef.current,
        crop.x * nat.w, crop.y * nat.h, crop.w * nat.w, crop.h * nat.h,
        0, 0, canvas.width, canvas.height,
      );
      const blob = await canvasToBlob(canvas, 0.85);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', padding: 22, width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginBottom: 16 }}>
          Arrastra para mover, usa la barra para acercar.
        </div>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'relative', width: box.w, height: box.h, margin: '0 auto',
            borderRadius: shape === 'circle' ? '50%' : 'var(--radius-md)',
            overflow: 'hidden', background: 'var(--surface-sunken)',
            cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none',
          }}
        >
          {imgUrl && nat && (
            // eslint-disable-next-line @next/next/no-img-element -- superficie de arrastre/zoom en px reales dentro del recorte; next/image no lo permite.
            <img
              ref={imgElRef}
              src={imgUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute', transformOrigin: '0 0', maxWidth: 'none', userSelect: 'none',
                width: nat.w, transform: `translate(${state.tx}px, ${state.ty}px) scale(${state.s})`,
              }}
            />
          )}
        </div>

        {nat && (
          <input
            type="range"
            min={100}
            max={320}
            value={zoomPct}
            onChange={handleZoomSlider}
            aria-label="Acercar"
            style={{ width: '100%', marginTop: 16 }}
          />
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="md" type="button" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="button" onClick={handleConfirm} disabled={!nat || saving}>
            {saving ? 'Preparando…' : 'Usar foto'}
          </Button>
        </div>
      </div>
    </div>
  );
}
