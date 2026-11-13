// El dominio real de Libris — el mismo al que apunta assetlinks.json y la
// app de Android (ver android/twa-manifest.json), NO window.location.origin.
// Un link armado con el origin actual del navegador reproduce, en todo
// nuevo link compartido, el mismo problema que ya tuvimos con la sesión:
// si quien lo genera está parado en el alias que pone Vercel solo
// (libris-relea.vercel.app) en vez de en este dominio, cualquiera que lo
// abra termina con una sesión atada a ESE dominio, no a este — entrar
// alguna vez por un link así y otras veces por acá deja dos sesiones que
// se "olvidan" entre sí. Hardcodeado a propósito, no una env var: es un
// dato fijo del proyecto, no algo que cambie por entorno (dev sigue
// funcionando igual — este valor solo se usa para armar el TEXTO del link
// a compartir, nunca para decidir a dónde navega la propia pestaña).
export const SITE_URL = 'https://libris.cl';
