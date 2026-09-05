'use client';

import { useRef, useState, useTransition } from 'react';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { postComment } from '@/app/actions/clubs';
import { QUOTE_STYLES, renderQuoteCard } from '@/lib/quoteCard';
import { compressImage } from '@/lib/imageProcessing';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { QuoteCardPreview } from '@/components/QuoteCardPreview';

// Miniatura de cada estilo — no es el render real de la tarjeta (eso lo hace
// quoteCard.js recién al descargar), solo una vista aproximada para elegir.
// Exportada porque EditQuoteModal la reusa tal cual, para editar una cita ya
// publicada con el mismo selector.
export function StyleSwatch({ id, label, selected, onSelect, coverUrl }) {
  const isCover = id === 'cover';
  const isDark = id === 'dark';
  const isLightSample = !isCover && !isDark;
  const background = isCover
    ? (coverUrl ? `center/cover no-repeat url(${coverUrl})` : 'var(--hero-bg)')
    : isDark
      ? 'var(--hero-bg)'
      : 'var(--hero-cream)';

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      style={{
        flex: 1, height: 64, borderRadius: 'var(--radius-md)', padding: 0, cursor: 'pointer',
        border: selected ? '2px solid var(--accent-500)' : '1px solid var(--border-default)',
        background, position: 'relative', overflow: 'hidden',
      }}
    >
      {isCover && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,12,8,0.15), rgba(15,12,8,0.62))' }} />
      )}
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontStyle: isLightSample ? 'normal' : 'italic', fontWeight: 700,
          fontSize: 16, color: isLightSample ? 'var(--neutral-900)' : 'var(--hero-cream)',
        }}
      >
        Aa
      </div>
      <div
        style={{
          position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9, fontWeight: 700,
          color: isLightSample ? 'var(--neutral-600)' : 'var(--hero-cream)', opacity: 0.9,
        }}
      >
        {label}
      </div>
    </button>
  );
}

export function NewCommentForm({ clubBookId, chapterId, book, clubName, personName }) {
  const [kind, setKind] = useState('text');
  const [body, setBody] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [quoteStyle, setQuoteStyle] = useState('cover');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  // Tras publicar una cita, en vez de limpiar el formulario de una, se ofrece
  // descargar la tarjeta ahí mismo.
  const [published, setPublished] = useState(null);
  const formRef = useRef(null);
  // Foto o GIF adjunto a un comentario de texto (migración 041) — "image"
  // ya es el archivo listo para subir (comprimido, salvo que sea GIF); la
  // vista previa es su propio object URL, liberado al sacarla o reemplazarla.
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const imageInputRef = useRef(null);

  async function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Un GIF no pasa por compressImage: ese <canvas> solo captura un
    // frame, lo dejaría animado por dentro pero estático al mostrarlo —
    // mismo criterio que ya usa PostComposer con las fotos de Perfil.
    const prepared = file.type === 'image/gif' ? file : await compressImage(file);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImage(prepared);
    setImagePreviewUrl(URL.createObjectURL(prepared));
  }

  function removeImage() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImage(null);
    setImagePreviewUrl(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    formData.set('clubBookId', clubBookId);
    formData.set('kind', kind);
    if (chapterId) formData.set('chapterId', chapterId);
    if (isSpoiler) formData.set('isSpoiler', 'on');
    if (kind === 'quote') formData.set('quoteStyle', quoteStyle);
    if (kind === 'text' && image) formData.set('image', image, image.type === 'image/gif' ? 'foto.gif' : 'foto.jpg');
    const quoteBody = body.trim();

    startTransition(async () => {
      if (kind === 'quote') {
        // La misma tarjeta que ya se ve en la vista previa, ahora se sube
        // junto con la cita — así el feed la muestra en el formato real que
        // se eligió, en vez de recrearla con el tratamiento genérico. Si
        // falla (por ejemplo, la portada no cargó por CORS), la cita se
        // publica igual, solo que sin la imagen guardada.
        try {
          const blob = await renderQuoteCard({ style: quoteStyle, quoteText: quoteBody, book, clubName, personName });
          formData.set('quoteImage', blob, 'cita.jpg');
        } catch {
          // sigue sin la imagen.
        }
      }
      const result = await postComment(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      if (kind === 'quote') {
        setPublished({ body: quoteBody, style: result.quoteStyle ?? quoteStyle, imageUrl: result.quoteImageUrl ?? null });
      } else {
        setBody('');
        removeImage();
        formRef.current?.reset();
      }
    });
  }

  function publishAnother() {
    setPublished(null);
    setIsSpoiler(false);
    setBody('');
    formRef.current?.reset();
  }

  if (published) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Icon name="check-circle" size={16} color="var(--success)" />
          Cita publicada
        </div>
        <DownloadQuoteImageButton
          style={published.style}
          quoteText={published.body}
          book={book}
          clubName={clubName}
          personName={personName}
          imageUrl={published.imageUrl}
          variant="primary"
          size="md"
          label="Descargar imagen para Instagram"
        />
        <Button variant="secondary" size="sm" type="button" onClick={publishAnother}>
          Publicar otra
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 14, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Chip selected={kind === 'text'} onClick={() => setKind('text')}>Comentario</Chip>
        <Chip selected={kind === 'quote'} onClick={() => setKind('quote')}>Cita destacada</Chip>
      </div>
      <Textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === 'quote' ? 'Escribe una cita destacada...' : '¿Qué te pareció este tramo del libro?'}
        rows={3}
      />
      {kind === 'quote' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Estilo de la tarjeta
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {QUOTE_STYLES.map((s) => (
                <StyleSwatch key={s.id} id={s.id} label={s.label} selected={quoteStyle === s.id} onSelect={setQuoteStyle} coverUrl={book?.cover_url} />
              ))}
            </div>
          </div>
          <QuoteCardPreview style={quoteStyle} quoteText={body} book={book} clubName={clubName} personName={personName} />
        </div>
      )}
      {kind === 'text' && (
        <div>
          {imagePreviewUrl ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local de un blob recién elegido, no una URL persistida. */}
              <img src={imagePreviewUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Quitar la foto"
                style={{
                  position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--neutral-900)', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="x" size={12} color="#fff" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-default)', background: 'none', color: 'var(--text-secondary)',
                fontSize: 'var(--fs-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Icon name="image-plus" size={15} />
              Agregar foto o GIF
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePickImage}
            style={{ display: 'none' }}
          />
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} />
        Contiene spoilers
      </label>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
          {error}
        </div>
      )}
      <Button variant="primary" size="md" type="submit" disabled={pending}>
        {pending ? 'Publicando...' : 'Publicar'}
      </Button>
    </form>
  );
}
