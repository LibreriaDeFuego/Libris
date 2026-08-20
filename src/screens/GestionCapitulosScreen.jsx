'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { addChapter, renameChapter, createVolume, renameVolume } from '@/app/actions/clubs';
import { groupChaptersByVolume, chapterDisplayLabel } from '@/lib/orderChapters';

const selectStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
  background: 'var(--surface-card)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-base)',
};

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
      {error}
    </div>
  );
}

function VolumeSelect({ volumes, value, onChange }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} style={selectStyle}>
      <option value="">Sin volumen</option>
      {volumes.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
    </select>
  );
}

// Fila de un capítulo. Tocarla abre la edición: nombre, número (el capítulo
// mantiene su lugar en el orden gracias a este número, aunque tenga nombre
// propio) y a qué volumen pertenece.
function ChapterRow({ chapter, volumes }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title ?? '');
  const [number, setNumber] = useState(String(chapter.number));
  const [volumeId, setVolumeId] = useState(chapter.volume_id ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function save() {
    const formData = new FormData();
    formData.set('chapterId', chapter.id);
    formData.set('title', title);
    formData.set('number', number);
    if (volumeId) formData.set('volumeId', volumeId);
    setError(null);
    startTransition(async () => {
      const result = await renameChapter(formData);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left',
          background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
          padding: 12, cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>{chapterDisplayLabel(chapter)}</span>
        <Icon name="pencil" size={14} color="var(--text-tertiary)" />
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-card)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 76, flexShrink: 0 }}>
          <Input type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Input placeholder="Nombre del capítulo (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <VolumeSelect volumes={volumes} value={volumeId} onChange={setVolumeId} />
      <ErrorBox error={error} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button variant="primary" size="sm" type="button" onClick={save} disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

// Encabezado de un volumen ("Libro 1", "2026"...). Tocar el nombre lo
// renombra.
function VolumeHeader({ volume }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(volume.name);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function save() {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.set('volumeId', volume.id);
    formData.set('name', name.trim());
    setError(null);
    startTransition(async () => {
      const result = await renameVolume(formData);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button variant="secondary" size="sm" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
          <Button variant="primary" size="sm" type="button" onClick={save} disabled={pending}>Guardar</Button>
        </div>
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
        {volume.name}
      </span>
      <Icon name="pencil" size={12} color="var(--text-tertiary)" />
    </button>
  );
}

function NewVolumeForm({ clubBookId }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function submit() {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('name', name.trim());
    setError(null);
    startTransition(async () => {
      const result = await createVolume(formData);
      if (result?.error) setError(result.error);
      else { setName(''); setOpen(false); }
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" size="md" type="button" onClick={() => setOpen(true)}>
        <Icon name="folder-plus" size={15} /> Nuevo volumen
      </Button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 12 }}>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
        Un nombre para agrupar capítulos: “Libro 2”, “2027”, lo que tenga sentido para este libro.
      </div>
      <Input placeholder='Ej: "Libro 2"' value={name} onChange={(e) => setName(e.target.value)} />
      <ErrorBox error={error} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button variant="primary" size="sm" type="button" onClick={submit} disabled={pending}>
          {pending ? 'Creando...' : 'Crear volumen'}
        </Button>
      </div>
    </div>
  );
}

function NewChapterForm({ clubBookId, volumes, nextNumber }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState(String(nextNumber));
  const [volumeId, setVolumeId] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function submit() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('number', number);
    if (title.trim()) formData.set('title', title.trim());
    if (volumeId) formData.set('volumeId', volumeId);
    setError(null);
    startTransition(async () => {
      const result = await addChapter(formData);
      if (result?.error) setError(result.error);
      else { setTitle(''); setNumber(String(Number(number) + 1)); setOpen(false); }
    });
  }

  if (!open) {
    return (
      <Button variant="primary" size="md" type="button" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} /> Agregar capítulo
      </Button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-card)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 12 }}>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
        El número decide el orden. Si este volumen sigue la numeración anterior, dejá el número sugerido; si empieza de nuevo, poné 1.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 76, flexShrink: 0 }}>
          <Input type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Input placeholder="Nombre del capítulo (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <VolumeSelect volumes={volumes} value={volumeId} onChange={setVolumeId} />
      <ErrorBox error={error} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button variant="primary" size="sm" type="button" onClick={submit} disabled={pending}>
          {pending ? 'Agregando...' : 'Agregar'}
        </Button>
      </div>
    </div>
  );
}

export function GestionCapitulosScreen({ club, book, clubBookId, chapters, volumes }) {
  const router = useRouter();
  const groups = groupChaptersByVolume(chapters, volumes);
  const nextNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.push(`/club/${club.id}`)}>
          <Icon name="arrow-left" size={18} />
        </IconButton>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Capítulos
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{book.title}</div>
        </div>
      </div>

      {groups.length === 0 && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '12px 0', textAlign: 'center' }}>
          Todavía no hay capítulos.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.volume?.id ?? 'sin-volumen'} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {group.volume ? <VolumeHeader volume={group.volume} /> : (
            volumes.length > 0 && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                Sin volumen
              </div>
            )
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.chapters.map((chapter) => (
              <ChapterRow key={chapter.id} chapter={chapter} volumes={volumes} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <NewChapterForm clubBookId={clubBookId} volumes={volumes} nextNumber={nextNumber} />
        <NewVolumeForm clubBookId={clubBookId} />
      </div>
    </div>
  );
}
