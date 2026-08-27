'use client';

import { ActivityCard } from '@/components/ActivityCard';

// El feed general: citas destacadas y fotos de lo que está leyendo
// cualquier persona en Libris, más recientes primero. Por ahora solo esos
// dos tipos — se van a ir sumando otros (comentarios, notas de voz, empezar
// un libro nuevo) más adelante, extendiendo recent_activity.
export function InicioScreen({ activity, myClubIds, myProfileId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block' }} />
      </div>

      {activity.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Todavía no hay nada para mostrar acá.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
