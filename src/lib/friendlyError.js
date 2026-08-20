// Convierte errores técnicos de Supabase/Postgres en mensajes que un usuario
// no técnico puede entender. Si el error ya viene con un mensaje pensado
// para mostrarse (por ejemplo, los que lanzan nuestros triggers en español),
// se deja pasar tal cual.
export function friendlyDbError(error) {
  if (!error) return null;
  if (error.message?.includes('row-level security')) {
    return 'No tenés permiso para hacer esto — hablá con un administrador del club.';
  }
  return error.message;
}
