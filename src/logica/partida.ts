// Transiciones puras de una partida. El store las envuelve; la simulación y el
// validador las usan directamente.

import { ESCENA_INICIAL, VERSION_GUION, escenasPorId, opcionesHechas } from '../data/guion';
import {
  FIN,
  type EscenaHub,
  type EstadoAlumno,
  type Opcion,
  type RegistroDecision,
  type Resultado,
  type ResultadoMecanica,
} from '../types/game';
import { habilidadesACero, puntosPorOrden, sumarModificadores } from './puntuacion';

function uuid(): string {
  return crypto.randomUUID();
}

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';

/** ID seudónimo corto y legible (p. ej. «K7Q2-M4X9»), sin letras ni números confundibles. */
export function generarIdAlumno(azar: () => number = Math.random): string {
  const c = () => (azar() < 0.5 ? LETRAS[Math.floor(azar() * LETRAS.length)] : DIGITOS[Math.floor(azar() * DIGITOS.length)]);
  return `${c()}${c()}${c()}${c()}-${c()}${c()}${c()}${c()}`;
}

export function crearEstadoInicial(
  alumnoNombre = 'Anónimo',
  claseId = 'DEMO',
  ahora = new Date(),
  alumnoCodigo = generarIdAlumno(),
): EstadoAlumno {
  return {
    version: VERSION_GUION,
    partidaId: uuid(),
    alumnoCodigo,
    alumnoNombre,
    claseId,
    escenaActual: ESCENA_INICIAL,
    habilidades: habilidadesACero(),
    historial: [],
    completada: false,
    iniciadaEn: ahora.toISOString(),
    finalizadaEn: null,
  };
}

function avanzar(
  estado: EstadoAlumno,
  eleccion: Opcion | Resultado,
  registro: Omit<RegistroDecision, 'escenaId' | 'opcionId' | 'timestamp'>,
  ahora: Date,
): EstadoAlumno {
  const esFinal = eleccion.siguienteEscena === FIN;
  const marca = ahora.toISOString();
  return {
    ...estado,
    habilidades: sumarModificadores(estado.habilidades, eleccion.modificadores),
    historial: [
      ...estado.historial,
      { escenaId: estado.escenaActual, opcionId: eleccion.id, timestamp: marca, ...registro },
    ],
    escenaActual: eleccion.siguienteEscena,
    completada: esFinal,
    finalizadaEn: esFinal ? marca : null,
  };
}

/** Aplica una opción de una escena de decisión. Devuelve null si no es válida aquí. */
export function aplicarOpcion(
  estado: EstadoAlumno,
  opcionId: string,
  tiempoRespuestaMs: number,
  ahora = new Date(),
): EstadoAlumno | null {
  if (estado.completada) return null;
  const escena = escenasPorId.get(estado.escenaActual);
  if (escena?.tipo !== 'decision') return null;
  const opcion = escena.opciones.find((o) => o.id === opcionId);
  if (!opcion) return null;
  return avanzar(estado, opcion, { tiempoRespuestaMs: Math.max(0, Math.round(tiempoRespuestaMs)) }, ahora);
}

/**
 * Elige un área en el hub: suma los puntos de su posición (10, 7, 5, 3, 1) y abre
 * su minijuego. Devuelve null si la opción no existe o ya se hizo.
 */
export function aplicarOpcionHub(
  estado: EstadoAlumno,
  opcionId: string,
  tiempoRespuestaMs: number,
  ahora = new Date(),
): EstadoAlumno | null {
  if (estado.completada) return null;
  const hub = escenasPorId.get(estado.escenaActual);
  if (hub?.tipo !== 'hub') return null;
  const opcion = hub.opciones.find((o) => o.id === opcionId);
  const hechas = opcionesHechas(estado, hub);
  if (!opcion || hechas.some((o) => o.id === opcionId)) return null;
  const orden = hechas.length + 1;
  const puntos = puntosPorOrden(orden);
  return {
    ...estado,
    habilidades: sumarModificadores(estado.habilidades, { [opcion.area]: puntos }),
    historial: [
      ...estado.historial,
      {
        escenaId: hub.id,
        opcionId: opcion.id,
        timestamp: ahora.toISOString(),
        tiempoRespuestaMs: Math.max(0, Math.round(tiempoRespuestaMs)),
        area: opcion.area,
        orden,
        puntos,
      },
    ],
    escenaActual: opcion.escena,
  };
}

/** Sale del hub cuando ya se han completado todas las áreas. */
export function salirDelHub(estado: EstadoAlumno, ahora = new Date()): EstadoAlumno | null {
  if (estado.completada) return null;
  const hub = escenasPorId.get(estado.escenaActual);
  if (hub?.tipo !== 'hub' || !hubCompletado(estado, hub)) return null;
  const esFinal = hub.siguienteEscena === FIN;
  return {
    ...estado,
    escenaActual: hub.siguienteEscena,
    completada: esFinal,
    finalizadaEn: esFinal ? ahora.toISOString() : null,
  };
}

export function hubCompletado(estado: Pick<EstadoAlumno, 'historial'>, hub: EscenaHub): boolean {
  return opcionesHechas(estado, hub).length >= hub.opciones.length;
}

/** Aplica el desenlace de un minijuego. Devuelve null si la clave no existe en la escena. */
export function aplicarMinijuego(
  estado: EstadoAlumno,
  resultado: ResultadoMecanica,
  tiempoRespuestaMs: number,
  ahora = new Date(),
): EstadoAlumno | null {
  if (estado.completada) return null;
  const escena = escenasPorId.get(estado.escenaActual);
  if (escena?.tipo !== 'minijuego') return null;
  const r = escena.resultados.find((x) => x.clave === resultado.clave);
  if (!r) return null;
  return avanzar(
    estado,
    r,
    {
      tiempoRespuestaMs: Math.max(0, Math.round(tiempoRespuestaMs)),
      conductas: [...new Set(resultado.conductas)],
      intentos: Math.max(0, Math.round(resultado.intentos)),
      ayudaRecibida: resultado.ayudaRecibida,
      precision: Math.max(0, Math.min(100, Math.round(resultado.precision))),
    },
    ahora,
  );
}
