// Registro de mecánicas: qué desenlaces (claves) puede emitir cada una y qué
// comportamientos observa. Es lógica pura (sin React) para que la usen el store,
// el panel del docente, la simulación y el script de validación.

import type { Mecanica } from '../types/game';

export interface DefinicionMecanica {
  nombre: string;
  /** Qué observa la mecánica, explicado para el docente. */
  queObserva: string;
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
  reparto: {
    nombre: 'Reparto de tareas',
    queObserva: 'Si consulta al equipo, si asume la tarea arriesgada y cómo reparte.',
    claves: ['consenso', 'ejemplo', 'estrategia'],
    conductasTipicas: {
      consenso: ['pregunto_equipo'],
      ejemplo: ['asumio_tarea_dificil'],
      estrategia: ['reparto_por_perfiles'],
    },
  },
  inventario: {
    nombre: 'Inventario',
    queObserva: 'Cuántas soluciones distintas busca, si pide ideas y cómo gestiona los intentos fallidos.',
    claves: ['equipo', 'inventor', 'tenaz', 'practico'],
    conductasTipicas: {
      equipo: ['pidio_ideas'],
      inventor: ['exploro_alternativas'],
      tenaz: ['reintento'],
      practico: ['solucion_directa'],
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
};

export function etiquetaConducta(clave: string): string {
  return ETIQUETAS_CONDUCTA[clave] ?? clave;
}
