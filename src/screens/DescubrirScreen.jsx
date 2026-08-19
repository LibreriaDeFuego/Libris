'use client';

import { useState } from 'react';
import { Tabs } from '@/design-system/components/navigation/Tabs.jsx';
import { EditorialCard } from '@/design-system/components/content/EditorialCard.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';

// "Qué se está leyendo" vive en Novedades → Otros clubes: acá queda solo el
// contenido editorial, que es de lo que hablaba el brief original.
const TABS = ['Guías', 'Autores', 'Cursos'];
const CATEGORY_BY_TAB = { 'Guías': 'Guía', 'Autores': 'Autor', 'Cursos': 'Curso' };

function EmptyState({ children }) {
  return (
    <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
      {children}
    </div>
  );
}

export function DescubrirScreen({ items }) {
  const [tab, setTab] = useState('Guías');
  const [openItem, setOpenItem] = useState(null);

  const category = CATEGORY_BY_TAB[tab];
  const filtered = items.filter((item) => item.category === category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
        Descubrir
      </div>

      <Tabs items={TABS} active={tab} onChange={setTab} />

      {filtered.length === 0 ? (
        <EmptyState>Todavía no hay contenido en esta sección.</EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenItem(item)}
              style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
            >
              <EditorialCard
                category={item.category}
                title={item.title}
                subtitle={item.subtitle ?? ''}
                image={item.image_url ?? undefined}
              />
            </button>
          ))}
        </div>
      )}

      {openItem && (
        <Modal title={openItem.title} onClose={() => setOpenItem(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {openItem.subtitle && (
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{openItem.subtitle}</div>
            )}
            {openItem.body && (
              <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', lineHeight: 'var(--lh-relaxed)', whiteSpace: 'pre-wrap' }}>
                {openItem.body}
              </div>
            )}
            {openItem.link_url && (
              <a
                href={openItem.link_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-link)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}
              >
                Abrir enlace
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
