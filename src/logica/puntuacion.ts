// Funciones puras de puntuación y normalización. Las usan el store, el panel del
// docente, la simulación y el validador del guion.

import { eleccionesDe, escenasPorId } from '../data/guion';
import {
  HABILIDADES,
  type EstadoAlumno,
  type Habilidad,
  type Habilidades,
  type Opcion,
  type Resultado,
} from '../types/game';

export const habilidadesACero = (): Habilidades => ({
  logica: 0,
  creatividad: 0,
  comunicacion: 0,
  resiliencia: 0,
  liderazgo: 0,
});

export function sumarModificadores(
  base: Habilidades,
  modificadores: Partial<Habilidades>,
): Habilidades {
  const total = { ...base };
  for (const h of HABILIDADES) total[h] += modificadores[h] ?? 0;
  return total;
}

/**
 * Puntos del hub según el orden de elección: la 1.ª área elegida suma 10, la 2.ª 7,
 * la 3.ª 5, la 4.ª 3 y la 5.ª 1. Mide las prioridades naturales ante una crisis.
 */
export const PESOS_ORDEN = [10, 7, 5, 3, 1] as const;

export function puntosPorOrden(orden: number): number {
  return PESOS_ORDEN[orden - 1] ?? 0;
}

/** Puntos máximos que una escena puede aportar a cada habilidad. */
export function maximoPorEscena(escenaId: string): Habilidades {
  const max = habilidadesACero();
  const escena = escenasPorId.get(escenaId);
  if (!escena) return max;
  if (escena.tipo === 'hub') {
    // Cualquier área puede elegirse la primera: su máximo es el peso de la 1.ª posición.
    for (const o of escena.opciones) max[o.area] = Math.max(max[o.area], PESOS_ORDEN[0]);
    return max;
  }
  for (const e of eleccionesDe(escena) as (Opcion | Resultado)[]) {
    for (const h of HABILIDADES) max[h] = Math.max(max[h], e.modificadores[h] ?? 0);
  }
  return max;
}

/**
 * Máximo alcanzable de cada habilidad sobre las escenas visitadas.
 * Con ramas, cada alumno se compara solo con lo que pudo conseguir en su camino.
 */
export function maximosAlcanzables(escenaIds: readonly string[]): Habilidades {
  let total = habilidadesACero();
  for (const id of new Set(escenaIds)) total = sumarModificadores(total, maximoPorEscena(id));
  return total;
}

/** Porcentaje (0–100) de cada habilidad respecto a su máximo alcanzable. */
export function porcentajes(estado: Pick<EstadoAlumno, 'habilidades' | 'historial'>): Habilidades {
  const max = maximosAlcanzables(estado.historial.map((h) => h.escenaId));
  const pct = habilidadesACero();
  for (const h of HABILIDADES) {
    pct[h] = max[h] > 0 ? Math.round((estado.habilidades[h] / max[h]) * 100) : 0;
  }
  return pct;
}

/** Habilidades ordenadas de mayor a menor porcentaje. */
export function ordenarHabilidades(pct: Habilidades): Habilidad[] {
  return [...HABILIDADES].sort((a, b) => pct[b] - pct[a]);
}

/** Duración de una partida en minutos (o null si no ha terminado). */
export function duracionMinutos(estado: EstadoAlumno): number | null {
  const s = duracionSegundos(estado);
  return s === null ? null : Math.round(s / 60);
}

/** Duración total de la sesión en segundos (o null si no ha terminado). */
export function duracionSegundos(estado: EstadoAlumno): number | null {
  if (!estado.finalizadaEn) return null;
  return Math.max(0, Math.round((Date.parse(estado.finalizadaEn) - Date.parse(estado.iniciadaEn)) / 1000));
}

/** Formatea segundos como «4 min 05 s» o «38 s». */
export function formatearSegundos(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return m > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

/** Secuencia de áreas elegidas en el hub, en orden, con sus puntos. */
export function secuenciaElecciones(estado: Pick<EstadoAlumno, 'historial'>): { area: Habilidad; orden: number; puntos: number }[] {
  return estado.historial
    .filter((r): r is typeof r & { area: Habilidad; orden: number } => r.area !== undefined && r.orden !== undefined)
    .map((r) => ({ area: r.area, orden: r.orden, puntos: r.puntos ?? puntosPorOrden(r.orden) }));
}
