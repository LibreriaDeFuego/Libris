'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { getChapterQuestions } from '@/app/actions/clubs';
import { NewCommentForm } from '@/components/NewCommentForm';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ChapterQuestionsManager } from '@/screens/GestionCapitulosScreen.jsx';

// Una pestaña de TIPO del panel de agregar — ícono + rótulo apilados,
// centrados, con una rayita coral bajo la activa. Solo Cita/Foto·GIF/Voz
// (y Pregunta, si isAdmin) tienen botón acá — "Comentario" no, ver el
// comentario sobre ChapterComposerTabs más abajo. Mismo componente y mismo
// estilo que ya usa PostComposer.jsx (Perfil) para sus propias pestañas.
function TypeTabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        fontSize: 9.5, fontWeight: 700, padding: '8px 2px 7px', border: 'none', background: 'none',
        cursor: 'pointer', fontFamily: 'var(--font-body)', position: 'relative',
        color: active ? 'var(--accent-600)' : 'var(--text-tertiary)',
      }}
    >
      <Icon name={icon} size={14} color={active ? 'var(--accent-600)' : 'var(--text-tertiary)'} />
      {label}
      {active && (
        <span style={{ position: 'absolute', left: 6, right: 6, bottom: -1, height: 2, background: 'var(--accent-500)', borderRadius: '2px 2px 0 0' }} />
      )}
    </button>
  );
}

// Trae las preguntas que ya tenga este capítulo (puede haber varias desde
// la migración 054) antes de mostrar el administrador de la lista — igual
// que ya hace Gestión de capítulos. Se pide de nuevo cada vez que se abre
// esta pestaña (sin cachear entre capítulos): es información que solo
// importa mientras el admin está mirando esto, no vale la pena guardarla
// en ningún estado más arriba.
function AdminQuestionTab({ chapterId, clubBookId }) {
  const [questions, setQuestions] = useState(undefined); // undefined = cargando; array después

  useEffect(() => {
    let cancelled = false;
    getChapterQuestions(chapterId).then((result) => {
      if (!cancelled) setQuestions(result?.questions ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  if (questions === undefined) {
    return <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: '8px 0' }}>Cargando…</div>;
  }
  return <ChapterQuestionsManager chapterId={chapterId} clubBookId={clubBookId} questions={questions} />;
}

// Comentario, cita, foto/GIF o nota de voz para UN capítulo puntual —
// mismas cuatro pestañas y mismos componentes que PostComposer.jsx (Perfil):
// "Comentario" (sin botón propio, la caja de texto ya es la vista por
// default), Cita, Foto/GIF y Voz — tocar la que ya está activa vuelve al
// texto (`toggleTab`), la única forma de salir de esas tres sin cerrar el
// panel entero. Se usa envuelto en un `Modal` en DOS lugares:
//   - El broche "+" de cada nodo en Tu camino (ChapterPath.jsx,
//     ChapterCommentsPanel) — ahí sí, con `isAdmin`, agrega una quinta
//     pestaña, "Pregunta" (armar/editar la encuesta del capítulo).
//   - La barra fija al pie de "Comentarios de tu camino"
//     (ComentariosScreen.jsx, ChapterComposerBar) — sin la pestaña de
//     Pregunta, esa vive solo en el broche "+" de arriba.
// `NewCommentForm` resuelve Comentario/Cita/Foto·GIF por dentro (mismo
// formulario, distinta configuración vía `kind`/`autoOpenPicker`); Voz
// sigue siendo `VoiceRecorder`, aparte.
export function ChapterComposerTabs({ clubBookId, chapterId, book, isAdmin = false, onDone }) {
  const [activeTab, setActiveTab] = useState('comment'); // 'comment' (default) | 'quote' | 'photo' | 'voice' | 'question'

  function toggleTab(tab) {
    setActiveTab((current) => (current === tab ? 'comment' : tab));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 10 }}>
        <TypeTabButton active={activeTab === 'quote'} onClick={() => toggleTab('quote')} icon="quote" label="Cita" />
        <TypeTabButton active={activeTab === 'photo'} onClick={() => toggleTab('photo')} icon="image" label="Foto/GIF" />
        <TypeTabButton active={activeTab === 'voice'} onClick={() => toggleTab('voice')} icon="mic" label="Voz" />
        {isAdmin && (
          <TypeTabButton active={activeTab === 'question'} onClick={() => toggleTab('question')} icon="clipboard-list" label="Pregunta" />
        )}
      </div>

      {activeTab === 'voice' ? (
        <VoiceRecorder extraFields={{ clubBookId, chapterId }} showSpoilerOption={false} onDone={onDone} />
      ) : activeTab === 'question' ? (
        <AdminQuestionTab chapterId={chapterId} clubBookId={clubBookId} />
      ) : (
        <NewCommentForm
          key={activeTab}
          clubBookId={clubBookId}
          chapterId={chapterId}
          book={book}
          kind={activeTab === 'quote' ? 'quote' : 'text'}
          hideKindChips
          autoOpenPicker={activeTab === 'photo'}
          showAddPhotoLink={activeTab === 'photo'}
          hideSpoilerOption
          onPosted={onDone}
        />
      )}
    </div>
  );
}
