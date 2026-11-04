// Registro de mecánicas: qué desenlaces (claves) puede emitir cada una y qué
// comportamientos observa. Es lógica pura (sin React) para que la usen el store,
// el panel del docente, la simulación y el script de validación.

import type { Mecanica } from '../types/game';

export interface DefinicionMecanica {
  nombre: string;
  /** Qué observa la mecánica, explicado para el docente. */
  queObserva: string;
  /** Respaldo teórico en el que se inspira (para el docente). */
  fundamento?: string;
  /** Desenlaces que puede emitir. Deben coincidir con los `clave` del guion. */
  claves: readonly string[];
  /** Conductas típicas de cada desenlace (para la simulación de demo). */
  conductasTipicas: Record<string, string[]>;
}

export const MECANICAS_INFO: Record<Mecanica, DefinicionMecanica> = {
  cableado: {
    nombre: 'Cableado',
    queObserva: 'Si consulta información antes de actuar, si pide ayuda y si reintenta tras un fallo.',
    claves: ['colaborativo', 'persistente', 'metodico', 'experimental'],
    conductasTipicas: {
      colaborativo: ['pidio_ayuda'],
      persistente: ['reintento'],
      metodico: ['consulto_esquema'],
      experimental: ['probo_directamente'],
    },
  },
  conversacion: {
    nombre: 'Conversación',
    queObserva: 'El estilo comunicativo dominante ante un compañero con miedo.',
    claves: ['escucha', 'plan', 'ingenio'],
    conductasTipicas: {
      escucha: ['estilo_escucha'],
      plan: ['estilo_plan'],
      ingenio: ['estilo_ingenio'],
    },
  },
  sonar: {
    nombre: 'Sonar',
    queObserva: 'Si explora antes de actuar, si coordina la búsqueda y si persiste tras errores.',
    claves: ['coordinado', 'constante', 'explorador', 'intuitivo'],
    conductasTipicas: {
      coordinado: ['busqueda_coordinada'],
      constante: ['reintento'],
      explorador: ['exploro_antes'],
      intuitivo: ['actuo_con_poca_informacion'],
    },
  },
  secuencia: {
    nombre: 'Secuencia',
    queObserva: 'Si consulta las notas del equipo y cómo reacciona cuando el orden falla.',
    claves: ['consulta', 'persistente', 'analitico'],
    conductasTipicas: {
      consulta: ['leyo_notas'],
      persistente: ['reintento'],
      analitico: ['dedujo_sin_ayuda'],
    },
  },
  energia: {
    nombre: 'Reparto de energía',
    queObserva: 'Qué prioriza al gestionar recursos escasos y cómo se adapta si su plan no funciona.',
    claves: ['adaptable', 'conectado', 'equipo', 'prudente'],
    conductasTipicas: {
      adaptable: ['reintento'],
      conectado: ['priorizo_comunicaciones'],
      equipo: ['priorizo_iluminacion'],
      prudente: ['priorizo_margen'],
    },
  },
  tuberias: {
    nombre: 'Tuberías',
    queObserva: 'Si anticipa el recorrido completo antes de actuar, cómo reajusta tras un fallo y si pide consejo.',
    fundamento: 'Funciones ejecutivas: planificación y memoria de trabajo (Miyake et al., 2000). El reloj es solo narrativo: no puntúa.',
    claves: ['planificador', 'insistente', 'guiado'],
    conductasTipicas: {
      planificador: ['anticipo_recorrido'],
      insistente: ['reintento'],
      guiado: ['pidio_ayuda'],
    },
  },
  cultivo: {
    nombre: 'Cultivo hidropónico',
    queObserva: 'Fluidez (cuántas soluciones), flexibilidad (usos no convencionales) y originalidad con recursos limitados.',
    fundamento: 'Pensamiento divergente (Guilford, 1967) y creatividad bajo restricciones (Stokes, 2005).',
    claves: ['consultor', 'divergente', 'original', 'tenaz', 'practico'],
    conductasTipicas: {
      consultor: ['pidio_ideas'],
      divergente: ['exploro_alternativas'],
      original: ['uso_original'],
      tenaz: ['reintento'],
      practico: ['solucion_directa'],
    },
  },
  evacuacion: {
    nombre: 'Evacuación (delegación)',
    queObserva: 'Si reparte según las especialidades, si asume la tarea de riesgo, si consulta al equipo y si sobrecarga a alguien.',
    fundamento: 'Liderazgo situacional (Hersey y Blanchard, 1969) y liderazgo transformacional como modelo de rol (Bass, 1985).',
    claves: ['ejemplo', 'situacional', 'consenso', 'improvisado'],
    conductasTipicas: {
      ejemplo: ['asumio_tarea_dificil'],
      situacional: ['reparto_por_perfiles'],
      consenso: ['pregunto_equipo'],
      improvisado: ['reparto_no_convencional'],
    },
  },
  sos: {
    nombre: 'Protocolo S.O.S.',
    queObserva: 'Si el mensaje da la información justa y relevante (dónde, cuántos, qué necesitan) y cómo lo ajusta con la respuesta.',
    fundamento: 'Máximas de cantidad y relevancia de la comunicación cooperativa (Grice, 1975).',
    claves: ['directo', 'ajustado', 'asesorado'],
    conductasTipicas: {
      directo: ['mensaje_completo'],
      ajustado: ['reformulo_mensaje'],
      asesorado: ['pidio_consejo'],
    },
  },
  ondas: {
    nombre: 'Sintonía de ondas',
    queObserva: 'Cómo reacciona ante errores que no dependen de él: si persiste, si se autorregula con una pausa o si pide relevo.',
    fundamento: 'Tolerancia a la frustración (Rosenzweig, 1944) y perseverancia o grit (Duckworth, 2016). Los errores están provocados a propósito y se explican al final.',
    claves: ['perseverante', 'regulado', 'relevo'],
    conductasTipicas: {
      perseverante: ['persistio_tras_error'],
      regulado: ['hizo_pausa'],
      relevo: ['pidio_relevo'],
    },
  },
};

/** Etiquetas legibles para el docente. Nunca se muestran al alumno. */
export const ETIQUETAS_CONDUCTA: Record<string, string> = {
  consulto_esquema: 'Consultó el esquema antes de actuar',
  pidio_ayuda: 'Pidió ayuda a una compañera',
  reintento: 'Volvió a intentarlo tras un fallo',
  ayuda_automatica: 'Recibió ayuda tras 3 intentos',
  probo_directamente: 'Probó directamente, sin consultar',
  estilo_escucha: 'Respuestas centradas en escuchar',
  estilo_plan: 'Respuestas centradas en un plan',
  estilo_ingenio: 'Respuestas con humor e ideas',
  pregunto_equipo: 'Preguntó la opinión del equipo',
  asumio_tarea_dificil: 'Asumió la tarea más arriesgada',
  reparto_por_perfiles: 'Repartió según los perfiles',
  reasigno: 'Cambió el reparto antes de confirmar',
  pidio_ideas: 'Pidió ideas al equipo',
  exploro_alternativas: 'Buscó más de una solución',
  solucion_directa: 'Aplicó la primera solución válida',
  exploro_antes: 'Exploró antes de actuar',
  busqueda_coordinada: 'Repartió la búsqueda con un compañero',
  actuo_con_poca_informacion: 'Actuó con poca información',
  leyo_notas: 'Consultó las notas del equipo',
  dedujo_sin_ayuda: 'Dedujo el orden sin ayuda',
  priorizo_comunicaciones: 'Priorizó las comunicaciones',
  priorizo_iluminacion: 'Priorizó la iluminación del equipo',
  priorizo_margen: 'Priorizó el margen de seguridad',
  anticipo_recorrido: 'Anticipó el recorrido completo antes de actuar',
  uso_original: 'Usó un objeto para algo muy distinto de su función',
  reparto_no_convencional: 'Repartió de forma poco convencional',
  sobrecargo_equipo: 'Cargó a una persona con 3 o más tareas (lo corrigió)',
  delego_riesgo: 'Delegó la tarea de riesgo en otra persona',
  incluyo_emocional: 'Incluyó fragmentos emocionales en el mensaje',
  incluyo_tecnico: 'Incluyó fragmentos muy técnicos en el mensaje',
  mensaje_completo: 'Primer mensaje con dónde, cuántos y qué necesitan',
  reformulo_mensaje: 'Reformuló el mensaje con la respuesta recibida',
  pidio_consejo: 'Pidió consejo antes de comunicar',
  persistio_tras_error: 'Siguió intentándolo tras errores del sistema',
  hizo_pausa: 'Hizo una pausa para calmarse',
  pidio_relevo: 'Pidió relevo tras los errores',
  tiempo_agotado: 'Se le agotó el tiempo (recibió más tiempo)',
};

export function etiquetaConducta(clave: string): string {
  return ETIQUETAS_CONDUCTA[clave] ?? clave;
}
