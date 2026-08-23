// Reglas del nombre de usuario, compartidas entre el registro, "Editar
// perfil" y la pantalla de "Elegí tu usuario" — minúsculas, letras, números,
// guion bajo y punto, 3 a 20 caracteres. No puede empezar ni terminar con
// punto, ni tener dos seguidos (evita nombres como ".nico" o "nico..ferreyra").
// Se normaliza siempre igual (recortado y en minúsculas) antes de comparar o guardar.
export const USERNAME_PATTERN = /^(?!.*\.\.)[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$/;

export function normalizeUsername(value) {
  return (value ?? '').toString().trim().toLowerCase();
}

export function isValidUsername(value) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export const USERNAME_HELP = 'Usa entre 3 y 20 letras minúsculas, números, guion bajo o punto, sin espacios. No puede empezar, terminar, ni tener dos puntos seguidos.';

// Cookie liviana que evita, en el middleware, tener que consultar la base en
// cada request para saber si ya se eligió un username — una vez que existe,
// se salta esa consulta para siempre (hasta que se borren las cookies).
export const USERNAME_COOKIE = 'libris_username_set';

