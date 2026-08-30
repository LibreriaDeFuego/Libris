'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { CoverHero } from '@/components/CoverHero';
import { updateCoverFrame } from '@/app/actions/media';
import { HERO_ASPECT, baseScale, fitScale, clamp, PRESETS, stateToCrop, cropToState } from '@/lib/coverFrame';
import { computeHeroProgress } from '@/lib/heroProgress';

const PRESET_LIST = [
  { key: 'fit', icon: 'minimize-2', label: 'Ajustar entera' },
  { key: 'fill', icon: 'maximize-2', label: 'Llenar' },
  { key: 'top', icon: 'arrow-up-to-line', label: 'Alinear arriba' },
  { key: 'face', icon: 'scan-face', label: 'Centrar tercio superior' },
];

// El admin arrastra y hace zoom sobre la portada para decidir qué parte se
// ve en el héroe, con vista previa en vivo. La matemática (escala, clamp,
// presets, persistencia como 4 números normalizados) está portada casi
// literal de cover-framer.js — ver src/lib/coverFrame.js.
export function EncuadreScreen({ club, clubs, book, chapters, volumes, myProgress }) {
  const router = useRouter();
  const stageRef = useRef(null);
  const dragRef = useRef(null);

  const [stageBox, setStageBox] = useState(null);
  const [nat, setNat] = useState(null);
  const [state, setState] = useState({ s: 1, tx: 0, ty: 0 });
  const [activePreset, setActivePreset] = useState('fill');
  const [initialized, setInitialized] = useState(false);
  const [hasTitle, setHasTitle] = useState(book.cover_has_title ?? true);
  const [dragging, setDragging] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Mide el "escenario": un recuadro con la proporción del héroe (390×844)
  // centrado dentro del panel disponible.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    function measure() {
      const rect = el.getBoundingClientRect();
      const pad = 26;
      let h = rect.height - pad * 2;
      let w = h * HERO_ASPECT;
      if (w > rect.width - pad * 2) {
        w = rect.width - pad * 2;
        h = w / HERO_ASPECT;
      }
      setStageBox({ w, h, x: (rect.width - w) / 2, y: (rect.height - h) / 2 });
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Precarga la imagen para conocer su tamaño natural.
  useEffect(() => {
    if (!book.cover_url) return;
    const img = new window.Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = book.cover_url;
  }, [book.cover_url]);

  function clampState(box, natSize, s, tx, ty) {
    const c = clamp(box, natSize, s, tx, ty);
    return { s, tx: c.tx, ty: c.ty };
  }

  function applyPreset(key) {
    if (!stageBox || !nat) return;
    const { s, tx, ty } = PRESETS[key](stageBox, nat);
    setState(clampState(stageBox, nat, s, tx, ty));
    setActivePreset(key);
  }

  // Arranca del encuadre ya guardado (si hay uno) o de "Llenar", apenas
  // tenemos escenario + tamaño natural. Se ajusta durante el render (no en
  // un efecto): initializedRef solo deja que esto corra una vez, así que la
  // siguiente pasada de render ya sale con el estado inicial correcto, sin
  // un frame de más con el encuadre a medias.
  if (stageBox && nat && !initialized) {
    setInitialized(true);
    if (book.cover_crop) {
      const { s, tx, ty } = cropToState(stageBox, nat, book.cover_crop);
      setState(clampState(stageBox, nat, s, tx, ty));
      setActivePreset(null);
    } else {
      const { s, tx, ty } = PRESETS.fill(stageBox, nat);
      setState(clampState(stageBox, nat, s, tx, ty));
      setActivePreset('fill');
    }
  }

  const base = stageBox && nat ? baseScale(stageBox, nat) : 1;
  const fit = stageBox && nat ? fitScale(stageBox, nat) : 1;
  const zoomMin = Math.max(10, Math.floor((fit / base) * 100));
  const zoomPct = Math.round((state.s / base) * 100);

  function handlePointerDown(e) {
    if (!stageBox || !nat) return;
    dragRef.current = { px: e.clientX, py: e.clientY, tx: state.tx, ty: state.ty };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!dragRef.current || !stageBox || !nat) return;
    const tx = dragRef.current.tx + (e.clientX - dragRef.current.px);
    const ty = dragRef.current.ty + (e.clientY - dragRef.current.py);
    setState(clampState(stageBox, nat, state.s, tx, ty));
    setActivePreset(null);
  }
  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }
  function handleWheel(e) {
    e.preventDefault();
    if (!stageBox || !nat) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const nx = (cx - state.tx) / state.s;
    const ny = (cy - state.ty) / state.s;
    const s = Math.min(base * 3.2, Math.max(base, state.s * (e.deltaY > 0 ? 0.94 : 1.06)));
    setState(clampState(stageBox, nat, s, cx - nx * s, cy - ny * s));
    setActivePreset(null);
  }
  function handleZoomSlider(e) {
    if (!stageBox || !nat) return;
    const value = Number(e.target.value);
    const cx = stageBox.x + stageBox.w / 2;
    const cy = stageBox.y + stageBox.h / 2;
    const nx = (cx - state.tx) / state.s;
    const ny = (cy - state.ty) / state.s;
    const s = (base * value) / 100;
    setState(clampState(stageBox, nat, s, cx - nx * s, cy - ny * s));
    setActivePreset(null);
  }

  function handleSave() {
    if (!stageBox || !nat) return;
    setError(null);
    setSaved(false);
    const crop = stateToCrop(stageBox, nat, state.s, state.tx, state.ty);
    const formData = new FormData();
    formData.set('bookId', book.id);
    formData.set('crop', JSON.stringify(crop));
    if (hasTitle) formData.set('hasTitle', 'on');
    startSaving(async () => {
      const result = await updateCoverFrame(formData);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  const liveCrop = stageBox && nat ? stateToCrop(stageBox, nat, state.s, state.tx, state.ty) : book.cover_crop;
  const { progressMeta, unit, pips } = computeHeroProgress({ chapters, volumes, myProgress, percent: myProgress?.percent ?? 0 });

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--neutral-800)', padding: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 28 }}>
      <div style={{ flex: '1 1 400px', minWidth: 340, maxWidth: 520, background: 'var(--hero-cream)', borderRadius: 22, padding: 26 }}>
        <IconButton aria-label="Volver" onClick={() => router.push(`/club/${club.id}/preferencias`)}>
          <Icon name="arrow-left" size={16} />
        </IconButton>

        <div style={{ fontSize: 10.5, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--neutral-300)', fontWeight: 800, marginTop: 14 }}>
          Panel del club · portada
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text-primary)', marginTop: 7 }}>
          Encuadra la portada
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
          Arrastra la imagen y ajusta el zoom. El recuadro es lo que se ve en la app. La franja marcada arriba queda expuesta; lo que caiga en la zona gris de abajo lo tapa el chrome.
        </div>

        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          style={{
            position: 'relative', marginTop: 20, background: 'var(--surface-stage)', borderRadius: 14,
            overflow: 'hidden', height: 420, display: 'grid', placeItems: 'center',
            cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none',
          }}
        >
          {stageBox && nat && book.cover_url && (
            <>
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- superficie de arrastre/zoom en px reales; next/image no lo permite. */}
                <img
                  src={book.cover_url}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute', transformOrigin: '0 0', maxWidth: 'none', userSelect: 'none',
                    width: nat.w, transform: `translate(${state.tx}px, ${state.ty}px) scale(${state.s})`,
                  }}
                />
              </div>

              {/* oscurece todo menos el recorte */}
              <div
                style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', background: 'rgba(22,21,15,.6)',
                  WebkitMaskImage: 'linear-gradient(#000,#000), linear-gradient(#000,#000)',
                  maskImage: 'linear-gradient(#000,#000), linear-gradient(#000,#000)',
                  WebkitMaskPosition: `0 0, ${stageBox.x}px ${stageBox.y}px`,
                  maskPosition: `0 0, ${stageBox.x}px ${stageBox.y}px`,
                  WebkitMaskSize: `100% 100%, ${stageBox.w}px ${stageBox.h}px`,
                  maskSize: `100% 100%, ${stageBox.w}px ${stageBox.h}px`,
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                }}
              />

              {/* el recuadro: tercios, franja expuesta, zona ocluida */}
              <div
                style={{
                  position: 'absolute', left: stageBox.x, top: stageBox.y, width: stageBox.w, height: stageBox.h,
                  pointerEvents: 'none', boxShadow: '0 0 0 1.5px var(--hero-cream)', borderRadius: 2,
                }}
              >
                <div style={{ position: 'absolute', inset: 0, opacity: 0.42 }}>
                  <i style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'var(--hero-cream)' }} />
                  <i style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'var(--hero-cream)' }} />
                  <i style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'var(--hero-cream)' }} />
                  <i style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'var(--hero-cream)' }} />
                </div>
                <div
                  style={{
                    position: 'absolute', left: 0, right: 0, top: '12%', height: '42%',
                    borderTop: '1px dashed rgba(255,201,63,.85)', borderBottom: '1px dashed rgba(255,201,63,.85)',
                    background: 'rgba(255,201,63,.1)',
                  }}
                >
                  <span style={{ position: 'absolute', left: 8, top: 6, fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--gold-500)' }}>
                    Franja expuesta
                  </span>
                </div>
                <div
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%',
                    background: 'linear-gradient(180deg,transparent,rgba(22,21,15,.42))',
                    borderTop: '1px dashed rgba(255,248,236,.45)',
                  }}
                >
                  <span style={{ position: 'absolute', left: 8, bottom: 6, fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800, color: 'rgba(255,248,236,.72)' }}>
                    Lo tapa el chrome
                  </span>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute', left: 12, top: 12, background: 'rgba(22,21,15,.62)', backdropFilter: 'blur(10px)',
                  color: 'var(--hero-cream)', fontSize: 11.5, fontWeight: 600, padding: '6px 10px', borderRadius: 8, pointerEvents: 'none',
                }}
              >
                Arrastra para mover
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-tertiary)', width: 58, flexShrink: 0 }}>
            Zoom
          </span>
          <input
            type="range"
            min={zoomMin}
            max={320}
            value={Math.min(320, Math.max(zoomMin, zoomPct))}
            onChange={handleZoomSlider}
            style={{ flex: 1, accentColor: 'var(--accent-500)' }}
          />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', width: 52, textAlign: 'right', flexShrink: 0 }}>
            {zoomPct}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {PRESET_LIST.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              style={{
                border: `1px solid ${activePreset === p.key ? 'var(--text-primary)' : 'var(--border-panel)'}`,
                background: activePreset === p.key ? 'var(--text-primary)' : 'transparent',
                color: activePreset === p.key ? 'var(--hero-cream)' : 'var(--text-secondary)',
                borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              }}
            >
              <Icon name={p.icon} size={14} />
              {p.label}
            </button>
          ))}
        </div>

        <label
          style={{
            position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 18, padding: 14,
            borderRadius: 12, border: `1.5px solid ${hasTitle ? 'var(--success)' : 'var(--border-panel)'}`,
            background: hasTitle ? 'var(--success-bg)' : 'transparent', cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={hasTitle}
            onChange={(e) => setHasTitle(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          />
          <span
            style={{
              width: 40, height: 23, borderRadius: 999, background: hasTitle ? 'var(--success)' : 'var(--border-panel)',
              flexShrink: 0, position: 'relative', transition: 'background .16s', marginTop: 1,
            }}
          >
            <span
              style={{
                position: 'absolute', top: 3, left: 3, width: 17, height: 17, borderRadius: '50%',
                background: 'var(--hero-cream)', transition: 'transform .16s',
                transform: hasTitle ? 'translateX(17px)' : 'none',
              }}
            />
          </span>
          <span>
            <b style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', display: 'block', lineHeight: 1.35 }}>
              La tapa ya muestra el título
            </b>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 3, lineHeight: 1.45 }}>
              La app deja de escribirlo encima: en el héroe queda solo el autor y el progreso.
            </span>
          </span>
        </label>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10, marginTop: 16 }}>
            {error}
          </div>
        )}
        {saved && !error && (
          <div style={{ color: 'var(--success-700)', fontSize: 'var(--fs-xs)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', padding: 10, marginTop: 16 }}>
            Encuadre guardado.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving || !stageBox || !nat}>
            <Icon name="check" size={17} />
            {saving ? 'Guardando…' : 'Guardar encuadre'}
          </Button>
          <Button variant="secondary" size="lg" type="button" onClick={() => applyPreset('fill')}>
            Restablecer
          </Button>
        </div>
      </div>

      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,248,236,.55)', fontWeight: 800 }}>
          Vista previa en vivo
        </div>
        <CoverHero
          variant="preview"
          book={book}
          crop={liveCrop}
          hasTitle={hasTitle}
          clubs={clubs}
          activeClub={club}
          hasActivity
          progressMeta={progressMeta}
          unit={unit}
          percent={myProgress?.percent ?? 0}
          pips={pips}
        />
      </div>
    </div>
  );
}
