'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { followProfile, unfollowProfile, updateProfile } from '@/app/actions/profile';
import { signOut } from '@/app/login/actions';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { AvatarUploader } from '@/components/AvatarUploader';
import { PostComposer } from '@/components/PostComposer';
import { UsernameField } from '@/components/UsernameField';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

const initialState = { error: null };

// Seguir, con el toggle de verdad (followProfile/unfollowProfile). Dejar de
// seguir no pasa con un solo toque — abre un menú desde abajo a confirmar,
// para que no se le escape a nadie sin querer.
function FollowButton({ profileId, initialFollowing }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function follow() {
    const formData = new FormData();
    formData.set('profileId', profileId);
    setError(null);
    startTransition(async () => {
      const result = await followProfile(formData);
      if (result?.error) setError(result.error);
      else setFollowing(true);
    });
  }

  function confirmUnfollow() {
    const formData = new FormData();
    formData.set('profileId', profileId);
    setError(null);
    startTransition(async () => {
      const result = await unfollowProfile(formData);
      if (result?.error) setError(result.error);
      else {
        setFollowing(false);
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div>
      <Button
        variant={following ? 'secondary' : 'primary'}
        size="sm"
        onClick={() => (following ? setConfirmOpen(true) : follow())}
        disabled={pending}
        type="button"
      >
        {pending && !confirmOpen ? '…' : following ? 'Siguiendo' : 'Seguir'}
      </Button>
      {error && !confirmOpen && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>
      )}

      {confirmOpen && (
        <Modal title="¿Dejar de seguir?" onClose={() => setConfirmOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={confirmUnfollow}
              disabled={pending}
              style={{
                width: '100%', textAlign: 'center', padding: '13px 14px',
                fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--danger)',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {pending ? 'Dejando de seguir…' : 'Dejar de seguir'}
            </button>
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', textAlign: 'center' }}>{error}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// El formulario del propio perfil: nombre, usuario, bio y foto. Se abre
// desde el menú de los tres puntos (PerfilScreen controla el estado
// "editing") y se cierra solo al guardar con éxito — sin botón de cerrar aparte.
function EditProfileFields({ profile, onClose }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  const [username, setUsernameValue] = useState(profile.username ?? '');

  useEffect(() => {
    if (state?.saved) onClose();
  }, [state, onClose]);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <AvatarUploader hasAvatar={!!profile.avatar_url} />
      <Input name="displayName" defaultValue={profile.display_name} placeholder="Tu nombre" required />
      <UsernameField value={username} onChange={setUsernameValue} currentUsername={profile.username ?? null} />
      <Textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Una frase corta sobre ti (opcional)" rows={2} />
      {state?.error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
          {state.error}
        </div>
      )}
      <Button variant="primary" size="sm" type="submit" disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  );
}

// El menú de los tres puntos: Editar perfil / Compartir perfil. Compartir
// sigue el mismo patrón que InviteButton — menú nativo del celular si existe,
// si no copia el link (con aviso) o, como último recurso, un prompt.
function ProfileMenu({ profileId, onEdit }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setOpen(false);
    const url = `${window.location.origin}/perfil/${profileId}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Libris', text: 'Sígueme en Libris', url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia este link y compártelo:', url);
    }
  }

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px',
    fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--text-primary)',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
  };

  return (
    <div style={{ position: 'relative' }}>
      <IconButton aria-label="Más opciones" size={30} onClick={() => setOpen((o) => !o)}>
        <Icon name="more-horizontal" size={14} />
      </IconButton>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
          <div
            style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 5, minWidth: 190,
              background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
            }}
          >
            <button type="button" style={itemStyle} onClick={() => { setOpen(false); onEdit(); }}>
              <Icon name="pencil" size={14} /> Editar perfil
            </button>
            <div style={{ height: 1, background: 'var(--border-subtle)' }} />
            <button type="button" style={itemStyle} onClick={handleShare}>
              <Icon name="share-2" size={14} /> Compartir perfil
            </button>
            <div style={{ height: 1, background: 'var(--border-subtle)' }} />
            <form action={signOut}>
              <button type="submit" style={itemStyle}>
                <Icon name="log-out" size={14} /> Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}

      {copied && (
        <div
          role="status"
          style={{
            position: 'absolute', top: '110%', right: 0, marginTop: 8, whiteSpace: 'nowrap', zIndex: 5,
            background: 'var(--neutral-900)', color: 'var(--text-on-accent)',
            fontSize: 'var(--fs-2xs)', fontWeight: 600, padding: '6px 10px', borderRadius: 'var(--radius-md)',
          }}
        >
          ¡Link copiado!
        </div>
      )}
    </div>
  );
}

// Una tarjeta de actividad: un bloque alto que domina la pantalla, con la
// foto de fondo (la del libro, o la que la persona subió si es una foto
// propia) y lo que dijo anclado abajo. Tocarla despliega el texto completo.
function ActivityCard({ activity, canOpenClub, personName }) {
  const [expanded, setExpanded] = useState(false);
  const isPhoto = activity.kind === 'photo';
  const isQuote = activity.kind === 'quote';
  const text = isPhoto
    ? activity.body
    : activity.kind === 'voice'
      ? (activity.voice_transcript ?? 'Publicó una nota de voz.')
      : activity.body;
  const backgroundUrl = isPhoto ? activity.photo_url : activity.book_cover_url;

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        position: 'relative', height: 440, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)', cursor: 'pointer', flexShrink: 0,
        background: backgroundUrl ? `center/cover no-repeat url(${backgroundUrl})` : 'var(--accent-500)',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 42%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.9) 100%)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 8 }}>
          {isPhoto && <Icon name="camera" size={12} color="rgba(255,255,255,0.75)" />}
          {isPhoto ? `Compartió una foto · ${formatRelativeTime(activity.created_at)}` : `${activity.club_name} · ${formatRelativeTime(activity.created_at)}`}
        </div>
        {!isPhoto && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
              {activity.book_title}
            </div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.68)', marginTop: 3 }}>
              {activity.book_author}
            </div>
          </>
        )}
        {text && (
          <div
            style={{
              fontSize: 'var(--fs-sm)', marginTop: isPhoto ? 4 : 12, lineHeight: 'var(--lh-snug)',
              color: isQuote ? 'var(--gold-300)' : 'rgba(255,255,255,0.95)',
              fontStyle: isQuote ? 'italic' : 'normal',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {isPhoto ? text : `“${text}”`}
          </div>
        )}
        {expanded && isQuote && activity.quote_style && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
            <DownloadQuoteImageButton
              style={activity.quote_style}
              quoteText={activity.body}
              book={{ title: activity.book_title, author: activity.book_author, cover_url: activity.book_cover_url }}
              clubName={activity.club_name}
              personName={personName}
            />
          </div>
        )}
        {expanded && canOpenClub && !isPhoto && (
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
      {isOwn ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
          <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block' }} />
          <ProfileMenu profileId={profile.id} onEdit={() => setEditing(true)} />
        </div>
      ) : (
        <IconButton aria-label="Volver" onClick={() => router.back()}>
          <Icon name="arrow-left" size={18} />
        </IconButton>
      )}

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

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {profile.display_name}
            </div>
            {profile.username && (
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>@{profile.username}</div>
            )}
            {profile.bio && (
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 'var(--lh-snug)' }}>
                {profile.bio}
              </div>
            )}
          </div>
          {isOwn && <PostComposer />}
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
        {activity.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
            {isOwn ? 'Todavía no comentaste ni compartiste nada.' : 'Todavía no compartió nada que puedas ver.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activity.map((item) => (
              <ActivityCard key={item.id} activity={item} canOpenClub={myClubIds.has(item.club_id)} personName={profile.display_name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
