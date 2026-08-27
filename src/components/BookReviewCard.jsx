// El bloque de "reseña final": el título y el texto de la reseña, dentro
// del mismo panel de color, y fundida con él (mismo mecanismo que el
// mockup "Identidad de Citas" — colapsando el espacio entre los dos con un
// margin-top negativo), la portada del libro flotando chica con una
// sombra proyectada en diagonal y un brillo de luz por encima. La portada
// es la que ya tiene el libro en el club — no una foto que suba la
// persona — así que cualquier proporción de tapa se ve completa: el
// ancho/alto salen del propio tamaño natural de la imagen (max-width/
// max-height, sin recortarla ni deformarla).
//
// Lo usan tanto ActivityCard (Inicio y Perfil) como ComentariosScreen y la
// vista previa en vivo de FinalReviewModal, al declarar un libro
// terminado. El texto se ve hasta 5 líneas; "expanded" lo despliega
// completo (lo maneja quien use el componente, tocando la tarjeta).
const REVIEW_SHADOW = [
  '-1px 3px 0 rgba(20,16,4,0.36)',
  '-5px 10px 4px rgba(20,16,4,0.33)',
  '-14px 22px 11px rgba(20,16,4,0.29)',
  '-27px 41px 20px rgba(20,16,4,0.24)',
  '-47px 66px 33px rgba(20,16,4,0.19)',
  '-71px 96px 47px rgba(20,16,4,0.14)',
].join(', ');

const REVIEW_LIGHT = 'linear-gradient(210deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)';

export function BookReviewCard({ title, body, coverUrl, expanded = false }) {
  return (
    <div style={{ background: 'var(--gold-500)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <div style={{ padding: '28px 20px 44px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-2xl)', lineHeight: 1.18, color: 'var(--neutral-900)' }}>
          {title}
        </div>
        {body && (
          <div
            style={{
              fontSize: 'var(--fs-sm)', lineHeight: 1.55, color: 'rgba(27,27,31,0.82)', marginTop: 12,
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 5,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {body}
          </div>
        )}
      </div>
      <div style={{ marginTop: -20, padding: '0 20px 30px', display: 'flex', justifyContent: 'center' }}>
        {coverUrl ? (
          <div style={{ position: 'relative', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- portada de Storage, con proporción propia que solo se conoce en el navegador. */}
            <img
              src={coverUrl}
              alt=""
              style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: 190, maxHeight: 260, borderRadius: 4, boxShadow: REVIEW_SHADOW }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 4, mixBlendMode: 'soft-light', pointerEvents: 'none', background: REVIEW_LIGHT }} />
          </div>
        ) : (
          <div style={{ width: 150, height: 210, borderRadius: 4, background: 'var(--neutral-0)', opacity: 0.5 }} />
        )}
      </div>
    </div>
  );
}
