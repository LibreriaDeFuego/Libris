'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/design-system/components/core/Button.jsx';
import { canvasToBlob } from '@/lib/imageProcessing';

// Recorte de portada, distinto del de PhotoCropModal a propósito: ahí la
// proporción es fija (círculo de perfil, 3:4 de las fotos) y lo que se
// mueve es la foto dentro de un marco quieto. Una portada de libro no
// tiene una única proporción — hay libros verticales de bolsillo y
// libros bien cuadrados — así que acá es al revés: la foto queda quieta,
// mostrada completa, y quien recorta arrastra las esquinas de un
// recuadro para darle la forma que haga falta. Es su propio componente
// (no una rama más de PhotoCropModal) porque la interacción — cambiar el
// tamaño del recuadro, no solo moverlo — es otro mecanismo, no una
// variante del mismo.
const STAGE_MAX_W = 296;
const STAGE_MAX_H = 420;
const MIN_SIZE = 40;
const OUTPUT_MAX_DIM = 1200;

const HANDLES = [
  { id: 'nw', top: 0, left: 0, cursor: 'nwse-resize' },
  { id: 'ne', top: 0, left: 1, cursor: 'nesw-resize' },
  { id: 'sw', top: 1, left: 0, cursor: 'nesw-resize' },
  { id: 'se', top: 1, left: 1, cursor: 'nwse-resize' },
];

function clampRectMove(rect, dx, dy, stageW, stageH) {
  const x = Math.min(Math.max(rect.x + dx, 0), stageW - rect.w);
  const y = Math.min(Math.max(rect.y + dy, 0), stageH - rect.h);
  return { ...rect, x, y };
}

// Redimensiona desde una esquina, manteniendo fija la esquina opuesta.
function clampRectResize(mode, rect, dx, dy, stageW, stageH) {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  let { x, y, w, h } = rect;

  if (mode === 'nw' || mode === 'sw') {
    x = Math.min(Math.max(rect.x + dx, 0), right - MIN_SIZE);
    w = right - x;
  } else {
    w = Math.min(Math.max(rect.w + dx, MIN_SIZE), stageW - rect.x);
  }
  if (mode === 'nw' || mode === 'ne') {
    y = Math.min(Math.max(rect.y + dy, 0), bottom - MIN_SIZE);
    h = bottom - y;
  } else {
    h = Math.min(Math.max(rect.h + dy, MIN_SIZE), stageH - rect.y);
  }
  return { x, y, w, h };
}

export function CoverCropModal({ file, title = 'Ajusta la portada', onConfirm, onCancel }) {
  const imgElRef = useRef(null);
  const dragRef = useRef(null);

  const [nat, setNat] = useState(null);
  const [stage, setStage] = useState(null); // { w, h, scale }
  const [rect, setRect] = useState(null);
  const [saving, setSaving] = useState(false);

  const imgUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl]);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      const natSize = { w: img.naturalWidth, h: img.naturalHeight };
      const scale = Math.min(STAGE_MAX_W / natSize.w, STAGE_MAX_H / natSize.h);
      const stageSize = { w: Math.round(natSize.w * scale), h: Math.round(natSize.h * scale), scale };
      setNat(natSize);
      setStage(stageSize);
      // Arranca mostrando la foto entera; se angosta desde las esquinas.
      setRect({ x: 0, y: 0, w: stageSize.w, h: stageSize.h });
    };
    img.src = imgUrl;
  }, [imgUrl]);

  function handleMoveStart(e) {
    if (!rect) return;
    dragRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, rectStart: rect };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleResizeStart(handleId) {
    return (e) => {
      e.stopPropagation();
      if (!rect) return;
      dragRef.current = { mode: handleId, startX: e.clientX, startY: e.clientY, rectStart: rect };
      e.currentTarget.setPointerCapture(e.pointerId);
    };
  }
  function handleStageMove(e) {
    const drag = dragRef.current;
    if (!drag || !stage) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.mode === 'move') {
      setRect(clampRectMove(drag.rectStart, dx, dy, stage.w, stage.h));
    } else {
      setRect(clampRectResize(drag.mode, drag.rectStart, dx, dy, stage.w, stage.h));
    }
  }
  function handleStageUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    if (!nat || !stage || !rect || !imgElRef.current) return;
    setSaving(true);
    try {
      const sx = rect.x / stage.scale;
      const sy = rect.y / stage.scale;
      const sw = rect.w / stage.scale;
      const sh = rect.h / stage.scale;

      const outW = sw >= sh ? Math.min(sw, OUTPUT_MAX_DIM) : (Math.min(sh, OUTPUT_MAX_DIM) * sw) / sh;
      const outH = sw >= sh ? (outW * sh) / sw : Math.min(sh, OUTPUT_MAX_DIM);

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(outW);
      canvas.height = Math.round(outH);
      canvas.getContext('2d').drawImage(imgElRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
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
          Arrastra las esquinas para darle la forma a la portada, y el interior para moverlo.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {stage && (
            <div
              onPointerMove={handleStageMove}
              onPointerUp={handleStageUp}
              onPointerCancel={handleStageUp}
              style={{ position: 'relative', width: stage.w, height: stage.h, background: 'var(--surface-sunken)', touchAction: 'none' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- superficie de recorte en px reales; next/image no lo permite. */}
              <img
                ref={imgElRef}
                src={imgUrl}
                alt=""
                draggable={false}
                style={{ position: 'absolute', top: 0, left: 0, width: stage.w, height: stage.h, userSelect: 'none' }}
              />

              {rect && (
                <div
                  onPointerDown={handleMoveStart}
                  style={{
                    position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', border: '1.5px solid #fff',
                    cursor: 'move', touchAction: 'none',
                  }}
                >
                  {HANDLES.map(({ id, top, left, cursor }) => (
                    <div
                      key={id}
                      onPointerDown={handleResizeStart(id)}
                      style={{
                        position: 'absolute', top: `${top * 100}%`, left: `${left * 100}%`,
                        width: 22, height: 22, transform: 'translate(-50%, -50%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor, touchAction: 'none',
                      }}
                    >
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="md" type="button" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="button" onClick={handleConfirm} disabled={!rect || saving}>
            {saving ? 'Preparando…' : 'Usar foto'}
          </Button>
        </div>
      </div>
    </div>
  );
}
