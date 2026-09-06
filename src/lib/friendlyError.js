// Convierte errores técnicos de Supabase/Postgres en mensajes que un usuario
// no técnico puede entender.
//
// Antes, cualquier error que no fuera de RLS se devolvía tal cual
// (error.message) — la idea era que "si no es RLS, ya debe venir con un
// mensaje pensado para mostrarse", pero eso solo es cierto para los pocos
// mensajes que nosotros mismos armamos a mano en los triggers de Postgres
// (KNOWN_DB_MESSAGES, abajo) — todo lo demás (una restricción única
// violada, un límite de tamaño de Storage, un problema de conexión, etc.)
// también cae en "no es RLS" y terminaba mostrando el string crudo del
// driver, muchas veces en inglés, en medio de una app toda en español. Acá
// también se enganchan los errores de Storage (uploadError) que antes se
// mostraban sin pasar por ninguna traducción.
const KNOWN_DB_MESSAGES = [
  'Este club ya tiene el máximo de 3 administradores.',
  'Este club se quedaría sin administradores. Nombra a otro administrador antes de salir.',
  'Este club se quedaría sin administradores. Nombra a otro administrador antes de sacarle el rol a este.',
];

export function friendlyDbError(error) {
  if (!error) return null;
  const message = error.message ?? '';
  if (message.includes('row-level security')) {
    return 'No tienes permiso para hacer esto — habla con un administrador del club.';
  }
  if (KNOWN_DB_MESSAGES.some((known) => message.includes(known))) {
    return message;
  }
  if (message.includes('exceeded the maximum allowed size')) {
    return 'El archivo es demasiado pesado.';
  }
  if (message.toLowerCase().includes('mime type') || message.includes('Bucket not found')) {
    return 'No pudimos subir el archivo. Probá con otro, o de nuevo en un momento.';
  }
  return 'Ocurrió un problema guardando los cambios. Intenta de nuevo.';
}

// Mismo espíritu que friendlyDbError, pero para errores de Supabase Auth
// (login/registro) — otro origen de errores en inglés, sin relación con
// RLS, que antes se mostraban crudos (error.message) en el formulario de
// login: el flujo más transitado de toda la app.
export function friendlyAuthError(error) {
  if (!error) return null;
  const message = error.message ?? '';
  if (message.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Todavía no confirmaste tu correo — revisa tu bandeja de entrada.';
  }
  if (message.includes('User already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (message.toLowerCase().includes('rate limit')) {
    return 'Demasiados intentos — espera un momento y vuelve a intentar.';
  }
  if (message.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return 'No pudimos completar la acción. Intenta de nuevo.';
}
