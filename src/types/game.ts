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
  'sonar',
  'secuencia',
  'energia',
  'tuberias',
  'cultivo',
  'evacuacion',
  'sos',
  'ondas',
  'especie',
  'frecuencias',
  'guiar',
] as const;

export type Mecanica = (typeof MECANICAS)[number];

export type Personaje = 'lisa' | 'leo' | 'reyes' | 'aris';

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

export interface Subtitulo {
  /** Segundos desde el inicio del vídeo. */
  desde: number;
  hasta: number;
  texto: string;
  /** Si lo dice un personaje; si no, es un rótulo del sistema. */
  personaje?: Personaje;
}

/** Vídeo que se reproduce una vez antes de mostrar la escena. */
export interface Cinematica {
  src: string;
  /** Descripción para lectores de pantalla. */
  descripcion: string;
  subtitulos?: Subtitulo[];
}

/** Vídeo silencioso en bucle que sustituye a la imagen de fondo. */
export interface FondoVideo {
  src: string;
  /** Segundo desde el que se repite el bucle (p. ej. el final de la cinemática). */
  bucleDesde: number;
}

interface EscenaBase {
  id: string;
  titulo: string;
  imagen: string;
  altImagen: string;
  /** Máximo 3 líneas. */
  textoNarrativo: string;
  /** Personajes presentes: se dibujan como sprites sobre el fondo. */
  personajes?: Personaje[];
  /** Vídeos que se reproducen en orden (una sola vez por partida) antes de la escena. */
  cinematicas?: Cinematica[];
  fondoVideo?: FondoVideo;
  /** El fondo ya dibuja a los personajes: no se superponen sprites. */
  spritesEnFondo?: boolean;
}

export interface EscenaDecision extends EscenaBase {
  tipo: 'decision';
  opciones: Opcion[];
  /** Escena de reflexión: sus opciones no suman puntos (modificadores vacíos). */
  sinPuntuacion?: boolean;
}

export interface LineaDialogo {
  personaje: Personaje;
  texto: string;
}

/** Opción del hub: abre el minijuego de un área. */
export interface OpcionHub {
  id: string;
  area: Habilidad;
  textoBoton: string;
  /** Escena (minijuego) que se abre. Sus resultados vuelven al hub. */
  escena: string;
}

/**
 * Hub central: el alumno elige un área, juega su minijuego y vuelve aquí.
 * La opción hecha desaparece y se repite hasta completar todas. El orden de
 * elección puntúa con PESOS_ORDEN (10, 7, 5, 3, 1).
 */
export interface EscenaHub extends EscenaBase {
  tipo: 'hub';
  /** Diálogo de presentación, línea a línea (los personajes entran al hablar). */
  introduccion: LineaDialogo[];
  /** Pregunta que abre el menú la primera vez. */
  pregunta: LineaDialogo;
  /** Preguntas al volver; se usa la del número de áreas ya hechas (1.ª vuelta, 2.ª…). */
  preguntasRetorno: LineaDialogo[];
  /** Despedida al completar todas las áreas. */
  cierre: LineaDialogo;
  /** Lo que dice un personaje cuando el alumno vuelve de un reto sin terminarlo (retirada estratégica). */
  lineaRetirada: LineaDialogo;
  opciones: OpcionHub[];
  /** A dónde se va al completar todas las áreas. */
  siguienteEscena: string;
}

export interface EscenaMinijuego extends EscenaBase {
  tipo: 'minijuego';
  mecanica: Mecanica;
  /** Instrucción breve que se muestra encima de la mecánica. */
  instruccion: string;
  resultados: Resultado[];
  /** Reto final: sus resultados no suman puntos de prioridad (modificadores vacíos). */
  sinPuntuacion?: boolean;
}

export type Scene = EscenaDecision | EscenaMinijuego | EscenaHub;

/** Evento de telemetría de un minijuego. Es la materia prima de los indicadores. */
export interface EventoJuego {
  /** Segundos desde que empezó el minijuego (1 decimal). */
  t: number;
  /** accion, fallo, ayuda, presion, tiempo_agotado, objeto, explorar, recoger, retirada, insight, sjt… */
  tipo: string;
  datos?: Record<string, string | number | boolean>;
}

/** Indicadores observados (0–1), con las claves de la matriz de especificación. */
export type Indicadores = Record<string, number>;

/** Objeto recogido en una sala y guardado en el inventario. */
export interface ObjetoRecogido {
  id: string;
  /** Escena (sala) donde se recogió. */
  escenaId: string;
  timestamp: string;
}

/** Lo que devuelve una mecánica al terminar. */
export interface ResultadoMecanica {
  clave: string;
  /** Comportamientos observados (claves de ETIQUETAS_CONDUCTA). */
  conductas: string[];
  /** Intentos fallidos antes de resolver. Fallar no penaliza. */
  intentos: number;
  /** true si un personaje ayudó tras 3 intentos. */
  ayudaRecibida: boolean;
  /** Eficiencia en el minijuego (0–100). Métrica para el docente: no suma puntos. */
  precision: number;
  /** Indicadores propios de la mecánica (0–1). Los generales se calculan a partir de los eventos. */
  indicadores?: Indicadores;
  /** Lo añade el motor: eventos registrados durante el minijuego. */
  eventos?: EventoJuego[];
  /** Frase extra para el cierre, adaptada a lo que hizo el alumno. */
  notaCierre?: string;
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
  /** Solo minijuegos: eficiencia 0–100. */
  precision?: number;
  /** Solo elecciones del hub: área elegida, posición (1.ª, 2.ª…) y puntos ganados. */
  area?: Habilidad;
  orden?: number;
  puntos?: number;
  /** Solo minijuegos: indicadores (0–1) y eventos registrados. */
  indicadores?: Indicadores;
  eventos?: EventoJuego[];
  /** Minijuego abandonado a medias para volver a la sala de control (retirada estratégica). */
  retirada?: boolean;
  /** Elección del hub que retoma un reto aplazado (no suma puntos de prioridad). */
  reanudacion?: boolean;
}

/** Objeto que se envía al backend. Debe validar contra estado-alumno.schema.json. */
export interface EstadoAlumno {
  version: string;
  partidaId: string;
  /** ID único y seudónimo del alumno (se genera al entrar). Es lo que se usa en análisis y exportaciones. */
  alumnoCodigo: string;
  /** Nombre completo. Dato personal: solo se muestra al docente y nunca se envía a la IA. */
  alumnoNombre: string;
  claseId: string;
  escenaActual: string;
  habilidades: Habilidades;
  historial: RegistroDecision[];
  /** Objetos recogidos en las salas. */
  inventario: ObjetoRecogido[];
  completada: boolean;
  iniciadaEn: string;
  finalizadaEn: string | null;
}
