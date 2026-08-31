'use client';

import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { ClubSwitcher } from '@/components/ClubSwitcher';

const CREAM = 'var(--hero-cream)';

// Panel de color sólido (mismo mecanismo que BookReviewCard, la tarjeta de
// "Reseña final"), con la portada flotando chica, sin recortar, y la
// sombra apilada en diagonal — ver ese componente para el porqué de cada
// valor. Portada, título/autor y % van en una sola fila (con la barra de
// progreso debajo, ancho completo) en vez de apilados uno arriba del otro
// — eso es lo que dejaba al héroe entero a la mitad de alto que antes
// (~525px → ~225px): se probaron mockups con la portada al lado del texto,
// en la esquina superpuesta, y en una fila más chica; esta es una mezcla
// de esas dos últimas (la fila, con el tamaño de la de al lado) y fue la
// elegida. El chrome de arriba (volver, selector de club, íconos de
// acciones) no cambió de tamaño — sigue siendo el mismo componente en las
// dos pantallas que usan el héroe.
const HERO_SHADOW = [
  '-1px 2px 0 rgba(20,16,4,0.32)',
  '-4px 6px 3px rgba(20,16,4,0.27)',
  '-9px 13px 6px rgba(20,16,4,0.2)',
  '-16px 24px 12px rgba(20,16,4,0.13)',
].join(', ');

const HERO_LIGHT = 'linear-gradient(210deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)';

export function CoverHero({
  book,
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
}) {
  const authorAndUnit = [book?.author, unit].filter(Boolean).join(' · ');

  return (
    <div style={{ background: 'var(--accent-500)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      {/* Chrome superior. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 0', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {onBack && (
            <IconButton aria-label="Volver a mis clubes" onClick={onBack} tone="glass" size={34}>
              <Icon name="arrow-left" size={15} />
            </IconButton>
          )}
          {clubs && activeClub && <ClubSwitcher clubs={clubs} activeClub={activeClub} tone="chip" hasActivity={hasActivity} />}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{headerRight}</div>
      </div>

      {/* Portada + título/autor + % en una sola fila. */}
      <div style={{ padding: '18px 18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {book?.cover_url ? (
          <div style={{ position: 'relative', lineHeight: 0, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- proporción propia que solo se conoce en el navegador (max-width/max-height, no un tamaño fijo). */}
            <img
              src={book.cover_url}
              alt=""
              style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: 68, maxHeight: 92, borderRadius: '0 3px 3px 0', boxShadow: HERO_SHADOW }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '0 3px 3px 0', mixBlendMode: 'soft-light', pointerEvents: 'none', background: HERO_LIGHT }} />
          </div>
        ) : (
          <div style={{ width: 68, height: 92, borderRadius: '0 3px 3px 0', background: CREAM, opacity: 0.35, flexShrink: 0 }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, letterSpacing: '.11em', textTransform: 'uppercase', color: CREAM, opacity: 0.72, fontWeight: 800 }}>
            Leyendo ahora
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, lineHeight: 1.2, color: CREAM, marginTop: 5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {book?.title}
          </div>
          {authorAndUnit && (
            <div style={{ fontSize: 12, color: CREAM, opacity: 0.72, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {authorAndUnit}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: CREAM }}>
            {percent}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ fontSize: 11, color: CREAM, opacity: 0.7 }}>{progressMeta}</div>
            {onPrimaryClick && (
              <IconButton aria-label="Actualizar progreso" onClick={onPrimaryClick} tone="glass" size={20}>
                <Icon name="pencil" size={9} />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progreso, ancho completo. */}
      <div style={{ padding: '0 18px 18px' }}>
        {pips?.type === 'pips' ? (
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: pips.total }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: i <= pips.nowIndex ? CREAM : 'rgba(255,248,236,.22)',
                  opacity: i === pips.nowIndex ? 0.6 : 1,
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,248,236,.22)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pips?.percent ?? percent}%`, borderRadius: 3, background: CREAM }} />
          </div>
        )}
      </div>
    </div>
  );
}
