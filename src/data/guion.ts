import escenasJson from './escenas.json';
import type { Opcion, Resultado, Scene } from '../types/game';

/** Versión del guion. Súbela cada vez que cambies escenas.json. */
export const VERSION_GUION = '2.0.0';

// El JSON no conserva los tipos literales ('decision' | 'minijuego'); `npm run validar`
// comprueba en tiempo de ejecución que el contenido cumple estos tipos.
export const escenas = escenasJson as Scene[];

export const ESCENA_INICIAL = escenas[0].id; // 'esc_01_despertar'

/** Búsqueda O(1) de una escena por id. */
export const escenasPorId: ReadonlyMap<string, Scene> = new Map(
  escenas.map((escena) => [escena.id, escena]),
);

/** Opciones o resultados de una escena (lo que puede elegirse/alcanzarse en ella). */
export function eleccionesDe(escena: Scene): (Opcion | Resultado)[] {
  return escena.tipo === 'decision' ? escena.opciones : escena.resultados;
}

/** Busca el texto legible de una elección (opción o resultado) para el docente. */
export function describirEleccion(escenaId: string, eleccionId: string): string {
  const escena = escenasPorId.get(escenaId);
  if (!escena) return eleccionId;
  if (escena.tipo === 'decision') {
    return escena.opciones.find((o) => o.id === eleccionId)?.textoBoton ?? eleccionId;
  }
  return escena.resultados.find((r) => r.id === eleccionId)?.descripcion ?? eleccionId;
}

/** Etapa narrativa (01–10) a partir del id `esc_NN_nombre`. Sirve para la barra de progreso. */
export function etapaDe(escenaId: string): number {
  const m = /^esc_(\d{2})_/.exec(escenaId);
  return m ? Number(m[1]) : 0;
}

export const TOTAL_ETAPAS = Math.max(...escenas.map((e) => etapaDe(e.id)));
