'use client';

import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { ClubSwitcher } from '@/components/ClubSwitcher';
import { CoverImage } from '@/components/CoverImage';

const CREAM = 'var(--hero-cream)';

// Un solo componente escribe el héroe de portada: lo usan tanto la pantalla
// real del club como la vista previa en vivo del editor de encuadre — así
// nunca puede pasar que uno muestre datos distintos del otro (ver
// "Trampas" del handoff de diseño).
//
// variant='screen': llena el alto disponible dentro de AppShell (la tab
//   bar real va aparte, como sibling). variant='preview': marco de
//   teléfono fijo (390×844) para el panel del editor de encuadre.
export function CoverHero({
  variant = 'screen',
  book,
  crop,
  hasTitle,
  clubs,
  activeClub,
  hasActivity = false,
  onBack,
  headerRight,
  progressMeta,
  unit,
  percent = 0,
  pips,
  onPrimaryClick,
  primaryLabel = 'Actualizar progreso',
  primaryDisabled = false,
  commentsHref,
}) {
  const isPreview = variant === 'preview';

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--hero-bg)',
        fontFamily: 'var(--font-body)',
        ...(isPreview
          ? { width: 390, height: 844, borderRadius: 38, boxShadow: '0 30px 70px rgba(0,0,0,.5)', flexShrink: 0 }
          : { minHeight: 'calc(100dvh - 70px)' }),
      }}
    >
      {/* Relleno de fondo: siempre detrás de la portada, para que nunca se vea negro plano si la imagen no cubre el marco. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg, var(--accent-700) 0%, #7A1D0E 55%, #3A0E06 100%)' }} />
      {book?.cover_url && (
        <div style={{ position: 'absolute', inset: -40, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- fondo difuminado decorativo, no necesita optimización de next/image */}
          <img
            src={book.cover_url}
            alt=""
            style={{ position: 'absolute', inset: -40, width: 'calc(100% + 80px)', height: 'calc(100% + 80px)', objectFit: 'cover', filter: 'blur(26px) saturate(1.25)', opacity: 0.9 }}
          />
        </div>
      )}

      {/* La portada, encuadrada según cover_crop (o "Llenar" por defecto). */}
      <CoverImage src={book?.cover_url} crop={crop} alt={book?.title ?? ''} />

      {/* Velos: banda superior con blur (bajo el chip), degradé superior, y el scrim que hace legible el texto de abajo. */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 150, zIndex: 2,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          WebkitMaskImage: 'linear-gradient(180deg,#000 0%,#000 42%,transparent 100%)',
          maskImage: 'linear-gradient(180deg,#000 0%,#000 42%,transparent 100%)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 170, zIndex: 3, background: 'linear-gradient(180deg, rgba(22,21,15,.5) 0%, rgba(22,21,15,.22) 60%, transparent)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'linear-gradient(180deg, rgba(22,21,15,0) 0%, rgba(22,21,15,0) 34%, rgba(22,21,15,.9) 62%, var(--hero-bg) 78%)' }} />

      {/* Chrome superior. */}
      <div style={{ position: 'relative', zIndex: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '50px 18px 0', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {onBack && (
            <IconButton aria-label="Volver a mis clubes" onClick={onBack} tone="glass" size={36}>
              <Icon name="arrow-left" size={16} />
            </IconButton>
          )}
          {clubs && activeClub && <ClubSwitcher clubs={clubs} activeClub={activeClub} tone="chip" hasActivity={hasActivity} />}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{headerRight}</div>
      </div>

      {/* Bloque de contenido: título/kicker, autor, progreso, acciones. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: isPreview ? 80 : 0, zIndex: 5, padding: '0 22px 22px' }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,248,236,.32)', margin: '0 auto 18px' }} />
        <div
          style={{
            fontSize: hasTitle ? 12 : 10.5,
            letterSpacing: hasTitle ? '.1em' : '.13em',
            textTransform: 'uppercase',
            color: 'var(--gold-500)',
            fontWeight: 800,
          }}
        >
          Leyendo ahora
        </div>

        {!hasTitle && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1.02, letterSpacing: '-.025em', color: CREAM, fontWeight: 800, marginTop: 9 }}>
            {book?.title}
          </div>
        )}

        {hasTitle ? (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, letterSpacing: '-.01em', color: CREAM, marginTop: 10 }}>
              {book?.author}
            </div>
            {unit && <div style={{ color: 'rgba(255,248,236,.62)', fontSize: 13.5, marginTop: 2 }}>{unit}</div>}
          </>
        ) : (
          <div style={{ color: 'rgba(255,248,236,.62)', fontSize: 13.5, marginTop: 7 }}>
            {book?.author}{unit && <> · {unit}</>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 0.9, color: CREAM }}>
            {percent}%
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,248,236,.58)' }}>{progressMeta}</div>
        </div>

        <div style={{ marginTop: 13 }}>
          {pips?.type === 'pips' ? (
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: pips.total }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= pips.nowIndex ? 'var(--accent-400)' : 'rgba(255,248,236,.16)',
                    opacity: i === pips.nowIndex ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,248,236,.16)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pips?.percent ?? percent}%`, borderRadius: 2, background: 'var(--accent-400)' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
            style={{
              flex: 1, height: 52, borderRadius: 16, border: 0, background: 'var(--accent-500)', color: CREAM,
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
              boxShadow: '0 10px 26px rgba(255,79,50,.36)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              cursor: primaryDisabled ? 'default' : 'pointer', opacity: primaryDisabled ? 0.6 : 1,
            }}
          >
            <Icon name="book-open" size={17} color={CREAM} />
            {primaryLabel}
          </button>
          {commentsHref && (
            <Link
              href={commentsHref}
              style={{
                flex: '0 0 52px', height: 52, borderRadius: 16, background: 'rgba(255,248,236,.10)',
                border: '1px solid rgba(255,248,236,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="message-circle" size={19} color={CREAM} />
            </Link>
          )}
        </div>
      </div>

      {isPreview && (
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, zIndex: 6,
            background: 'rgba(255,248,236,.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'flex-start', paddingTop: 11,
          }}
        >
          {[{ icon: 'book-open', label: 'Club', on: true }, { icon: 'compass', label: 'Recursos' }].map((tab) => (
            <div key={tab.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: tab.on ? 'var(--accent-500)' : 'var(--text-tertiary)' }}>
              <Icon name={tab.icon} size={21} color={tab.on ? 'var(--accent-500)' : 'var(--text-tertiary)'} />
              {tab.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
