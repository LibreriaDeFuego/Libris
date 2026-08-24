'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { joinClubFromInvite, requestToJoin } from '@/app/actions/clubs';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';

// Chip "Abierto" / "Con solicitud" junto al nombre del club.
function JoinModeChip({ joinMode }) {
  const isOpen = joinMode === 'open';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', fontSize: 'var(--fs-2xs)', fontWeight: 700,
        color: isOpen ? 'var(--success-700)' : 'var(--gold-700)',
        background: isOpen ? 'var(--success-bg)' : 'var(--gold-100)',
        borderRadius: 999, padding: '2px 8px',
      }}
    >
      {isOpen ? 'Abierto' : 'Con solicitud'}
    </span>
  );
}

function OpenJoinButton({ clubId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleJoin() {
    const formData = new FormData();
    formData.set('clubId', clubId);
    startTransition(async () => {
      const result = await joinClubFromInvite(null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={handleJoin} disabled={pending} type="button">
        {pending ? 'Uniéndote…' : 'Unirme'}
      </Button>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// Club "con solicitud": botón "Postularme" que despliega un mensaje
// opcional, o el estado ya resuelto (solicitud enviada).
function RequestJoinButton({ clubId, initialStatus }) {
  const [status, setStatus] = useState(initialStatus); // null | 'pending'
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  if (status === 'pending') {
    return (
      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Solicitud enviada
      </span>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(true)}>
        Postularme
      </Button>
    );
  }

  function send() {
    const formData = new FormData();
    formData.set('clubId', clubId);
    formData.set('message', message);
    setError(null);
    startTransition(async () => {
      const result = await requestToJoin(formData);
      if (result?.error) setError(result.error);
      else {
        setStatus('pending');
        setOpen(false);
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
      <Textarea
        placeholder="Cuéntale al club por qué quieres sumarte (opcional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" type="button" onClick={send} disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
    </div>
  );
}

// Una fila de club — la misma tarjeta tanto en el directorio completo como
// en los resultados de búsqueda.
function ClubRow({ club }) {
  const isOpen = club.join_mode === 'open';
  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Avatar name={club.name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{club.name}</div>
          <JoinModeChip joinMode={club.join_mode} />
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
          {club.member_count} {Number(club.member_count) === 1 ? 'miembro' : 'miembros'}
          {club.book_title ? ` · leyendo ${club.book_title}` : ''}
        </div>
      </div>
      {isOpen ? (
        <OpenJoinButton clubId={club.id} />
      ) : (
        <RequestJoinButton
          clubId={club.id}
          initialStatus={club.my_request_status === 'pending' ? 'pending' : null}
        />
      )}
    </div>
  );
}

// Una fila de persona en los resultados de búsqueda — toca y va a su perfil.
function PersonRow({ profile }) {
  return (
    <Link
      href={`/perfil/${profile.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--shadow-sm)', textDecoration: 'none',
      }}
    >
      <Avatar name={profile.display_name} src={profile.avatar_url} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.display_name}</div>
          {profile.username && (
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>@{profile.username}</div>
          )}
        </div>
        {profile.bio && (
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.bio}
          </div>
        )}
      </div>
    </Link>
  );
}

const sectionTitleStyle = {
  fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'var(--text-tertiary)', marginBottom: 8,
};

export function OtrosClubesScreen({ clubs, currentUserId }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [people, setPeople] = useState([]);

  // Espera un momento después de que la persona deja de tipear antes de
  // buscar — evita mandar una consulta por cada letra.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Los clubes ya están cargados (el directorio completo, hasta 50) — la
  // búsqueda de clubes es solo filtrarlos. Las personas no: buscar entre
  // todos los usuarios de Libris pide su propia consulta a la base. Con la
  // búsqueda vacía el efecto no hace nada — "people" solo se muestra más
  // abajo cuando hay una búsqueda en curso (isSearching), así que no hace
  // falta limpiarlo acá.
  //
  // Se busca por nombre para mostrar Y por nombre de usuario — dos
  // consultas separadas (en vez de un solo .or()) para no tener que armar a
  // mano el texto del filtro combinado, que con comas o paréntesis en lo
  // que alguien escriba podría romper la sintaxis de PostgREST.
  useEffect(() => {
    if (!debouncedQuery) return undefined;
    let cancelled = false;
    const supabase = createClient();
    const pattern = `%${debouncedQuery}%`;
    const columns = 'id, display_name, username, avatar_url, bio';
    Promise.all([
      supabase.from('profiles').select(columns).ilike('display_name', pattern).neq('id', currentUserId).order('display_name').limit(10),
      supabase.from('profiles').select(columns).ilike('username', pattern).neq('id', currentUserId).order('display_name').limit(10),
    ]).then(([byName, byUsername]) => {
      if (cancelled) return;
      const merged = new Map();
      for (const row of [...(byName.data ?? []), ...(byUsername.data ?? [])]) merged.set(row.id, row);
      setPeople([...merged.values()].slice(0, 10));
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, currentUserId]);

  const filteredClubs = useMemo(() => {
    if (!debouncedQuery) return clubs;
    const q = debouncedQuery.toLowerCase();
    return clubs.filter((club) => club.name.toLowerCase().includes(q));
  }, [clubs, debouncedQuery]);

  const isSearching = debouncedQuery.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block' }} />
      </div>

      <Input
        placeholder="Buscar clubes o personas"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!isSearching && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: -12 }}>
          Clubes abiertos, y clubes privados que reciben solicitudes para sumarte. El resto no aparece acá.
        </div>
      )}

      {isSearching ? (
        filteredClubs.length === 0 && people.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
            No encontramos nada para &ldquo;{debouncedQuery}&rdquo;.
          </div>
        ) : (
          <>
            {filteredClubs.length > 0 && (
              <div>
                <div style={sectionTitleStyle}>Clubes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredClubs.map((club) => <ClubRow key={club.id} club={club} />)}
                </div>
              </div>
            )}
            {people.length > 0 && (
              <div>
                <div style={sectionTitleStyle}>Personas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {people.map((profile) => <PersonRow key={profile.id} profile={profile} />)}
                </div>
              </div>
            )}
          </>
        )
      ) : clubs.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Todavía no hay clubes para unirse.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clubs.map((club) => <ClubRow key={club.id} club={club} />)}
        </div>
      )}
    </div>
  );
}
