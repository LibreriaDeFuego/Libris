'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress, getChapterCommentsPreview } from '@/app/actions/clubs';

// Cuántos puntitos (de compañeros o de autores de comentarios) se apilan
// antes de pasar a "+N" — así una pastilla mide lo mismo con 3 personas
// que con 20.
const STACK_DOTS = 3;

// Mismo criterio de color que Avatar.jsx (core del design system), para que
// el puntito de acá y el avatar de "Quiénes están leyendo" sean la misma
// persona con el mismo color.
const PALETTE = ['var(--accent-500)', 'var(--gold-500)', 'var(--success)', 'var(--neutral-600)'];
function dotColor(name) {
  return PALETTE[name.length % PALETTE.length];
}
function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function firstName(name) {
  return name.split(' ')[0];
}

// El camino de capítulos del club, de punta a punta como una tabla de
// contenidos: Cap. 1 arriba, el último abajo, en orden. (Se probó al
// revés — estilo Duolingo, lo que falta arriba — pero se sintió menos
// natural que simplemente leer el camino de corrido.) Tocar un nodo
// actualiza el progreso al toque, igual que hacían los chips que
// reemplaza. La racha de lectura (migración 035) vive integrada en el
// nodo actual, no aparte.
//
// Junto a cada capítulo, quién anduvo por ahí:
// - Cuántos comentarios tiene, siempre a la vista (sin botón — antes había
//   que prenderlo, pero es información útil de entrada). Si el capítulo
//   queda MÁS ADELANTE de tu propio progreso, tocar la pastilla no lleva a
//   los comentarios directo: avisa que podría haber spoilers primero. Al
//   día o atrás, es un link directo.
// - "Mostrar quién está leyendo" — compañeros del club en ese capítulo
//   (mismos datos que MemberProgressStrip), este sí apagado por defecto:
//   es una curiosidad, no algo que se necesite ver de entrada.
//
// Además, cada vez que marcás un capítulo como leído, aparece un panel
// con los últimos comentarios de ESE capítulo (o la invitación a dejar el
// primero) — sin tener que ir a la pantalla de Comentarios a buscarlos.
//
// El camino siempre termina en un nodo de "FIN" — un libro cerrado con
// "FIN" como título abajo, con borde punteado — así se ve desde el
// principio hasta dónde llega el libro, no solo al alcanzarlo. Mientras
// no sea tu capítulo actual queda apagado (gris, sin tocar); al llegar
// se enciende (dorado) y tocarlo marca el libro entero como terminado,
// sin salir a buscar esa opción en el modal.
export function ChapterPath({ clubId, clubBookId, chapters, currentChapterId, streakCount = 0, members = [], currentUserId, commentCounts = {}, onOpenFull, onFinishBook }) {
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [showCompanions, setShowCompanions] = useState(false);
  const [spoilerWarning, setSpoilerWarning] = useState(null); // { chapterId, label } | null
  const [preview, setPreview] = useState(null); // { chapterId, label, comments, total } | null
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [finishPending, setFinishPending] = useState(false);
  const currentNodeRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Centra el capítulo actual al abrir la pantalla, para no obligar a
  // buscarlo scrolleando en libros largos — solo al montar: si después
  // tocás otro capítulo, no te saca del lugar donde acabás de tocar.
  useEffect(() => {
    currentNodeRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  if (!chapters || chapters.length === 0) return null;

  const companionsByChapter = new Map();
  for (const m of members) {
    if (!m.chapterId || m.profileId === currentUserId) continue;
    if (!companionsByChapter.has(m.chapterId)) companionsByChapter.set(m.chapterId, []);
    companionsByChapter.get(m.chapterId).push(m);
  }
  const hasCompanions = companionsByChapter.size > 0;

  const activeId = optimisticId != null && optimisticId !== currentChapterId ? optimisticId : currentChapterId;
  const currentIndex = chapters.findIndex((c) => c.id === activeId);

  // El camino completo, sin ventana — se probó recortarlo (2 atrás, 3
  // adelante del actual, con "+N capítulos más" en las puntas) pero
  // tapaba la ruta entera; ahora se ve toda, de principio a fin.
  const path = chapters;

  function chapterLabel(chapter) {
    return chapter.title ? `Cap. ${chapter.number}` : (chapter.label ?? `Cap. ${chapter.number}`);
  }

  function handleTap(chapter) {
    if (chapter.id === activeId || pending) return;
    setError(null);
    setOptimisticId(chapter.id);
    setToast(`Ahora vas por ${chapterLabel(chapter)}`);
    setPreview(null);
    setSpoilerWarning(null);

    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('mode', 'chapter');
    formData.set('chapterId', chapter.id);

    startTransition(async () => {
      const result = await updateProgress(formData);
      if (result?.error) {
        setError(result.error);
        setOptimisticId(null);
        setToast(null);
        return;
      }
      setLoadingPreview(true);
      const data = await getChapterCommentsPreview(clubBookId, chapter.id);
      setPreview({ chapterId: chapter.id, label: chapterLabel(chapter), ...data });
      setLoadingPreview(false);
    });
  }

  // Solo se llama para capítulos más adelante de tu progreso — para los
  // otros, la pastilla es directamente un link (ver SideExtras).
  function handleSpoilerTap(chapter) {
    setSpoilerWarning({ chapterId: chapter.id, label: chapterLabel(chapter) });
  }

  // El nodo de FIN, al final del camino, siempre se ve — pero solo se
  // "enciende" y se puede tocar cuando ya estás en el último capítulo.
  const isLastChapter = currentIndex !== -1 && currentIndex === chapters.length - 1;

  function handleFinishTap() {
    if (finishPending) return;
    setFinishPending(true);
    setError(null);

    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('mode', 'finished');

    startTransition(async () => {
      const result = await updateProgress(formData);
      setFinishPending(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onFinishBook?.();
    });
  }

  return (
    <div style={{ padding: '18px 0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>Tu camino</div>
          {onOpenFull && (
            <button
              type="button"
              onClick={onOpenFull}
              style={{
                flexShrink: 0, background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: 'var(--text-link)', fontFamily: 'var(--font-body)',
              }}
            >
              Actualizar por página
            </button>
          )}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Tocá un capítulo para marcarlo como el tuyo</div>

        {hasCompanions && (
          <div style={{ marginTop: 8 }}>
            <ToggleChip active={showCompanions} onClick={() => setShowCompanions((v) => !v)} iconOn="eye-off" iconOff="eye">
              {showCompanions ? 'Ocultar quién está leyendo' : 'Mostrar quién está leyendo'}
            </ToggleChip>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', padding: '10px 24px 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {path.map((chapter, i) => {
            const originalIndex = chapters.findIndex((c) => c.id === chapter.id);
            const isCurrent = chapter.id === activeId;
            const isDone = currentIndex !== -1 && originalIndex < currentIndex;
            const isAhead = currentIndex !== -1 && originalIndex > currentIndex;
            const isSaving = pending && optimisticId === chapter.id;
            const alignRight = i % 2 === 1;
            const showFlame = isCurrent && streakCount >= 2;
            const companions = showCompanions ? companionsByChapter.get(chapter.id) : null;
            const commentCount = commentCounts[chapter.id] ?? 0;

            const nextChapter = path[i + 1];
            const nextOriginalIndex = nextChapter ? chapters.findIndex((c) => c.id === nextChapter.id) : null;
            const showSegmentAfter = i < path.length - 1;
            const segmentColored = showSegmentAfter && currentIndex !== -1 && nextOriginalIndex <= currentIndex;

            const extras = (
              <SideExtras
                companions={companions}
                commentCount={commentCount}
                isAhead={isAhead}
                onCommentTap={() => handleSpoilerTap(chapter)}
                href={!isAhead ? `/club/${clubId}/comentarios?capitulo=${chapter.id}` : null}
                align={alignRight ? 'right' : 'left'}
              />
            );

            return (
              <div key={chapter.id}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    {!alignRight && <NodeLabel chapter={chapter} isCurrent={isCurrent} isDone={isDone} align="right" />}
                    {alignRight && extras}
                  </div>
                  <button
                    type="button"
                    ref={isCurrent ? currentNodeRef : undefined}
                    onClick={() => handleTap(chapter)}
                    disabled={isCurrent || isSaving}
                    aria-label={`Cap. ${chapter.number}${isCurrent ? ' (tu capítulo actual)' : ''}`}
                    style={{
                      position: 'relative', width: isCurrent ? 48 : 40, height: isCurrent ? 48 : 40, borderRadius: '50%',
                      border: isDone || isCurrent ? 'none' : '2px solid var(--neutral-200)',
                      background: isDone || isCurrent ? 'var(--accent-500)' : 'var(--surface-card)',
                      boxShadow: isCurrent ? '0 0 0 5px rgba(255,79,50,.18)' : 'none',
                      color: isDone || isCurrent ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: isCurrent ? 15 : 13,
                      cursor: isCurrent || isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
                      justifySelf: 'center', margin: '0 auto',
                    }}
                  >
                    {isDone ? <Icon name="check" size={16} color="var(--text-on-accent)" strokeWidth={3} /> : chapter.number}
                    {showFlame && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute', top: -8, right: -10, width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--gold-500)', border: '2.5px solid var(--surface-page)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon name="flame" size={11} color="#7A3E00" />
                      </span>
                    )}
                  </button>
                  <div style={{ textAlign: 'left' }}>
                    {alignRight && <NodeLabel chapter={chapter} isCurrent={isCurrent} isDone={isDone} align="left" />}
                    {!alignRight && extras}
                  </div>
                </div>

                {spoilerWarning?.chapterId === chapter.id && (
                  <SpoilerWarning
                    label={spoilerWarning.label}
                    href={`/club/${clubId}/comentarios?capitulo=${chapter.id}`}
                    onDismiss={() => setSpoilerWarning(null)}
                  />
                )}

                {showSegmentAfter && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', height: 26 }}>
                    <div />
                    <div style={{ width: 3, borderRadius: 2, background: segmentColored ? 'var(--accent-500)' : 'var(--neutral-200)', justifySelf: 'center' }} />
                    <div />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', height: 26 }}>
            <div />
            <div style={{ width: 3, borderLeft: `3px dashed ${isLastChapter ? 'var(--gold-500)' : 'var(--neutral-200)'}`, justifySelf: 'center' }} />
            <div />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              {isLastChapter ? (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent-500)' }}>¡Ya casi!</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Marcar como terminado</div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Fin del libro</div>
              )}
            </div>
            <button
              type="button"
              onClick={isLastChapter ? handleFinishTap : undefined}
              disabled={!isLastChapter || finishPending}
              aria-label={isLastChapter ? 'Marcar el libro como terminado' : 'Fin del libro — todavía no llegaste'}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isLastChapter ? 'var(--gold-500)' : 'var(--surface-card)',
                border: isLastChapter ? '3px dashed rgba(255,79,50,.4)' : '2px dashed var(--neutral-200)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', justifySelf: 'center',
                cursor: isLastChapter && !finishPending ? 'pointer' : 'default', opacity: finishPending ? 0.7 : 1,
              }}
            >
              <Icon name="book" size={20} color={isLastChapter ? '#7A3E00' : 'var(--text-tertiary)'} />
            </button>
            <div />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr' }}>
            <div />
            <div
              style={{
                textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 2,
                color: isLastChapter ? '#7A3E00' : 'var(--text-tertiary)',
              }}
            >
              FIN
            </div>
            <div />
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            margin: '2px 18px 0', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--neutral-900)', color: 'var(--hero-cream)', fontSize: 'var(--fs-xs)', fontWeight: 600,
            padding: '7px 12px', borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-md)',
          }}
        >
          <Icon name="check" size={12} color="var(--success)" />
          {toast}
        </div>
      )}

      {error && (
        <div style={{ margin: '2px 18px 0', color: 'var(--danger)', fontSize: 'var(--fs-xs)' }}>{error}</div>
      )}

      {(preview || loadingPreview) && (
        <ChapterCommentsPanel
          clubId={clubId}
          preview={preview}
          loading={loadingPreview}
          onDismiss={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function NodeLabel({ chapter, isCurrent, isDone, align }) {
  const style = {
    textAlign: align, lineHeight: 1.35, fontFamily: 'var(--font-body)',
  };
  if (isCurrent) {
    return (
      <div style={style}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Cap. {chapter.number}</div>
        {chapter.title && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{chapter.title}</div>}
        <div style={{ fontSize: 11, color: 'var(--accent-500)', fontWeight: 700, marginTop: 1, letterSpacing: '.02em' }}>TU CAPÍTULO</div>
      </div>
    );
  }
  return (
    <div style={{ ...style, fontSize: 12.5, color: isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
      Cap. {chapter.number}
      {chapter.title && <><br />{chapter.title}</>}
    </div>
  );
}

// Botón chico apagado/encendido — mismo look para "Mostrar quién está
// leyendo" y "Comentarios", solo cambia el ícono y el texto.
function ToggleChip({ active, onClick, children, iconOn, iconOff }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-pill)',
        padding: '6px 12px 6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
        border: active ? '1px solid var(--neutral-900)' : '1px solid var(--border-default)',
        background: active ? 'var(--neutral-900)' : 'var(--surface-card)',
        color: active ? 'var(--hero-cream)' : 'var(--text-secondary)',
      }}
    >
      <Icon name={active ? iconOn : iconOff} size={13} />
      {children}
    </button>
  );
}

// Lo que va del lado libre de cada nodo (opuesto a la etiqueta del
// capítulo): la pastilla de compañeros arriba, la de comentarios abajo —
// si están las dos prendidas y el capítulo tiene ambas cosas, se apilan.
function SideExtras({ companions, commentCount, isAhead, onCommentTap, href, align }) {
  if (!(companions?.length > 0) && !commentCount) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {companions?.length > 0 && (
        <Pill dots={companions.map((c) => ({ key: c.profileId, name: c.displayName }))} label={peopleLabel(companions)} />
      )}
      {commentCount > 0 && (
        isAhead ? (
          <button
            type="button"
            onClick={onCommentTap}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--neutral-100)',
              border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-pill)', padding: '3px 10px 3px 8px', cursor: 'pointer',
            }}
          >
            <Icon name="triangle-alert" size={11} color="var(--text-tertiary)" />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{commentCount} {commentCount === 1 ? 'comentario' : 'comentarios'}</span>
          </button>
        ) : (
          <Link
            href={href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-card)',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-pill)', padding: '3px 10px 3px 8px', textDecoration: 'none',
            }}
          >
            <Icon name="message-circle" size={11} color="var(--text-secondary)" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{commentCount} {commentCount === 1 ? 'comentario' : 'comentarios'}</span>
          </Link>
        )
      )}
    </div>
  );
}

function peopleLabel(people) {
  return people.length === 1
    ? firstName(people[0].displayName)
    : `${firstName(people[0].displayName)} y ${people.length - 1} más`;
}

// Puntitos apilados (hasta STACK_DOTS, "+N" si sobran) + nombre — la usa la
// pastilla de compañeros. Mismo mecanismo de apilado para cualquier lista
// de personas, si en el futuro hace falta en otro lado.
function Pill({ dots, label }) {
  const shown = dots.slice(0, STACK_DOTS);
  const extra = dots.length - shown.length;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-card)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-pill)', padding: '3px 10px 3px 3px',
      }}
    >
      <span style={{ display: 'flex' }}>
        {shown.map((d, i) => (
          <span
            key={d.key}
            style={{
              width: 14, height: 14, borderRadius: '50%', marginLeft: i === 0 ? 0 : -5,
              border: '1.5px solid var(--surface-page)', background: dotColor(d.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 6.5, fontWeight: 800, flexShrink: 0,
            }}
          >
            {initials(d.name)}
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              width: 14, height: 14, borderRadius: '50%', marginLeft: -5, border: '1.5px solid var(--surface-page)',
              background: 'var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 6, fontWeight: 800, flexShrink: 0,
            }}
          >
            +{extra}
          </span>
        )}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  );
}

// El aviso de spoiler — pedido tal cual: avisa que de acá para allá todavía
// no marcaste como leído, así que puede haber spoilers, y deja elegir si
// igual querés ver los comentarios.
function SpoilerWarning({ label, href, onDismiss }) {
  return (
    <div
      style={{
        margin: '2px 18px 10px', padding: 12, borderRadius: 'var(--radius-md)',
        background: 'var(--gold-50, #FFF8E1)', border: '1px solid var(--gold-500)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Icon name="triangle-alert" size={15} color="#8A5A00" />
        <div style={{ fontSize: 12.5, color: '#5A3D00', lineHeight: 1.4 }}>
          De acá para allá no has marcado como leído — puede que encuentres spoilers de {label}.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <Link href={href} onClick={onDismiss} style={{ fontSize: 12, fontWeight: 700, color: '#5A3D00', textDecoration: 'none' }}>
          Ver de todas formas
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#8A5A00' }}
        >
          Mejor no
        </button>
      </div>
    </div>
  );
}

// El panel que aparece apenas marcás un capítulo como leído: lo que se dijo
// ahí, o la invitación a dejar el primer comentario si todavía no hay nada.
function ChapterCommentsPanel({ clubId, preview, loading, onDismiss }) {
  const href = preview ? `/club/${clubId}/comentarios?capitulo=${preview.chapterId}` : null;

  return (
    <div style={{ margin: '2px 18px 0', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
          Comentarios{preview ? ` · ${preview.label}` : ''}
        </div>
        <button type="button" onClick={onDismiss} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-tertiary)' }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4px 14px 14px', fontSize: 12, color: 'var(--text-tertiary)' }}>Buscando comentarios…</div>
      ) : preview.total === 0 ? (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Todavía no hay comentarios en este capítulo.</div>
          <Link href={href} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-link)', textDecoration: 'none' }}>Dejar el primero</Link>
        </div>
      ) : (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {preview.comments.map((c) => (
            <div key={c.id} style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.authorName}</span>{' '}
              {c.preview}
            </div>
          ))}
          <Link href={href} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-link)', textDecoration: 'none' }}>
            {preview.total > preview.comments.length ? `Ver los ${preview.total} comentarios` : 'Ver y responder'}
          </Link>
        </div>
      )}
    </div>
  );
}
