import escenasJson from './escenas.json';
import { NOMBRE_HABILIDAD, type EscenaHub, type EstadoAlumno, type Opcion, type OpcionHub, type Resultado, type Scene } from '../types/game';

/** Versión del guion. Súbela cada vez que cambies escenas.json. */
export const VERSION_GUION = '4.0.0';

// El JSON no conserva los tipos literales ('decision' | 'minijuego' | 'hub'); `npm run validar`
// comprueba en tiempo de ejecución que el contenido cumple estos tipos.
export const escenas = escenasJson as Scene[];

export const ESCENA_INICIAL = escenas[0].id; // 'esc_01_hub'

/** Búsqueda O(1) de una escena por id. */
export const escenasPorId: ReadonlyMap<string, Scene> = new Map(
  escenas.map((escena) => [escena.id, escena]),
);

/** El hub central del guion (hay uno). */
export const HUB = escenas.find((e): e is EscenaHub => e.tipo === 'hub');

/** Opciones o resultados de una escena con modificadores (el hub no tiene: puntúa por orden). */
export function eleccionesDe(escena: Scene): (Opcion | Resultado)[] {
  if (escena.tipo === 'decision') return escena.opciones;
  if (escena.tipo === 'minijuego') return escena.resultados;
  return [];
}

/** Escenas a las que se puede ir desde una escena. */
export function siguientesDe(escena: Scene): string[] {
  if (escena.tipo === 'hub') return [...escena.opciones.map((o) => o.escena), escena.siguienteEscena];
  return eleccionesDe(escena).map((e) => e.siguienteEscena);
}

/** Busca el texto legible de una elección (opción, resultado u opción del hub) para el docente. */
export function describirEleccion(escenaId: string, eleccionId: string): string {
  const escena = escenasPorId.get(escenaId);
  if (!escena) return eleccionId;
  if (escena.tipo === 'hub') {
    const o = escena.opciones.find((x) => x.id === eleccionId);
    return o ? `Eligió atender: ${NOMBRE_HABILIDAD[o.area]}` : eleccionId;
  }
  if (escena.tipo === 'decision') {
    return escena.opciones.find((o) => o.id === eleccionId)?.textoBoton ?? eleccionId;
  }
  return escena.resultados.find((r) => r.id === eleccionId)?.descripcion ?? eleccionId;
}

/** Opciones del hub ya elegidas en esta partida, en orden. */
export function opcionesHechas(estado: Pick<EstadoAlumno, 'historial'>, hub: EscenaHub | undefined = HUB): OpcionHub[] {
  if (!hub) return [];
  return estado.historial
    .filter((r) => r.escenaId === hub.id)
    .map((r) => hub.opciones.find((o) => o.id === r.opcionId))
    .filter((o): o is OpcionHub => !!o);
}

/**
 * Progreso de la partida (0–1): áreas del hub completadas más la escena final.
 * Un área cuenta como completada cuando se ha terminado su minijuego.
 */
export function progresoDe(estado: Pick<EstadoAlumno, 'historial' | 'escenaActual' | 'completada'>): number {
  if (!HUB) return 0;
  const total = HUB.opciones.length + 1;
  if (estado.completada) return 1;
  const minijuegos = new Set(HUB.opciones.map((o) => o.escena));
  const hechos = estado.historial.filter((r) => minijuegos.has(r.escenaId)).length;
  const enFinal = estado.escenaActual === HUB.siguienteEscena ? 1 : 0;
  return Math.min(1, (hechos + enFinal) / total);
}
