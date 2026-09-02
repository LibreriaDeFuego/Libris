'use client';

import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateProfile } from '@/app/actions/profile';
import { signOut } from '@/app/login/actions';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { AvatarUploader } from '@/components/AvatarUploader';
import { PostComposer } from '@/components/PostComposer';
import { UsernameField } from '@/components/UsernameField';
import { ActivityCard } from '@/components/ActivityCard';
import { FollowButton } from '@/components/FollowButton';

const initialState = { error: null };

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
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-subtle)' }}>
            {activity.map((item) => (
              <ActivityCard
                key={item.id}
                activity={item}
                canOpenClub={myClubIds.has(item.club_id)}
                personName={profile.display_name}
                isOwn={isOwn}
                author={item.kind === 'review' ? { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
