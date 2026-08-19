'use client';

import { useState } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

const CATEGORY_COLOR = { 'Guía': 'var(--gold-700)', 'Curso': 'var(--success)' };

export function NovedadesScreen({ items }) {
  const [openItem, setOpenItem] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Novedades
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Guías, recomendaciones y cursos, a medida que se publican.
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Todavía no hay novedades publicadas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenItem(item)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left',
                background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase',
                  color: CATEGORY_COLOR[item.category] ?? 'var(--gold-700)',
                }}
              >
                {item.category} · {formatRelativeTime(item.published_at)}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {item.title}
              </div>
              {item.subtitle && (
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{item.subtitle}</div>
              )}
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
