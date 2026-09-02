'use client';

import Link from 'next/link';
import { ActivityCard } from '@/components/ActivityCard';
import { NotificationsButton } from '@/components/NotificationsButton';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// El feed general: citas destacadas y fotos de lo que está leyendo
// cualquier persona en Libris, más recientes primero. Por ahora solo esos
// dos tipos — se van a ir sumando otros (comentarios, notas de voz, empezar
// un libro nuevo) más adelante, extendiendo recent_activity.
export function InicioScreen({ activity, myClubIds, myProfileId, notifications, hasUnread }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block' }} />
        <NotificationsButton notifications={notifications} hasUnread={hasUnread} />
      </div>

      {/* No es un campo de texto de verdad — es un link a /descubrir (la
          búsqueda de clubes y personas ya existía, solo no tenía puerta de
          entrada desde que perdió su pestaña propia — ver README). Se ve
          como el Input de siempre para que se entienda de un vistazo qué
          hace, aunque tocarla lleve a otra pantalla en vez de tipear ahí
          mismo. */}
      <Link
        href="/descubrir"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)', background: 'var(--surface-card)', textDecoration: 'none',
        }}
      >
        <Icon name="search" size={16} color="var(--text-tertiary)" />
        <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
          Buscar clubes o personas
        </span>
      </Link>

      {activity.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Todavía no hay nada para mostrar acá.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-subtle)' }}>
          {activity.map((item) => (
            <ActivityCard
              key={item.id}
              activity={item}
              canOpenClub={myClubIds.has(item.club_id)}
              personName={item.display_name}
              author={{ id: item.profile_id, display_name: item.display_name, avatar_url: item.avatar_url }}
              isOwn={item.profile_id === myProfileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
