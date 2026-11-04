// Transiciones puras de una partida. El store las envuelve; la simulación y el
// validador las usan directamente.

import { ESCENA_INICIAL, VERSION_GUION, escenasPorId } from '../data/guion';
import {
  FIN,
  type EstadoAlumno,
  type Opcion,
  type RegistroDecision,
  type Resultado,
  type ResultadoMecanica,
} from '../types/game';
import { habilidadesACero, sumarModificadores } from './puntuacion';

function uuid(): string {
  return crypto.randomUUID();
}

export function crearEstadoInicial(
  alumnoCodigo = 'ANON',
  claseId = 'DEMO',
  ahora = new Date(),
): EstadoAlumno {
  return {
    version: VERSION_GUION,
    partidaId: uuid(),
    alumnoCodigo,
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
    },
    ahora,
  );
}
