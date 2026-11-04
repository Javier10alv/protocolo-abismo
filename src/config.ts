// Configuración global del juego.

/**
 * Código de verificación que el docente da a su clase para poder jugar.
 * OJO: al estar en el frontend, cualquiera que inspeccione el código puede verlo.
 * Sirve para filtrar accesos casuales en el aula, no como seguridad real.
 * Si se configura Supabase, la protección real de los datos la dan las políticas RLS.
 */
export const CODIGO_DOCENTE = 'ABISMO2026';

/** Normaliza el código escrito por el alumno (sin espacios y en mayúsculas). */
export function codigoValido(codigo: string): boolean {
  return codigo.trim().toUpperCase().replace(/\s+/g, '') === CODIGO_DOCENTE;
}

/** Normaliza un nombre para compararlo (sin tildes, espacios extra ni mayúsculas). */
export function normalizarNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}
