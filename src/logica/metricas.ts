// Métricas por área para el panel del docente: orden de elección, puntos,
// tiempo del minijuego y precisión. Funciones puras.

import { HUB, escenasPorId } from '../data/guion';
import { NOMBRE_HABILIDAD, type EstadoAlumno, type Habilidad } from '../types/game';
import { duracionSegundos, formatearSegundos } from './puntuacion';

export interface MetricaArea {
  area: Habilidad;
  /** Posición en la que se eligió (1–5). */
  orden: number;
  puntos: number;
  minijuego: string;
  /** Segundos que tardó en decidir en el hub. */
  decisionS: number | null;
  /** Segundos dentro del minijuego (null si aún no lo ha terminado). */
  tiempoS: number | null;
  /** Eficiencia 0–100 (null si aún no lo ha terminado). */
  precision: number | null;
  intentos: number;
  conductas: string[];
}

export function metricasPorArea(estado: Pick<EstadoAlumno, 'historial'>): MetricaArea[] {
  const hub = HUB;
  if (!hub) return [];
  const resultado: MetricaArea[] = [];
  estado.historial.forEach((r, i) => {
    if (r.escenaId !== hub.id || r.area === undefined || r.orden === undefined) return;
    const opcion = hub.opciones.find((o) => o.id === r.opcionId);
    const juego = opcion ? estado.historial.slice(i + 1).find((x) => x.escenaId === opcion.escena) : undefined;
    resultado.push({
      area: r.area,
      orden: r.orden,
      puntos: r.puntos ?? 0,
      minijuego: opcion ? (escenasPorId.get(opcion.escena)?.titulo ?? opcion.escena) : '',
      decisionS: r.tiempoRespuestaMs !== undefined ? Math.round(r.tiempoRespuestaMs / 1000) : null,
      tiempoS: juego?.tiempoRespuestaMs !== undefined ? Math.round(juego.tiempoRespuestaMs / 1000) : null,
      precision: juego?.precision ?? null,
      intentos: juego?.intentos ?? 0,
      conductas: juego?.conductas ?? [],
    });
  });
  return resultado.sort((a, b) => a.orden - b.orden);
}

/** «1.º Lógica → 2.º Liderazgo → …» */
export function textoSecuencia(estado: Pick<EstadoAlumno, 'historial'>): string {
  return metricasPorArea(estado)
    .map((m) => `${m.orden}.º ${NOMBRE_HABILIDAD[m.area]}`)
    .join(' → ');
}

/** Precisión media de los minijuegos terminados (o null). */
export function precisionMedia(estado: Pick<EstadoAlumno, 'historial'>): number | null {
  const v = metricasPorArea(estado)
    .map((m) => m.precision)
    .filter((p): p is number => p !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Tiempo total de sesión formateado («—» si no ha terminado). */
export function tiempoTotalTexto(estado: EstadoAlumno): string {
  const s = duracionSegundos(estado);
  return s === null ? 'en curso' : formatearSegundos(s);
}
