'use client';

import { useState } from 'react';
import { FilterPills } from '@/design-system/components/navigation/FilterPills.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// TODO: reemplazar por el feed real de actividad del usuario/sus clubes.
const EVENTS = [
  { icon: 'check-circle-2', color: 'var(--success)', title: 'Letras en Vela terminó "Los detectives salvajes"', time: 'hoy', club: 'Mis clubes' },
  { icon: 'message-circle', color: 'var(--accent-500)', title: 'Martina comentó en Rayuela', time: 'hace 2 h', club: 'Mis clubes' },
  { icon: 'users', color: 'var(--gold-500)', title: 'Café y Páginas también empezó Rayuela', time: 'hace 5 h', club: 'Otros clubes' },
  { icon: 'sparkles', color: 'var(--gold-500)', title: 'Nueva guía: "Cómo armar un club de lectura"', time: 'ayer', club: 'Otros clubes' },
  { icon: 'book-open', color: 'var(--accent-500)', title: 'Julián actualizó su progreso a Cap. 13', time: 'ayer', club: 'Mis clubes' },
];

export function NovedadesScreen() {
  const [filter, setFilter] = useState('Mis clubes');
  const filtered = EVENTS.filter((e) => e.club === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Novedades</div>
      <FilterPills options={['Mis clubes', 'Otros clubes']} active={filter} onChange={setFilter} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.color, flexShrink: 0 }}>
              <Icon name={e.icon} size={16} color={e.color} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 'var(--lh-snug)' }}>{e.title}</div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{e.time}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>Sin novedades por ahora.</div>
        )}
      </div>
    </div>
  );
}
