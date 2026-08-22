'use client';

import { useState, useTransition, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { followProfile, unfollowProfile, updateProfile } from '@/app/actions/profile';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { AvatarUploader } from '@/components/AvatarUploader';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

const initialState = { error: null };

// Seguir / Siguiendo, con el toggle de verdad (followProfile/unfollowProfile).
function FollowButton({ profileId, initialFollowing }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function toggle() {
    const formData = new FormData();
    formData.set('profileId', profileId);
    setError(null);
    const action = following ? unfollowProfile : followProfile;
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
      else setFollowing((f) => !f);
    });
  }

  return (
    <div>
      <Button variant={following ? 'secondary' : 'primary'} size="md" onClick={toggle} disabled={pending} type="button">
        {pending ? '…' : following ? 'Siguiendo' : 'Seguir'}
      </Button>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// El formulario del propio perfil: nombre, bio y foto. Se abre/cierra desde
// el lápiz de arriba (PerfilScreen controla el estado "editing").
function EditProfileFields({ profile, onClose }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <AvatarUploader hasAvatar={!!profile.avatar_url} />
      <Input name="displayName" defaultValue={profile.display_name} placeholder="Tu nombre" required />
      <Textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Una frase corta sobre vos (opcional)" rows={2} />
      {state?.error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
          {state.error}
        </div>
      )}
      {state?.saved && <div style={{ color: 'var(--success-700)', fontSize: 'var(--fs-2xs)' }}>Guardado.</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cerrar</Button>
        <Button variant="primary" size="sm" type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

// Una tarjeta de actividad: la portada del libro grande, con lo que esa
// persona comentó anclado abajo. Tocarla despliega el comentario completo.
function ActivityCard({ activity, canOpenClub }) {
  const [expanded, setExpanded] = useState(false);
  const isQuote = activity.kind === 'quote';
  const text = activity.kind === 'voice'
    ? (activity.voice_transcript ?? 'Publicó una nota de voz.')
    : activity.body;

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        position: 'relative', height: 380, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)', cursor: 'pointer', flexShrink: 0,
        background: activity.book_cover_url ? `center/cover no-repeat url(${activity.book_cover_url})` : 'var(--accent-500)',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 42%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.9) 100%)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px 20px', color: '#fff' }}>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 8 }}>
          {activity.club_name} · {formatRelativeTime(activity.created_at)}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
          {activity.book_title}
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.68)', marginTop: 3 }}>
          {activity.book_author}
        </div>
        {text && (
          <div
            style={{
              fontSize: 'var(--fs-sm)', marginTop: 12, lineHeight: 'var(--lh-snug)',
              color: isQuote ? 'var(--gold-300)' : 'rgba(255,255,255,0.95)',
              fontStyle: isQuote ? 'italic' : 'normal',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            “{text}”
          </div>
        )}
        {expanded && canOpenClub && (
          <Link
            href={`/club/${activity.club_id}/comentarios`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--gold-300)' }}
          >
            Ver el resto de los comentarios en el club
            <Icon name="arrow-right" size={12} color="var(--gold-300)" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function PerfilScreen({ profile, isOwn, isFollowing, stats, activity, myClubIds }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOwn ? (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Perfil
          </div>
        ) : (
          <IconButton aria-label="Volver" onClick={() => router.back()}>
            <Icon name="arrow-left" size={18} />
          </IconButton>
        )}
        {isOwn && (
          <IconButton aria-label="Editar perfil" onClick={() => setEditing((e) => !e)}>
            <Icon name="pencil" size={16} />
          </IconButton>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Avatar name={profile.display_name} src={profile.avatar_url} size={78} />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.book_count}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>Libros</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.follower_count}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>Seguidores</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.following_count}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>Siguiendo</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {profile.display_name}
          </div>
          {profile.bio && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 'var(--lh-snug)' }}>
              {profile.bio}
            </div>
          )}
        </div>

        {isOwn && editing && (
          <div style={{ marginTop: 14 }}>
            <EditProfileFields profile={profile} onClose={() => setEditing(false)} />
          </div>
        )}
        {!isOwn && (
          <div style={{ marginTop: 14 }}>
            <FollowButton profileId={profile.id} initialFollowing={isFollowing} />
          </div>
        )}
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
          Actividad
        </div>
        {activity.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
            {isOwn ? 'Todavía no comentaste nada.' : 'Todavía no comentó nada que puedas ver.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activity.map((item) => (
              <ActivityCard key={item.id} activity={item} canOpenClub={myClubIds.has(item.club_id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
