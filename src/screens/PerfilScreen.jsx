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


// Una portada dentro de la estantería del encabezado — mismo criterio de
// siempre para un libro sin portada subida (fondo sólido accent-500, ver
// PreferenciasScreen/MisClubesScreen), pero acá SE LE SUMA el título
// encima: a diferencia de esos otros lugares (que muestran el título
// aparte, como texto), acá la portada es lo único que hay — sin el
// título, un libro sin portada sería un rectángulo de color sin ninguna
// pista de cuál es.
function BookCover({ book }) {
  return (
    <div
      style={{
        flex: '0 0 104px', height: 142, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 10,
        background: book.cover_url ? `center/cover no-repeat url(${book.cover_url})` : 'var(--accent-500)',
      }}
    >
      {!book.cover_url && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,.52) 100%)' }} />
          <span style={{ position: 'relative', fontFamily: 'var(--font-display)', fontSize: 12.5, lineHeight: 1.25, color: '#fff' }}>
            {book.title}
          </span>
        </>
      )}
    </div>
  );
}

// El encabezado del perfil — mockup aprobado en el chat ("Perfil y
// Estantería"): la estantería con los libros que la persona terminó
// (booksRead, profile_books_read) va arriba de todo, uno al lado del
// otro en orden, deslizable si no entran todos; el avatar queda
// centrado, superpuesto sobre su borde inferior. Sin libros leídos
// todavía, el avatar se muestra solo, sin estantería. Se llega a "Mi
// biblioteca" tocando la estantería (o el número "Libros", más abajo) —
// migración 046.
function ProfileHero({ profile, booksRead, libraryHref }) {
  if (booksRead.length === 0) {
    return (
      <Link href={libraryHref} style={{ display: 'flex', justifyContent: 'center' }}>
        <Avatar name={profile.display_name} src={profile.avatar_url} size={84} />
      </Link>
    );
  }
  return (
    <Link href={libraryHref} style={{ position: 'relative', display: 'block' }}>
      <div
        style={{
          display: 'flex', gap: 12, height: 142, overflowX: 'auto', overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch', padding: '2px 2px 10px',
        }}
      >
        {booksRead.map((book) => <BookCover key={book.book_id} book={book} />)}
      </div>
      <div
        style={{
          position: 'absolute', left: '50%', bottom: -26, transform: 'translateX(-50%)',
          padding: 4, borderRadius: 'var(--radius-round)', background: 'var(--surface-page)', boxShadow: 'var(--shadow-md)',
        }}
      >
        <Avatar name={profile.display_name} src={profile.avatar_url} size={84} />
      </div>
    </Link>
  );
}

export function PerfilScreen({ profile, isOwn, isFollowing, stats, activity, booksRead = [], myClubIds, myProfileId }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const libraryHref = isOwn ? '/perfil/biblioteca' : `/perfil/${profile.id}/biblioteca`;

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
        <ProfileHero profile={profile} booksRead={booksRead} libraryHref={libraryHref} />

        <div style={{ marginTop: booksRead.length > 0 ? 40 : 14, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {profile.display_name}
          </div>
          {profile.username && (
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>@{profile.username}</div>
          )}
          {profile.bio && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 'var(--lh-snug)', maxWidth: 280, marginInline: 'auto' }}>
              {profile.bio}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 34, marginTop: 14 }}>
          <Link href={libraryHref} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.book_count}
            </div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>Libros</div>
          </Link>
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

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          {isOwn ? <PostComposer /> : <FollowButton profileId={profile.id} initialFollowing={isFollowing} />}
        </div>

        {isOwn && editing && (
          <div style={{ marginTop: 14 }}>
            <EditProfileFields profile={profile} onClose={() => setEditing(false)} />
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
            {/* author/isOwn/personName se arman con los datos de CADA item
                (item.profile_id/display_name/avatar_url), no con los de
                "profile" (la página que se está mirando) — migración 039:
                un repost muestra el autor ORIGINAL del contenido, que no
                es necesariamente profile.id (podés ver, en el perfil de
                alguien, algo que esa persona reposteó de un tercero). Para
                el resto de las tarjetas (no reposteadas) da exactamente lo
                mismo: item.profile_id siempre es profile.id ahí. */}
            {activity.map((item) => (
              <ActivityCard
                key={item.repost_id ?? item.id}
                activity={item}
                canOpenClub={myClubIds.has(item.club_id)}
                personName={item.display_name}
                isOwn={item.profile_id === myProfileId}
                author={{ id: item.profile_id, display_name: item.display_name, avatar_url: item.avatar_url }}
                myProfileId={myProfileId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
