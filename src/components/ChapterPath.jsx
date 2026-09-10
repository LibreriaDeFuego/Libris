'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { updateProgress, getChapterCommentsPreview, getClubMembersProgress } from '@/app/actions/clubs';
import { NewCommentForm } from '@/components/NewCommentForm';
import { VoiceRecorder } from '@/components/VoiceRecorder';

// Lo leído ya no es un color plano: el camino recorrido va de un gris
// azulado frío (el capítulo más viejo) al coral de siempre — justo en
// tu capítulo actual, siempre. Lo que falta se queda gris, sin degradé.
const PATH_START = '#3B4B66';
const PATH_END = '#FF4F32'; // = --accent-500 — así el capítulo actual siempre queda con el color de acento de toda la vida.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// El color de un capítulo ya leído (o el actual): 0 = el más viejo,
// 1 = el actual. Con un solo capítulo leído (currentIndex 0) no hay
// degradé posible — va directo al color del capítulo actual.
function pathColor(originalIndex, currentIndex) {
  return lerpColor(PATH_START, PATH_END, currentIndex <= 0 ? 1 : originalIndex / currentIndex);
}

// Un color por volumen — se cicla si hay más volúmenes que colores. No
// tiene nada que ver con `pathColor` (ese marca qué leíste; este solo
// distingue un volumen del otro en su título de sección).
const VOLUME_PALETTE = ['#5B4B8A', '#C98A2E', '#2B7A78', '#9C5261', '#5C8A46', '#3B5B7A'];

// El camino de capítulos del club, de punta a punta como una tabla de
// contenidos: Cap. 1 arriba, el último abajo, en orden. (Se probó al
// revés — estilo Duolingo, lo que falta arriba — pero se sintió menos
// natural que simplemente leer el camino de corrido.) Una sola columna
// recta — el nombre del capítulo siempre del mismo lado, sin zigzag
// (se probó alternando izquierda/derecha capítulo por capítulo, pero
// esta versión se lee más tranquila). Lo ya leído no es un solo color
// plano: va de un gris azulado frío en el capítulo más viejo al coral
// de siempre justo en tu capítulo actual — un degradé, no un color fijo
// (`pathColor`, arriba). Tocar un nodo actualiza el progreso al toque,
// igual que hacían los chips que reemplaza. La racha de lectura
// (migración 035) vive integrada en el nodo actual, no aparte.
//
// Junto a cada capítulo, cuántos comentarios tiene — siempre a la vista,
// sin botón (es información útil de entrada). Si el capítulo es TU
// CAPÍTULO ACTUAL o queda más adelante, tocar la pastilla no lleva a los
// comentarios directo: avisa que podría haber spoilers primero — estar
// "en" un capítulo no significa haberlo terminado, así que sus propios
// comentarios podrían adelantar algo que todavía no leíste de ese mismo
// capítulo. Solo en los capítulos ya pasados (marcados como leídos) es
// un link directo.
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
//
// Si el libro tiene más de un volumen, su nombre real aparece como título
// de sección — centrado, sin nada más — la primera vez que aparece un
// capítulo suyo. (Se probó también un carril de color corrido al lado del
// camino, pero se sacó: quedaba mejor sin esas líneas.) Con un solo
// volumen (o ninguno, el caso de siempre) no se muestra nada.
//
// Agregar algo en un capítulo, sin salir de acá — cada nodo tiene su propio
// broche "+" (esquina inferior derecha, mismo lugar que ya usa la insignia
// de racha para la esquina opuesta) que abre el mismo panel que ya aparecía
// solo al marcar un capítulo como leído: los últimos comentarios, y ahora
// también el formulario para sumar un comentario, una cita, una foto/GIF o
// grabar una nota de voz — todo embebido (NewCommentForm + VoiceRecorder,
// los mismos que usa la pantalla de Comentarios), sin navegar a otra
// pantalla. Publicar desde acá refresca la vista previa (onPosted/onDone)
// para verlo al toque. Se probaron antes un botón aparte junto a la
// pastilla de comentarios y varios gestos (deslizar, tocar la etiqueta,
// mantener presionado) — se eligió el broche sobre el nodo por quedar
// siempre a la vista sin sumar un objeto nuevo a la fila.
//
// "Quiénes están leyendo" — se había sacado del todo (ver README), quedaba
// redundante frente a los integrantes del club en "Mis clubes de lectura".
// Vuelve, pero como algo que se elige ver o no: un botón en el encabezado
// ("Ver compañeros" / "Ocultar compañeros") que, recién al tocarlo, trae el
// capítulo actual de cada compañero (getClubMembersProgress) y los muestra
// como un stack de avatares chicos debajo del nodo donde va cada uno.
export function ChapterPath({ clubId, clubBookId, book, chapters, volumes = [], currentChapterId, streakCount = 0, commentCounts = {}, onOpenFull, onFinishBook }) {
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [spoilerWarning, setSpoilerWarning] = useState(null); // { chapterId, label } | null
  const [composerChapterId, setComposerChapterId] = useState(null);
  // Con qué pestaña arranca el panel (ver ChapterCommentsPanel): "said" al
  // abrirse solo después de marcar el capítulo como leído (mostrar primero
  // qué se dijo), "add" al abrirlo a mano con el broche "+" (ahí la
  // intención ya es agregar algo).
  const [composerInitialTab, setComposerInitialTab] = useState('said');
  const [preview, setPreview] = useState(null); // { chapterId, label, comments, total } | null
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [finishPending, setFinishPending] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const [companions, setCompanions] = useState(null); // null = todavía no se pidió
  const [loadingCompanions, setLoadingCompanions] = useState(false);
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

  // Agrupa a los compañeros ya traídos (getClubMembersProgress) por el
  // capítulo donde está cada uno — solo tiene datos reales después de tocar
  // "Ver compañeros" al menos una vez (antes, `companions` es null).
  const companionsByChapter = useMemo(() => {
    const map = new Map();
    for (const m of companions ?? []) {
      const list = map.get(m.chapterId) ?? [];
      list.push(m);
      map.set(m.chapterId, list);
    }
    return map;
  }, [companions]);

  if (!chapters || chapters.length === 0) return null;

  const activeId = optimisticId != null && optimisticId !== currentChapterId ? optimisticId : currentChapterId;
  const currentIndex = chapters.findIndex((c) => c.id === activeId);

  // El camino completo, sin ventana — se probó recortarlo (2 atrás, 3
  // adelante del actual, con "+N capítulos más" en las puntas) pero
  // tapaba la ruta entera; ahora se ve toda, de principio a fin.
  const path = chapters;

  // Los títulos de sección por volumen: `chapters` ya llega agrupado por
  // volumen (lo ordena `orderChapters` antes de pasarlo), así que alcanza
  // con mirar el volumen de cada capítulo, en orden, para saber dónde
  // empieza uno nuevo. Solo se activa si hay más de un grupo real entre
  // los capítulos — un solo volumen (o ninguno) es el caso de siempre.
  const sortedVolumes = [...volumes].sort((a, b) => a.position - b.position);
  function volumeKeyOf(chapter) {
    return chapter.volume_id && sortedVolumes.some((v) => v.id === chapter.volume_id) ? chapter.volume_id : null;
  }
  function volumeColorOf(key) {
    if (key == null) return 'var(--neutral-400)';
    const idx = sortedVolumes.findIndex((v) => v.id === key);
    return idx === -1 ? 'var(--neutral-400)' : VOLUME_PALETTE[idx % VOLUME_PALETTE.length];
  }
  function volumeLabelOf(key) {
    return key == null ? 'Sin volumen' : (sortedVolumes.find((v) => v.id === key)?.name ?? 'Sin volumen');
  }
  const showVolumeHeaders = new Set(chapters.map((c) => volumeKeyOf(c))).size > 1;

  function chapterLabel(chapter) {
    return chapter.title ? `Cap. ${chapter.number}` : (chapter.label ?? `Cap. ${chapter.number}`);
  }

  // Trae (o refresca) la vista previa de comentarios de un capítulo — al
  // marcarlo como leído, al abrir su "+", o después de publicar algo desde
  // el propio panel (para verlo reflejado sin salir de Tu camino).
  function refreshPreview(chapter) {
    setLoadingPreview(true);
    startTransition(async () => {
      const data = await getChapterCommentsPreview(clubBookId, chapter.id);
      setPreview({ chapterId: chapter.id, label: chapterLabel(chapter), ...data });
      setLoadingPreview(false);
    });
  }

  // El botón "+" de cada capítulo — abre (o cierra, si ya estaba abierto) el
  // panel de ese capítulo: comentarios existentes + el formulario para sumar
  // los propios, sin ir a la pantalla de Comentarios.
  function openComposerFor(chapter) {
    setSpoilerWarning(null);
    if (composerChapterId === chapter.id) {
      setComposerChapterId(null);
      setPreview(null);
      return;
    }
    setComposerChapterId(chapter.id);
    setComposerInitialTab('add');
    setPreview(null);
    refreshPreview(chapter);
  }

  function handleToggleCompanions() {
    if (showCompanions) {
      setShowCompanions(false);
      return;
    }
    setShowCompanions(true);
    if (companions == null) {
      setLoadingCompanions(true);
      startTransition(async () => {
        const data = await getClubMembersProgress(clubBookId);
        setCompanions(data.members ?? []);
        setLoadingCompanions(false);
      });
    }
  }

  function handleTap(chapter) {
    if (chapter.id === activeId || pending) return;
    setError(null);
    setOptimisticId(chapter.id);
    setToast(`Listo, vas por el ${chapterLabel(chapter)}`);
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
      // Después de marcar el capítulo, se abre directo su panel — mismo que
      // el broche "+" — para ver qué se dijo y poder sumar lo tuyo al toque.
      setComposerChapterId(chapter.id);
      setComposerInitialTab('said');
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Toca el capítulo en el que vas</div>
          <button
            type="button"
            onClick={handleToggleCompanions}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              padding: '2px 0', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text-link)', fontFamily: 'var(--font-body)',
            }}
          >
            <Icon name="users" size={12} />
            {showCompanions ? 'Ocultar compañeros' : 'Ver compañeros'}
          </button>
        </div>
        {showCompanions && loadingCompanions && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Buscando a tus compañeros…</div>
        )}
        {showCompanions && !loadingCompanions && companions?.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Nadie más registró su progreso todavía.</div>
        )}
      </div>

      <div style={{ position: 'relative', padding: '10px 24px 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {path.map((chapter, i) => {
            const originalIndex = chapters.findIndex((c) => c.id === chapter.id);
            const isCurrent = chapter.id === activeId;
            const isDone = currentIndex !== -1 && originalIndex < currentIndex;
            // "isAhead" = todavía no está marcado como leído — incluye tu
            // capítulo actual (>=, no solo >): estar "en" un capítulo no
            // significa haberlo terminado, así que sus comentarios también
            // avisan de spoilers en vez de ir directo. Solo lo YA leído
            // (isDone) es un link directo.
            const isAhead = currentIndex !== -1 && originalIndex >= currentIndex;
            const isSaving = pending && optimisticId === chapter.id;
            const showFlame = isCurrent && streakCount >= 2;
            const commentInfo = commentCounts[chapter.id];
            const nodeColor = isDone || isCurrent ? pathColor(originalIndex, currentIndex) : null;

            const nextChapter = path[i + 1];
            const nextOriginalIndex = nextChapter ? chapters.findIndex((c) => c.id === nextChapter.id) : null;
            const showSegmentAfter = i < path.length - 1;
            const segmentColored = showSegmentAfter && currentIndex !== -1 && nextOriginalIndex <= currentIndex;

            const volumeKey = volumeKeyOf(chapter);
            const isFirstOfVolume = showVolumeHeaders && (i === 0 || volumeKeyOf(path[i - 1]) !== volumeKey);
            const chapterCompanions = showCompanions ? (companionsByChapter.get(chapter.id) ?? []) : [];

            const extras = (
              <SideExtras
                commentInfo={commentInfo}
                isAhead={isAhead}
                onCommentTap={() => handleSpoilerTap(chapter)}
                href={!isAhead ? `/club/${clubId}/comentarios?capitulo=${chapter.id}` : null}
              />
            );
            const composerOpen = composerChapterId === chapter.id;

            return (
              <div key={chapter.id}>
                {isFirstOfVolume && (
                  <div
                    style={{
                      textAlign: 'center', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                      color: volumeColorOf(volumeKey), margin: i === 0 ? '0 0 10px' : '14px 0 10px',
                    }}
                  >
                    {volumeLabelOf(volumeKey)}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    {extras}
                  </div>
                  <div style={{ position: 'relative', width: isCurrent ? 48 : 40, height: isCurrent ? 48 : 40, justifySelf: 'center' }}>
                    <button
                      type="button"
                      ref={isCurrent ? currentNodeRef : undefined}
                      onClick={() => handleTap(chapter)}
                      disabled={isCurrent || isSaving}
                      aria-label={`Cap. ${chapter.number}${isCurrent ? ' (tu capítulo actual)' : ''}`}
                      style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        border: isDone || isCurrent ? 'none' : '2px solid var(--neutral-200)',
                        background: nodeColor ?? 'var(--surface-card)',
                        boxShadow: isCurrent ? '0 0 0 5px rgba(255,79,50,.18)' : 'none',
                        color: isDone || isCurrent ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: isCurrent ? 15 : 13,
                        cursor: isCurrent || isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      {isDone ? <Icon name="check" size={16} color="var(--text-on-accent)" strokeWidth={3} /> : chapter.number}
                    </button>
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
                    <button
                      type="button"
                      onClick={() => openComposerFor(chapter)}
                      aria-label={composerOpen ? 'Cerrar' : 'Comentar, grabar una nota o adjuntar una foto en este capítulo'}
                      aria-pressed={composerOpen}
                      style={{
                        position: 'absolute', bottom: -6, right: -8, width: 20, height: 20, borderRadius: '50%',
                        background: composerOpen ? 'var(--accent-500)' : 'var(--surface-card)',
                        border: '2px solid var(--surface-page)', boxShadow: 'var(--shadow-sm)',
                        color: composerOpen ? 'var(--text-on-accent)' : 'var(--accent-600)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                      }}
                    >
                      <Icon name={composerOpen ? 'x' : 'plus'} size={11} />
                    </button>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <NodeLabel chapter={chapter} isCurrent={isCurrent} isDone={isDone} align="left" />
                  </div>
                </div>

                {chapterCompanions.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', margin: '2px 0' }}>
                    <div />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <CompanionAvatars companions={chapterCompanions} />
                    </div>
                    <div />
                  </div>
                )}

                {spoilerWarning?.chapterId === chapter.id && (
                  <SpoilerWarning
                    label={spoilerWarning.label}
                    href={`/club/${clubId}/comentarios?capitulo=${chapter.id}`}
                    onDismiss={() => setSpoilerWarning(null)}
                  />
                )}

                {composerChapterId === chapter.id && (
                  <ChapterCommentsPanel
                    clubId={clubId}
                    clubBookId={clubBookId}
                    book={book}
                    chapterId={chapter.id}
                    label={chapterLabel(chapter)}
                    preview={preview?.chapterId === chapter.id ? preview : null}
                    loading={loadingPreview && (!preview || preview.chapterId !== chapter.id)}
                    initialTab={composerInitialTab}
                    onDismiss={() => { setComposerChapterId(null); setPreview(null); }}
                    onPosted={() => refreshPreview(chapter)}
                  />
                )}

                {showSegmentAfter && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', height: 26 }}>
                    <div />
                    <div
                      style={{
                        width: 3, borderRadius: 2, justifySelf: 'center',
                        background: segmentColored
                          ? `linear-gradient(${nodeColor}, ${pathColor(nextOriginalIndex, currentIndex)})`
                          : 'var(--neutral-200)',
                      }}
                    />
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
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent-500)' }}>¡Llegaste al final!</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Toca para terminarlo</div>
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
        <div style={{ fontSize: 11, color: 'var(--accent-500)', fontWeight: 700, marginTop: 1, letterSpacing: '.02em' }}>AQUÍ VAS</div>
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

// Lo que va del lado libre de cada nodo (opuesto a la etiqueta del
// capítulo): la pastilla de comentarios, si el capítulo tiene alguno — el
// broche "+" para agregar algo vive sobre el propio nodo (ver más arriba),
// no acá. Una sola pastilla — antes solo con el ícono de "comentario";
// ahora, si entre los comentarios de este capítulo hay alguna nota de voz
// y/o alguna foto o GIF, se les suma su propio ícono antes del total (mismo
// color que el resto de la pastilla — ni "mic" ni "image" tienen un color
// propio en ningún otro lugar de la app, así que no se les inventa uno
// acá). No desglosa cuántos hay de cada tipo, solo cuáles hay.
function SideExtras({ commentInfo, isAhead, onCommentTap, href }) {
  if (!commentInfo?.total) return null;
  const { total, hasVoice, hasPhoto } = commentInfo;
  const label = `${total} ${total === 1 ? 'comentario' : 'comentarios'}`;
  // Diseño pedido: siempre en dos líneas fijas, no un pill de una sola
  // línea que a veces envuelve — arriba la fila de íconos, abajo el
  // total, las dos alineadas al borde IZQUIERDO entre sí (alignItems
  // 'flex-start'). Con contenido en columna, un radio de pill (999px) ya
  // no tiene sentido — pasa a un radio de tarjeta chica (radius-md), más
  // acorde a esta forma de chip de dos líneas que a una cápsula.
  return isAhead ? (
    <button
      type="button"
      onClick={onCommentTap}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
        background: 'var(--neutral-100)', border: '1px solid var(--neutral-200)',
        borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="triangle-alert" size={11} color="var(--text-tertiary)" />
        {hasVoice && <Icon name="mic" size={11} color="var(--text-tertiary)" />}
        {hasPhoto && <Icon name="image" size={11} color="var(--text-tertiary)" />}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  ) : (
    <Link
      href={href}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
        background: 'var(--surface-card)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)', padding: '6px 10px', textDecoration: 'none',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="message-circle" size={11} color="var(--text-secondary)" />
        {hasVoice && <Icon name="mic" size={11} color="var(--text-secondary)" />}
        {hasPhoto && <Icon name="image" size={11} color="var(--text-secondary)" />}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  );
}

// El stack de avatares de compañeros que están en ESTE capítulo ("Quiénes
// están leyendo", ver README) — solo se pide y se muestra si se tocó "Ver
// compañeros". Hasta 4 avatares superpuestos; el resto queda en un "+N". El
// `title` nativo (tooltip al pasar el mouse) lista los nombres — no hace
// falta nada más elaborado para algo tan chico.
function CompanionAvatars({ companions }) {
  const shown = companions.slice(0, 4);
  const extra = companions.length - shown.length;
  const names = companions.map((c) => c.displayName).join(', ');
  return (
    <div title={`Leyendo acá: ${names}`} style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((c, i) => (
        <div key={c.profileId} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: '50%', border: '2px solid var(--surface-page)', lineHeight: 0 }}>
          <Avatar name={c.displayName} src={c.avatarUrl} size={22} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -8, width: 22, height: 22, borderRadius: '50%', background: 'var(--neutral-200)',
            border: '2px solid var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)',
          }}
        >
          +{extra}
        </div>
      )}
    </div>
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
          Puede que encuentres spoilers acá si todavía no terminaste {label}.
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

// El panel de un capítulo puntual — se abre solo al marcar ese capítulo
// como leído, o al tocar su broche "+" (ver el nodo, más arriba). El
// formulario para comentar, citar, adjuntar foto/GIF (NewCommentForm) y
// grabar una nota de voz (VoiceRecorder) viven acá mismo, embebidos — los
// mismos componentes que usa la pantalla de Comentarios, no una versión
// aparte — sin navegar a otra pantalla.
//
// Dos pestañas, no todo apilado en una sola vista: "Lo que dijeron" (lo ya
// publicado, con link a ver el hilo completo) y "Agregar lo tuyo" (el
// formulario). Mezclado todo junto, un capítulo con varios comentarios
// largos obligaba a scrollear bastante antes de llegar a donde se escribe.
// Con qué pestaña arranca depende de cómo se abrió el panel (`initialTab`,
// decidido en ChapterPath): recién marcado como leído, "said" — primero se
// ve qué se dijo; con el broche "+", "add" — ahí la intención ya es sumar
// algo. Publicar desde la pestaña "Agregar lo tuyo" vuelve sola a "Lo que
// dijeron" (junto con onPosted, que refresca la vista previa) para ver lo
// propio reflejado al toque, como confirmación de que se publicó.
function ChapterCommentsPanel({ clubId, clubBookId, book, chapterId, label, preview, loading, initialTab = 'said', onDismiss, onPosted }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const href = `/club/${clubId}/comentarios?capitulo=${chapterId}`;
  const total = preview?.total ?? 0;

  function handlePosted() {
    onPosted?.();
    setActiveTab('said');
  }

  return (
    <div style={{ margin: '2px 18px 10px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
          Comentarios · {label}
        </div>
        <button type="button" onClick={onDismiss} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-tertiary)' }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 10px' }}>
        <TabButton active={activeTab === 'said'} onClick={() => setActiveTab('said')}>
          Lo que dijeron{!loading && total > 0 ? ` (${total})` : ''}
        </TabButton>
        <TabButton active={activeTab === 'add'} onClick={() => setActiveTab('add')}>
          Agregar lo tuyo
        </TabButton>
      </div>

      <div style={{ padding: '10px 14px 14px' }}>
        {activeTab === 'said' ? (
          loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Buscando comentarios…</div>
          ) : total === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Todavía no hay comentarios en este capítulo.</div>
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--text-link)' }}
              >
                Sé el primero
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {preview.comments.map((c) => (
                <div key={c.id} style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.authorName}</span>{' '}
                  {c.preview}
                </div>
              ))}
              <Link href={href} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-link)', textDecoration: 'none' }}>
                {total > preview.comments.length ? `Ver los ${total} comentarios` : 'Ver y responder'}
              </Link>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <NewCommentForm clubBookId={clubBookId} chapterId={chapterId} book={book} onPosted={handlePosted} />
            <VoiceRecorder clubBookId={clubBookId} chapterId={chapterId} onDone={handlePosted} />
          </div>
        )}
      </div>
    </div>
  );
}

// Una pestaña del panel de un capítulo — texto centrado, esquinas
// redondeadas solo arriba (se apoya visualmente sobre el cuerpo de abajo),
// la activa en el color de fondo de la tarjeta, la inactiva un tono más
// apagado (surface-card-alt) para que se note cuál está elegida sin
// necesitar un subrayado aparte.
function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: 700, padding: '7px 4px',
        borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        background: active ? 'var(--surface-card)' : 'var(--surface-card-alt)',
      }}
    >
      {children}
    </button>
  );
}
