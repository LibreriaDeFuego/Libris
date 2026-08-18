// Evita open redirects: solo aceptamos rutas internas ("/algo"), nunca URLs
// absolutas ni "//host", que el navegador interpreta como dominio externo.
export function safeNext(value) {
  const next = typeof value === 'string' ? value : undefined;
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
