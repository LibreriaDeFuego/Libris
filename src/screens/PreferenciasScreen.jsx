'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateClubPreferences, leaveClub, promoteAdmin, demoteAdmin, respondToJoinRequest } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { CoverUploader } from '@/components/CoverUploader';
import { VisibilityPicker } from '@/components/VisibilityOption';

const initialState = { error: null };

function Section({ title, description, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 'var(--lh-snug)' }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// Link o lugar físico — dos formas de decir "dónde", cada una con su propio
// campo debajo (ver PreferenciasScreen). Mismo patrón visual que los chips
// de otras partes de la app, pero con radio nativo (así viaja en el
// FormData del form como cualquier otro campo, sin JS extra al enviar).
function MeetingModeOption({ value, current, onChange, icon, label }) {
  const selected = current === value;
  return (
    <label
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
        padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)', fontWeight: 600,
        background: selected ? 'var(--accent-50)' : 'var(--surface-card)',
        border: `1px solid ${selected ? 'var(--accent-500)' : 'var(--border-default)'}`,
        color: selected ? 'var(--accent-600)' : 'var(--text-secondary)',
      }}
    >
      <input type="radio" name="meetingMode" value={value} checked={selected} onChange={() => onChange(value)} style={{ display: 'none' }} />
      <Icon name={icon} size={14} />
      {label}
    </label>
  );
}

// Una fila por miembro: nombre, insignia de "Administrador" si aplica, y —
// solo si quien mira la pantalla es administrador — un botón para nombrar o
// sacar administradores. Nunca se puede sacar el propio rol si eres el único
// administrador que queda (lo impide el servidor con un mensaje claro).
function MemberRow({ member, canManage, adminCount, currentUserId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const name = member.profiles?.display_name ?? 'Alguien';
  const isAdminRow = member.role === 'admin';
  const isSelf = member.profile_id === currentUserId;
  const blockedByLimit = !isAdminRow && adminCount >= 3;

  function toggle() {
    const formData = new FormData();
    formData.set('clubId', member.clubId);
    formData.set('profileId', member.profile_id);
    setError(null);
    startTransition(async () => {
      const action = isAdminRow ? demoteAdmin : promoteAdmin;
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href={`/perfil/${member.profile_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <Avatar name={name} src={member.profiles?.avatar_url} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {name} {isSelf && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(tú)</span>}
            </div>
            {isAdminRow && (
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent-600)', fontWeight: 600 }}>Administrador</div>
            )}
          </div>
        </Link>
        {canManage && (
          <Button variant="secondary" size="sm" type="button" onClick={toggle} disabled={pending || blockedByLimit}>
            {pending ? '...' : isAdminRow ? 'Sacar admin' : 'Hacer admin'}
          </Button>
        )}
      </div>
      {blockedByLimit && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Ya hay 3 administradores — saca a uno antes de agregar otro.</div>
      )}
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const JOIN_MODE_TO_VISIBILITY = { open: 'publico', request: 'solicitud', invite: 'privado' };

// Una solicitud pendiente: quién la mandó, su mensaje si escribió uno, y
// los botones para aprobar o rechazar.
function JoinRequestRow({ request }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [resolved, setResolved] = useState(null); // 'approve' | 'reject' | null
  const name = request.profiles?.display_name ?? 'Alguien';

  function respond(decision) {
    const formData = new FormData();
    formData.set('requestId', request.id);
    formData.set('decision', decision);
    setError(null);
    startTransition(async () => {
      const result = await respondToJoinRequest(formData);
      if (result?.error) setError(result.error);
      else setResolved(decision);
    });
  }

  if (resolved) {
    return (
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: '4px 0' }}>
        {resolved === 'approve' ? `Sumaste a ${name} al club.` : `Rechazaste la solicitud de ${name}.`}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={name} size={32} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
      </div>
      {request.message && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)', fontStyle: 'italic' }}>
          “{request.message}”
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={() => respond('reject')} disabled={pending}>Rechazar</Button>
        <Button variant="primary" size="sm" type="button" onClick={() => respond('approve')} disabled={pending}>Aceptar</Button>
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export function PreferenciasScreen({ club, book, isAdmin, currentUserId, members, pendingRequests = [] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateClubPreferences, initialState);
  const [visibility, setVisibility] = useState(JOIN_MODE_TO_VISIBILITY[club.join_mode] ?? (club.is_private ? 'privado' : 'publico'));
  const [meetingMode, setMeetingMode] = useState(club.meeting_mode ?? 'link');
  const [bookCoverHasTitle, setBookCoverHasTitle] = useState(book?.cover_has_title ?? true);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [leavePending, startLeave] = useTransition();

  const memberCount = members.length;
  const adminCount = members.filter((m) => m.role === 'admin').length;

  function handleLeave() {
    const formData = new FormData();
    formData.set('clubId', club.id);
    setLeaveError(null);
    startLeave(async () => {
      const result = await leaveClub(formData);
      if (result?.error) setLeaveError(result.error);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.push('/')}>
          <Icon name="arrow-left" size={18} />
        </IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Preferencias
        </div>
      </div>

      {isAdmin ? (
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <input type="hidden" name="clubId" value={club.id} />
          {book && <input type="hidden" name="bookId" value={book.id} />}

          <Section title="El club">
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Nombre</div>
              <Input name="clubName" defaultValue={club.name} required />
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
              {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
            </div>
          </Section>

          <Section
            title="Quién ve este club"
            description="Otros clubes que leen el mismo libro ven que hay un club leyéndolo. Esto decide si además ven cómo se llama."
          >
            <VisibilityPicker current={visibility} onChange={setVisibility} />
          </Section>

          <Section title="Próxima reunión" description="Opcional. Si la completas, el club la ve arriba de todo en la pantalla del club.">
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Fecha y hora</div>
              <Input type="datetime-local" name="meetingAt" defaultValue={club.meeting_at ? club.meeting_at.slice(0, 16) : ''} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <MeetingModeOption value="link" current={meetingMode} onChange={setMeetingMode} icon="video" label="Link (Zoom, Meet…)" />
              <MeetingModeOption value="lugar" current={meetingMode} onChange={setMeetingMode} icon="map-pin" label="Lugar físico" />
            </div>

            {meetingMode === 'lugar' ? (
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Dirección o nombre del lugar</div>
                <Input name="meetingPlace" placeholder="Café Martínez, San Martín 450" defaultValue={club.meeting_place ?? ''} />
                <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 'var(--lh-snug)' }}>
                  Con esto se arma un link a Google Maps solo — no hace falta pegar uno vos mismo.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Link de la reunión</div>
                <Input type="url" name="meetingLink" placeholder="https://meet.google.com/…" defaultValue={club.meeting_link ?? ''} />
              </div>
            )}
          </Section>

          {book && (
            <Section title="El libro en curso">
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Título</div>
                <Input name="bookTitle" defaultValue={book.title} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Autor</div>
                <Input name="bookAuthor" defaultValue={book.author} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44, height: 62, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: book.cover_url ? `center/cover no-repeat url(${book.cover_url})` : 'var(--accent-500)',
                  }}
                />
                <CoverUploader bookId={book.id} hasCover={Boolean(book.cover_url)} tone="light" />
              </div>

              <label
                style={{
                  position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14,
                  borderRadius: 'var(--radius-md)', border: `1.5px solid ${bookCoverHasTitle ? 'var(--success)' : 'var(--border-default)'}`,
                  background: bookCoverHasTitle ? 'var(--success-bg)' : 'transparent', cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="bookCoverHasTitle"
                  checked={bookCoverHasTitle}
                  onChange={(e) => setBookCoverHasTitle(e.target.checked)}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
                <span
                  style={{
                    width: 40, height: 23, borderRadius: 999, background: bookCoverHasTitle ? 'var(--success)' : 'var(--border-default)',
                    flexShrink: 0, position: 'relative', transition: 'background .16s', marginTop: 1,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', top: 3, left: 3, width: 17, height: 17, borderRadius: '50%',
                      background: 'var(--hero-cream)', transition: 'transform .16s',
                      transform: bookCoverHasTitle ? 'translateX(17px)' : 'none',
                    }}
                  />
                </span>
                <span>
                  <b style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-primary)', display: 'block', lineHeight: 1.35 }}>
                    La portada ya trae el título
                  </b>
                  <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-secondary)', display: 'block', marginTop: 3, lineHeight: 1.45 }}>
                    Evita repetirlo al armar una cita para compartir con esa portada de fondo.
                  </span>
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/club/${club.id}/capitulos`}>
                  <Button variant="secondary" size="md" type="button">
                    <Icon name="list" size={15} />
                    Gestionar capítulos
                  </Button>
                </Link>
              </div>
            </Section>
          )}

          {state?.error && (
            <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              {state.error}
            </div>
          )}
          {state?.saved && !state?.error && (
            <div style={{ color: 'var(--success)', fontSize: 'var(--fs-xs)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              Cambios guardados.
            </div>
          )}

          <Button variant="primary" size="lg" type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      ) : (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
          Solo los administradores de <strong>{club.name}</strong> pueden cambiar el nombre, la visibilidad, el libro en curso y los capítulos.
        </div>
      )}

      {isAdmin && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section
            title={`Solicitudes pendientes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`}
            description="Gente que pidió sumarse a este club porque lo pusiste en modo 'Con solicitud'."
          >
            {pendingRequests.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '4px 0' }}>
                No hay solicitudes esperando respuesta.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingRequests.map((request) => (
                  <JoinRequestRow key={request.id} request={request} />
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Section
          title="Administradores"
          description={`Hasta 3 por club, todos con las mismas facultades: editar el club, los capítulos y nombrar a otros administradores. ${adminCount}/3 en uso.`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {members.map((member) => (
              <MemberRow
                key={member.profile_id}
                member={{ ...member, clubId: club.id }}
                canManage={isAdmin}
                adminCount={adminCount}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </Section>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Salir del club
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)' }}>
          Dejas de ver el club y su actividad. Tus comentarios y tu progreso quedan guardados por si vuelves a entrar con el link de invitación.
        </div>
        {confirmLeave ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaveError && (
              <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                {leaveError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="md" onClick={() => setConfirmLeave(false)} type="button">Cancelar</Button>
              <Button variant="primary" size="md" onClick={handleLeave} disabled={leavePending} type="button">
                {leavePending ? 'Saliendo…' : 'Sí, salir del club'}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="secondary" size="md" onClick={() => setConfirmLeave(true)} type="button">
              <Icon name="log-out" size={15} />
              Salir de {club.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
