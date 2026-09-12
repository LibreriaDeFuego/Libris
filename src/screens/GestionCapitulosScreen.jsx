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

// Tarjeta de resumen — se muestra en vez del formulario cuando el
// capítulo YA tiene una pregunta guardada, para que quede sin ninguna
// duda que ahí hay algo persistido de verdad (a diferencia de antes,
// donde "ver que ya está guardada" y "editarla" eran la misma pantalla
// — el formulario precargado — y no había forma de distinguir a simple
// vista si lo que se veía era lo guardado o algo a medio escribir).
// "Editar" recién ahí abre el formulario.
function QuestionSummaryCard({ question, onEdit, onDelete, pending }) {
  const meta = QUESTION_KIND_META[question.kind];
  return (
    <div style={{ background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-50)', color: 'var(--accent-600)', fontSize: 'var(--fs-2xs)', fontWeight: 700, padding: '4px 9px', borderRadius: 'var(--radius-pill)' }}>
          <Icon name={meta.icon} size={12} />
          {meta.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--success)', marginLeft: 'auto' }}>
          <Icon name="check-circle" size={13} />
          Guardada
        </div>
      </div>

      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 'var(--lh-snug)' }}>
        {question.prompt}
      </div>

      {question.kind !== 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {question.options.map((opt, i) => {
            const isCorrect = question.kind === 'trivia' && i === question.correct_option_index;
            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--fs-xs)',
                  color: isCorrect ? 'var(--success)' : 'var(--text-secondary)', fontWeight: isCorrect ? 700 : 400,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCorrect ? 'var(--success)' : 'var(--border-default)', flexShrink: 0 }} />
                {opt}{isCorrect ? ' · correcta' : ''}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={onDelete} disabled={pending}>
          {pending ? '...' : 'Borrar'}
        </Button>
        <Button variant="primary" size="sm" type="button" onClick={onEdit} disabled={pending}>Editar</Button>
      </div>
    </div>
  );
}

// El formulario en sí — crea una pregunta nueva (`questionId` null) o
// edita una existente (`questionId` puesto, la reemplaza entera).
// Aparte de `ChapterQuestionsManager`, para poder reusarlo tanto para
// "Agregar otra pregunta" como para editar una fila puntual de la lista.
function QuestionForm({ chapterId, clubBookId, questionId, initial, onSaved, onCancel }) {
  const [kind, setKind] = useState(initial?.kind ?? 'poll');
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [options, setOptions] = useState(initial?.options?.length ? initial.options : ['', '']);
  const [correctIndex, setCorrectIndex] = useState(initial?.correct_option_index ?? 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function updateOption(i, value) {
    setOptions((prev) => prev.map((opt, idx) => (idx === i ? value : opt)));
  }
  function addOption() {
    if (options.length >= MAX_QUESTION_OPTIONS) return;
    setOptions((prev) => [...prev, '']);
  }
  function removeOption(i) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
    setCorrectIndex((prev) => (prev === i ? 0 : prev > i ? prev - 1 : prev));
  }

  function save() {
    const formData = new FormData();
    if (questionId) formData.set('questionId', questionId);
    formData.set('chapterId', chapterId);
    formData.set('clubBookId', clubBookId);
    formData.set('kind', kind);
    formData.set('prompt', prompt);
    if (kind !== 'open') {
      options.forEach((opt) => formData.append('options', opt));
      if (kind === 'trivia') formData.set('correctOptionIndex', String(correctIndex));
    }
    setError(null);
    startTransition(async () => {
      const result = await saveChapterQuestion(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSaved({
        id: result.id, kind, prompt,
        options: kind === 'open' ? null : options,
        correct_option_index: kind === 'trivia' ? correctIndex : null,
      });
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-card)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-md)', padding: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {Object.entries(QUESTION_KIND_META).map(([value, meta]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
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

      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="¿Qué le pasa a...?" />

      {kind !== 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {kind === 'trivia' && (
                <button
                  type="button"
                  aria-label="Marcar como correcta"
                  onClick={() => setCorrectIndex(i)}
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

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={onCancel} disabled={pending}>Cancelar</Button>
        <Button variant="primary" size="sm" type="button" onClick={save} disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar pregunta'}
        </Button>
      </div>
    </div>
  );
}

// Todas las preguntas de un capítulo puntual (migración 053; varias por
// capítulo desde la 054 — antes como mucho una, ahora se puede combinar
// una encuesta con una trivia, o lo que haga falta). Salta cada una,
// una por una, en ChapterPath cuando alguien marca este capítulo como el
// que está leyendo. Vive acá dentro de la edición de ChapterRow
// (número/título/volumen), y se exporta porque ChapterPath también la usa
// — un administrador puede armar preguntas directo desde el broche "+"
// de Tu camino, sin venir hasta esta pantalla (ver AdminQuestionTab).
//
// Cada pregunta ya guardada se ve como `QuestionSummaryCard` — sin
// ninguna duda de que hay algo persistido de verdad — y "Editar" recién
// ahí abre su formulario, en el lugar de esa tarjeta. Al final, un botón
// para agregar una más (o el formulario en blanco, si se tocó ese botón).
export function ChapterQuestionsManager({ chapterId, clubBookId, questions }) {
  const [items, setItems] = useState(questions);
  const [editingId, setEditingId] = useState(null); // null | 'new' | el id de una existente
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [, startDelete] = useTransition();

  function handleSaved(item, previousId) {
    setItems((prev) => (previousId ? prev.map((q) => (q.id === previousId ? item : q)) : [...prev, item]));
    setEditingId(null);
  }

  function remove(id) {
    setDeleteError(null);
    setDeletingId(id);
    startDelete(async () => {
      const result = await deleteChapterQuestion(id);
      setDeletingId(null);
      if (result?.error) {
        setDeleteError(result.error);
        return;
      }
      setItems((prev) => prev.filter((q) => q.id !== id));
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Preguntas del capítulo
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)', marginTop: 2 }}>
          Opcionales. Aparecen cuando alguien marca este capítulo como el que está leyendo — se puede agregar más de una.
        </div>
      </div>

      {items.map((q) =>
        editingId === q.id ? (
          <QuestionForm
            key={q.id}
            chapterId={chapterId}
            clubBookId={clubBookId}
            questionId={q.id}
            initial={q}
            onSaved={(item) => handleSaved(item, q.id)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <QuestionSummaryCard
            key={q.id}
            question={q}
            onEdit={() => setEditingId(q.id)}
            onDelete={() => remove(q.id)}
            pending={deletingId === q.id}
          />
        )
      )}

      {editingId === 'new' ? (
        <QuestionForm
          chapterId={chapterId}
          clubBookId={clubBookId}
          questionId={null}
          initial={null}
          onSaved={(item) => handleSaved(item, null)}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingId('new')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px',
            borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)', background: 'none',
            color: 'var(--text-secondary)', fontSize: 'var(--fs-xs)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <Icon name="plus" size={14} /> {items.length > 0 ? 'Agregar otra pregunta' : 'Agregar pregunta'}
        </button>
      )}

      <ErrorBox error={deleteError} />
    </div>
  );
}

// Fila de un capítulo. Tocarla abre la edición: nombre, número (el capítulo
// mantiene su lugar en el orden gracias a este número, aunque tenga nombre
// propio), a qué volumen pertenece, y sus preguntas opcionales (encuesta,
// pregunta abierta o trivia, una o varias — ver ChapterQuestionsManager).
function ChapterRow({ chapter, volumes, clubBookId, questions = [] }) {
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
          {questions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon name="clipboard-list" size={13} color="var(--accent-500)" />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-500)' }}>{questions.length}</span>
            </div>
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
      <ChapterQuestionsManager chapterId={chapter.id} clubBookId={clubBookId} questions={questions} />
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
  const questionsByChapterId = new Map();
  for (const q of questions) {
    const list = questionsByChapterId.get(q.chapter_id) ?? [];
    list.push(q);
    questionsByChapterId.set(q.chapter_id, list);
  }

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
                questions={questionsByChapterId.get(chapter.id) ?? []}
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
