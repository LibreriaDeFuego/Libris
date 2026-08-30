'use client';

import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { ClubSwitcher } from '@/components/ClubSwitcher';

const CREAM = 'var(--hero-cream)';

// Mismo mecanismo visual que BookReviewCard (la tarjeta de "Reseña final"):
// panel de color sólido, texto arriba, y la portada flotando chica abajo con
// su proporción natural (sin recortar) — la sombra apilada en diagonal y el
// brillo son un calco literal de esa tarjeta, ver ese componente para el
// porqué de cada valor. Reemplaza al héroe viejo (foto a pantalla completa +
// portada encuadrada por el admin): al no recortar la portada, el editor de
// "Encuadrar portada" ya no tenía nada que mostrar acá, así que se sacó
// (ver README).
const REVIEW_SHADOW = [
  '-1px 3px 0 rgba(20,16,4,0.32)',
  '-5px 10px 4px rgba(20,16,4,0.29)',
  '-14px 22px 11px rgba(20,16,4,0.25)',
  '-27px 41px 20px rgba(20,16,4,0.2)',
  '-47px 66px 33px rgba(20,16,4,0.15)',
  '-71px 96px 47px rgba(20,16,4,0.1)',
].join(', ');

const REVIEW_LIGHT = 'linear-gradient(210deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)';

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

      {/* Kicker, título, autor. */}
      <div style={{ padding: '22px 20px 0' }}>
        <div style={{ fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: CREAM, opacity: 0.72, fontWeight: 800 }}>
          Leyendo ahora
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, lineHeight: 1.1, color: CREAM, marginTop: 10 }}>
          {book?.title}
        </div>
        {book?.author && (
          <div style={{ fontSize: 14, color: CREAM, opacity: 0.72, marginTop: 6 }}>{book.author}</div>
        )}
        {unit && (
          <div style={{ fontSize: 12.5, color: CREAM, opacity: 0.55, marginTop: 2 }}>{unit}</div>
        )}
      </div>

      {/* La portada, flotando con su proporción natural — sin recortar. */}
      <div style={{ marginTop: 14, padding: '0 20px 40px', display: 'flex', justifyContent: 'center' }}>
        {book?.cover_url ? (
          <div style={{ position: 'relative', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- proporción propia que solo se conoce en el navegador (max-width/max-height, no un tamaño fijo). */}
            <img
              src={book.cover_url}
              alt=""
              style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: 170, maxHeight: 230, borderRadius: '0 4px 4px 0', boxShadow: REVIEW_SHADOW }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '0 4px 4px 0', mixBlendMode: 'soft-light', pointerEvents: 'none', background: REVIEW_LIGHT }} />
          </div>
        ) : (
          <div style={{ width: 150, height: 210, borderRadius: '0 4px 4px 0', background: CREAM, opacity: 0.35 }} />
        )}
      </div>

      {/* Progreso. */}
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: CREAM }}>
            {percent}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 12, color: CREAM, opacity: 0.7 }}>{progressMeta}</div>
            {onPrimaryClick && (
              <IconButton aria-label="Actualizar progreso" onClick={onPrimaryClick} tone="glass" size={24}>
                <Icon name="pencil" size={11} />
              </IconButton>
            )}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
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
    </div>
  );
}
