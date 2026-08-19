'use client';

import { useState } from 'react';
import { FilterPills } from '@/design-system/components/navigation/FilterPills.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

export function NovedadesScreen({ events, books }) {
  const [filter, setFilter] = useState('Mis clubes');
  const filtered = events.filter((e) => e.club === filter);
  const showBooks = filter === 'Otros clubes' && books.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Novedades</div>
      <FilterPills options={['Mis clubes', 'Otros clubes']} active={filter} onChange={setFilter} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((e) => (
          <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.color, flexShrink: 0 }}>
              <Icon name={e.icon} size={16} color={e.color} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 'var(--lh-snug)' }}>{e.title}</div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {formatRelativeTime(e.time)}{e.subtitle ? ` · ${e.subtitle}` : ''}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !showBooks && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>Sin novedades por ahora.</div>
        )}
      </div>

      {/* Qué leen los demás vive acá, junto al resto de la actividad de otros
          clubes, en vez de en una solapa aparte dentro de Descubrir. */}
      {showBooks && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
            Qué se está leyendo
          </div>
          {books.map((book) => (
            <div key={book.book_id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--shadow-sm)' }}>
              <div
                style={{
                  width: 38, height: 54, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: book.cover_url ? `center/cover no-repeat url(${book.cover_url})` : 'var(--accent-500)',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>{book.title}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{book.author}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 'var(--fs-2xs)', color: 'var(--success)', fontWeight: 600 }}>
                  <Icon name="users" size={12} color="var(--success)" />
                  {book.club_count} {Number(book.club_count) === 1 ? 'club' : 'clubes'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
