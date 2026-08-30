import { Avatar } from '@/design-system/components/core/Avatar.jsx';

const STACK_LIMIT = 5;

// "Quiénes están leyendo": la pila de avatares de los miembros del club, y
// cuántos van exactamente por el mismo capítulo que tú (si ya registraste
// alguno). Todos los miembros pueden verse entre sí — mismo alcance que ya
// tiene "Comentarios del club" o la lista de Preferencias, nada nuevo.
export function MemberProgressStrip({ members, currentUserId, myChapterId }) {
  if (!members || members.length <= 1) return null;

  const shown = members.slice(0, STACK_LIMIT);
  const extra = members.length - shown.length;
  const sameChapterCount = myChapterId
    ? members.filter((m) => m.profileId !== currentUserId && m.chapterId === myChapterId).length
    : 0;

  return (
    <div style={{ padding: '18px 18px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Quiénes están leyendo
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {shown.map((m, i) => (
            <div
              key={m.profileId}
              style={{ marginLeft: i === 0 ? 0 : -10, border: '2.5px solid var(--surface-page)', borderRadius: 'var(--radius-round)', lineHeight: 0 }}
            >
              <Avatar name={m.displayName} src={m.avatarUrl} size={36} />
            </div>
          ))}
          {extra > 0 && (
            <div
              style={{
                marginLeft: -10, width: 36, height: 36, borderRadius: 'var(--radius-round)', border: '2.5px solid var(--surface-page)',
                background: 'var(--neutral-200)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}
            >
              +{extra}
            </div>
          )}
        </div>
        {sameChapterCount > 0 && (
          <div style={{ marginLeft: 10, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
            {sameChapterCount === 1 ? '1 va' : `${sameChapterCount} van`} por el mismo capítulo que tú
          </div>
        )}
      </div>
    </div>
  );
}
