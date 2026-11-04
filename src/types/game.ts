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

export const NOMBRE_HABILIDAD: Record<Habilidad, string> = {
  logica: 'Lógica',
  creatividad: 'Creatividad',
  comunicacion: 'Comunicación',
  resiliencia: 'Resiliencia',
  liderazgo: 'Liderazgo',
};

/** Valor de `siguienteEscena` / `escenaActual` que marca el final de la partida. */
export const FIN = 'FIN';

export const MECANICAS = [
  'cableado',
  'conversacion',
  'reparto',
  'inventario',
  'sonar',
  'secuencia',
  'energia',
] as const;

export type Mecanica = (typeof MECANICAS)[number];

export type Personaje = 'irene' | 'leo';

/** Una opción de una escena de decisión. */
export interface Opcion {
  id: string;
  textoBoton: string;
  modificadores: Partial<Habilidades>;
  /** id de la siguiente escena o 'FIN'. */
  siguienteEscena: string;
}

/**
 * Desenlace posible de un minijuego. La mecánica decide qué `clave` corresponde
 * según el comportamiento del alumno (nunca según velocidad ni precisión).
 */
export interface Resultado {
  id: string;
  clave: string;
  /** Descripción para el docente: qué comportamiento indica este desenlace. */
  descripcion: string;
  /** Texto narrativo que lee el alumno al terminar (sin puntuaciones). */
  textoCierre: string;
  modificadores: Partial<Habilidades>;
  siguienteEscena: string;
}

interface EscenaBase {
  id: string;
  titulo: string;
  imagen: string;
  altImagen: string;
  /** Máximo 3 líneas. */
  textoNarrativo: string;
  personajes?: Personaje[];
}

export interface EscenaDecision extends EscenaBase {
  tipo: 'decision';
  opciones: Opcion[];
}

export interface EscenaMinijuego extends EscenaBase {
  tipo: 'minijuego';
  mecanica: Mecanica;
  /** Instrucción breve que se muestra encima de la mecánica. */
  instruccion: string;
  resultados: Resultado[];
}

export type Scene = EscenaDecision | EscenaMinijuego;

/** Lo que devuelve una mecánica al terminar. */
export interface ResultadoMecanica {
  clave: string;
  /** Comportamientos observados (claves de ETIQUETAS_CONDUCTA). */
  conductas: string[];
  /** Intentos fallidos antes de resolver. Fallar no penaliza. */
  intentos: number;
  /** true si un personaje ayudó tras 3 intentos. */
  ayudaRecibida: boolean;
}

export interface RegistroDecision {
  escenaId: string;
  /** id de la opción elegida o del resultado del minijuego. */
  opcionId: string;
  timestamp: string;
  /** Telemetría: no puntúa. */
  tiempoRespuestaMs?: number;
  conductas?: string[];
  intentos?: number;
  ayudaRecibida?: boolean;
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
