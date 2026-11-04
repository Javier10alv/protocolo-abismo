// Tipos compartidos del juego. Reflejan escenas.json y estado-alumno.schema.json.

export const HABILIDADES = [
  'logica',
  'creatividad',
  'comunicacion',
  'resiliencia',
  'liderazgo',
] as const;

export type Habilidad = (typeof HABILIDADES)[number];
export type Habilidades = Record<Habilidad, number>;

/** Valor de `siguienteEscena` / `escenaActual` que marca el final de la partida. */
export const FIN = 'FIN';

export interface Opcion {
  id: string;
  textoBoton: string;
  modificadores: Partial<Habilidades>;
  /** id de la siguiente escena o 'FIN'. */
  siguienteEscena: string;
}

export interface Scene {
  id: string;
  titulo: string;
  imagen: string;
  altImagen: string;
  textoNarrativo: string;
  opciones: Opcion[];
}

export interface RegistroDecision {
  escenaId: string;
  opcionId: string;
  timestamp: string;
  /** Telemetría opcional: no puntúa en el MVP. */
  tiempoRespuestaMs?: number;
}

/** Objeto que se envía al backend. Debe validar contra estado-alumno.schema.json. */
export interface EstadoAlumno {
  version: string;
  partidaId: string;
  alumnoCodigo: string;
  claseId: string;
  escenaActual: string;
  habilidades: Habilidades;
  historial: RegistroDecision[];
  completada: boolean;
  iniciadaEn: string;
  finalizadaEn: string | null;
}
