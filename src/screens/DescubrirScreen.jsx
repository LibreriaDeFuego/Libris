'use client';

import { useState } from 'react';
import { Tabs } from '@/design-system/components/navigation/Tabs.jsx';
import { EditorialCard } from '@/design-system/components/content/EditorialCard.jsx';

// TODO: reemplazar por contenido editorial real (guías, autores, cursos).
const ITEMS = {
  'Guías': [
    { title: 'Cómo armar un club de lectura', subtitle: '8 pasos para empezar bien' },
    { title: 'Manejar spoilers sin pelear', subtitle: 'Reglas simples para el grupo' },
  ],
  'Autores': [
    { title: 'Julio Cortázar', subtitle: 'Modera el club "Rayuela en voz alta"' },
    { title: 'Samanta Schweblin', subtitle: 'Lee junto a 3 clubes esta temporada' },
  ],
  'Cursos': [
    { title: 'Taller de lectura crítica', subtitle: '4 semanas · con certificado' },
    { title: 'Cómo escribir reseñas', subtitle: 'Curso corto · 3 clases' },
  ],
};

const CATEGORY_BY_TAB = { 'Guías': 'Guía', 'Autores': 'Autor', 'Cursos': 'Curso' };

export function DescubrirScreen() {
  const [tab, setTab] = useState('Guías');
  const category = CATEGORY_BY_TAB[tab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Descubrir</div>
      <Tabs items={['Guías', 'Autores', 'Cursos']} active={tab} onChange={setTab} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ITEMS[tab].map((it, i) => (
          <EditorialCard key={i} category={category} title={it.title} subtitle={it.subtitle} />
        ))}
      </div>
    </div>
  );
}
