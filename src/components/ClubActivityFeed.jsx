import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';

// Tarjetas agregadas de lo último que pasó en el club — comentarios
// recientes agrupados por capítulo y reseñas finales, más recientes
// primero. Ver src/lib/clubActivity.js para cómo se arma esta lista.
export function ClubActivityFeed({ clubId, activity }) {
  if (!activity || activity.length === 0) return null;

  return (
    <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
        Actividad del club
      </div>
      {activity.map((item) => (
        <Link
          key={item.key}
          href={item.chapterId ? `/club/${clubId}/comentarios?capitulo=${item.chapterId}` : `/club/${clubId}/comentarios`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)',
            borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {item.authors.map((author, i) => (
              <div key={author.name + i} style={{ marginLeft: i === 0 ? 0 : -8, border: '2px solid var(--surface-card)', borderRadius: 'var(--radius-round)', lineHeight: 0 }}>
                <Avatar name={author.name} src={author.avatarUrl} size={30} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', lineHeight: 'var(--lh-snug)' }}>{item.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.relativeTime}</div>
          </div>
          <Icon name="chevron-right" size={16} color="var(--text-tertiary)" />
        </Link>
      ))}
    </div>
  );
}
