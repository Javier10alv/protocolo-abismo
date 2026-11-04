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

/** Puntos máximos que una escena puede aportar a cada habilidad. */
export function maximoPorEscena(escenaId: string): Habilidades {
  const max = habilidadesACero();
  const escena = escenasPorId.get(escenaId);
  if (!escena) return max;
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
  if (!estado.finalizadaEn) return null;
  const ms = Date.parse(estado.finalizadaEn) - Date.parse(estado.iniciadaEn);
  return Math.max(0, Math.round(ms / 60000));
}
