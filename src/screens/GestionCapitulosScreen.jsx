'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { addChapter, renameChapter, createVolume, renameVolume, saveChapterQuestion, deleteChapterQuestion } from '@/app/actions/clubs';
import { groupChaptersByVolume, chapterDisplayLabel } from '@/lib/orderChapters';

const QUESTION_KIND_META = {
  poll: { icon: 'bar-chart-2', label: 'Encuesta' },
  open: { icon: 'message-square', label: 'Pregunta' },
  trivia: { icon: 'help-circle', label: 'Trivia' },
};
const MAX_QUESTION_OPTIONS = 6;

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

// La pregunta de un capítulo puntual (migración 053) — encuesta, pregunta
// abierta o trivia, atada a UN capítulo (chapter_id es unique en
// chapter_questions: como mucho una por capítulo, editar reemplaza la que
// había). Salta sola en ChapterPath cuando alguien marca este capítulo
// como el que está leyendo. Vive dentro de la edición de ChapterRow, ya
// abierta para número/título/volumen — es la misma superficie de "editar
// este capítulo", una sección más.
function ChapterQuestionEditor({ chapterId, clubBookId, question }) {
  const [kind, setKind] = useState(question?.kind ?? 'poll');
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [options, setOptions] = useState(question?.options?.length ? question.options : ['', '']);
  const [correctIndex, setCorrectIndex] = useState(question?.correct_option_index ?? 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  function updateOption(i, value) {
    setSaved(false);
    setOptions((prev) => prev.map((opt, idx) => (idx === i ? value : opt)));
  }
  function addOption() {
    if (options.length >= MAX_QUESTION_OPTIONS) return;
    setSaved(false);
    setOptions((prev) => [...prev, '']);
  }
  function removeOption(i) {
    if (options.length <= 2) return;
    setSaved(false);
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
    setCorrectIndex((prev) => (prev === i ? 0 : prev > i ? prev - 1 : prev));
  }

  function save() {
    const formData = new FormData();
    formData.set('chapterId', chapterId);
    formData.set('clubBookId', clubBookId);
    formData.set('kind', kind);
    formData.set('prompt', prompt);
    if (kind !== 'open') {
      options.forEach((opt) => formData.append('options', opt));
      if (kind === 'trivia') formData.set('correctOptionIndex', String(correctIndex));
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveChapterQuestion(formData);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  function remove() {
    if (!question) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteChapterQuestion(question.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Pregunta del capítulo
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)', marginTop: 2 }}>
          Opcional. Aparece cuando alguien marca este capítulo como el que está leyendo.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {Object.entries(QUESTION_KIND_META).map(([value, meta]) => (
          <button
            key={value}
            type="button"
            onClick={() => { setKind(value); setSaved(false); }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '9px 4px', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-2xs)', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              border: `1px solid ${kind === value ? 'var(--accent-500)' : 'var(--border-default)'}`,
              background: kind === value ? 'var(--accent-50)' : 'var(--surface-card)',
              color: kind === value ? 'var(--accent-600)' : 'var(--text-secondary)',
            }}
          >
            <Icon name={meta.icon} size={15} color={kind === value ? 'var(--accent-600)' : 'var(--text-secondary)'} />
            {meta.label}
          </button>
        ))}
      </div>

      <Textarea value={prompt} onChange={(e) => { setPrompt(e.target.value); setSaved(false); }} rows={2} placeholder="¿Qué le pasa a...?" />

      {kind !== 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {kind === 'trivia' && (
                <button
                  type="button"
                  aria-label="Marcar como correcta"
                  onClick={() => { setCorrectIndex(i); setSaved(false); }}
                  style={{
                    width: 20, height: 20, borderRadius: 'var(--radius-round)', flexShrink: 0, cursor: 'pointer', padding: 0,
                    border: `2px solid ${correctIndex === i ? 'var(--success)' : 'var(--border-default)'}`,
                    background: correctIndex === i ? 'var(--success)' : 'none',
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Opción ${i + 1}`} />
              </div>
              {options.length > 2 && (
                <IconButton size={28} aria-label="Quitar opción" onClick={() => removeOption(i)} type="button">
                  <Icon name="x" size={13} />
                </IconButton>
              )}
            </div>
          ))}
          {options.length < MAX_QUESTION_OPTIONS && (
            <button
              type="button"
              onClick={addOption}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: 'none', background: 'none',
                color: 'var(--accent-600)', fontWeight: 700, fontSize: 'var(--fs-2xs)', fontFamily: 'var(--font-body)', cursor: 'pointer', padding: 0,
              }}
            >
              <Icon name="plus" size={13} /> Agregar opción
            </button>
          )}
          {kind === 'trivia' && (
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
              Toca el círculo de la opción correcta.
            </div>
          )}
        </div>
      )}

      <ErrorBox error={error} />
      {saved && !error && (
        <div style={{ color: 'var(--success)', fontSize: 'var(--fs-2xs)' }}>Pregunta guardada.</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {question && (
          <Button variant="secondary" size="sm" type="button" onClick={remove} disabled={pending}>Borrar pregunta</Button>
        )}
        <Button variant="primary" size="sm" type="button" onClick={save} disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar pregunta'}
        </Button>
      </div>
    </div>
  );
}

// Fila de un capítulo. Tocarla abre la edición: nombre, número (el capítulo
// mantiene su lugar en el orden gracias a este número, aunque tenga nombre
// propio), a qué volumen pertenece, y su pregunta opcional (encuesta,
// pregunta abierta o trivia — ver ChapterQuestionEditor).
function ChapterRow({ chapter, volumes, clubBookId, question }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {question && (
            <Icon name={QUESTION_KIND_META[question.kind].icon} size={14} color="var(--accent-500)" />
          )}
          <Icon name="pencil" size={14} color="var(--text-tertiary)" />
        </div>
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

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '2px 0' }} />
      <ChapterQuestionEditor chapterId={chapter.id} clubBookId={clubBookId} question={question} />
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
        El número decide el orden. Si este volumen sigue la numeración anterior, deja el número sugerido; si empieza de nuevo, pon 1.
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

export function GestionCapitulosScreen({ club, book, clubBookId, chapters, volumes, questions = [] }) {
  const router = useRouter();
  const groups = groupChaptersByVolume(chapters, volumes);
  const nextNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1;
  const questionByChapterId = new Map(questions.map((q) => [q.chapter_id, q]));

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
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                volumes={volumes}
                clubBookId={clubBookId}
                question={questionByChapterId.get(chapter.id) ?? null}
              />
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
