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
    queObserva: 'Eficiencia del recorrido (giros frente al mínimo), si comprueba hipótesis antes de abrir la válvula, si deshace piezas que ya estaban bien y si sella la grieta con un objeto para usar el camino corto.',
    fundamento: 'Funciones ejecutivas: planificación y memoria de trabajo (Miyake et al., 2000); fijación funcional (Duncker, 1945). El reloj es solo narrativo: no puntúa.',
    claves: ['planificador', 'insistente', 'guiado', 'ingenioso'],
    conductasTipicas: {
      planificador: ['anticipo_recorrido'],
      insistente: ['reintento'],
      guiado: ['pidio_ayuda'],
      ingenioso: ['uso_objeto_alternativo'],
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
    queObserva: 'Si reparte según las especialidades, si respeta las limitaciones de cada persona (que solo se conocen preguntando), si reparte la carga, y si asume la tarea de riesgo o la delega con medios de seguridad.',
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
    queObserva: 'Si el primer mensaje es completo (dónde, cuántos, qué, cuánto tiempo), si evita el relleno, si añade lo que falta tras la respuesta y si contesta exactamente a lo que le preguntan.',
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
    queObserva: 'Si detecta el aviso ERR-47 y repara el monitor antes de que falle (anticipación) y cómo reacciona ante una interferencia imprevisible que le ocurre a todo el mundo: si sigue, se autorregula con una pausa o pide relevo.',
    fundamento: 'Afrontamiento proactivo (Aspinwall y Taylor, 1997), tolerancia a la frustración (Rosenzweig, 1944) y perseverancia (Duckworth, 2016). Los fallos están provocados a propósito y se explican al final.',
    claves: ['anticipado', 'perseverante', 'regulado', 'relevo'],
    conductasTipicas: {
      anticipado: ['anticipo_fallo', 'uso_objeto_alternativo'],
      perseverante: ['persistio_tras_error'],
      regulado: ['hizo_pausa'],
      relevo: ['pidio_relevo'],
    },
  },
  especie: {
    nombre: 'Especie desconocida',
    queObserva: 'Cuánto se aleja del prototipo conocido (originalidad), si la criatura sobrevive al entorno (utilidad), en cuántas categorías innova (flexibilidad), si explica sus adaptaciones (elaboración) y cuántas especies distintas diseña (fluidez).',
    fundamento: 'Imaginación estructurada (Ward, 1994) y modelo Geneplore (Finke, Ward y Smith, 1992); dimensiones de Torrance (fluidez, flexibilidad, originalidad, elaboración).',
    claves: ['innovador', 'funcional', 'prolifico', 'consultor', 'tenaz'],
    conductasTipicas: {
      innovador: ['uso_original'],
      funcional: [],
      prolifico: ['exploro_alternativas'],
      consultor: ['pidio_ideas'],
      tenaz: ['reintento'],
    },
  },
  guiar: {
    nombre: 'Al frente del equipo',
    queObserva: 'Si adapta su forma de guiar a cada persona según sepa hacerlo y se sienta capaz (dirigir, entrenar, apoyar o delegar), si pregunta antes de actuar y si cambia de estilo cuando el estado de las personas cambia.',
    fundamento: 'Liderazgo situacional (Hersey y Blanchard, 1969) y consideración individualizada (Bass, 1985).',
    claves: ['situacional', 'adaptativo', 'directivo', 'delegador'],
    conductasTipicas: {
      situacional: ['adapto_estilo'],
      adaptativo: ['reintento'],
      directivo: [],
      delegador: [],
    },
  },
  frecuencias: {
    nombre: 'Frecuencias enlazadas',
    queObserva: 'Si encuentra la palabra que une tres conceptos alejados (asociación remota), cuánta ayuda necesita y si la respuesta le llega de golpe o paso a paso.',
    fundamento: 'Test de Asociados Remotos (Mednick, 1962) y autoinforme de insight (Bowden y Jung-Beeman, 2003).',
    claves: ['intuitivo', 'analitico', 'apoyado', 'ingenioso'],
    conductasTipicas: {
      intuitivo: ['insight_subito'],
      analitico: ['insight_analitico'],
      apoyado: ['pidio_ayuda'],
      ingenioso: ['uso_objeto_alternativo'],
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
  uso_objeto_alternativo: 'Usó un objeto del inventario para resolverlo de otra forma',
  comprobo_hipotesis: 'Comprobó el caudal antes de abrir la válvula',
  incluyo_vago: 'Incluyó fragmentos vagos en el mensaje',
  respondio_lo_preguntado: 'Contestó exactamente a lo que le preguntaron',
  delego_con_seguridad: 'Delegó la tarea de riesgo con medios de seguridad',
  ignoro_limitaciones: 'Su primer plan chocó con limitaciones del equipo (lo corrigió)',
  anticipo_fallo: 'Detectó el aviso y reparó el monitor antes de que fallara',
  ignoro_aviso: 'No atendió al aviso de error antes de sincronizar',
  adapto_estilo: 'Cambió su forma de guiar cuando cambió el estado de las personas',
  repitio_estilo: 'Repitió con alguien el estilo que le funcionó antes, aunque ya no encajaba',
  insight_subito: 'Las respuestas le llegaron sobre todo de golpe (insight)',
  insight_analitico: 'Las respuestas le llegaron sobre todo paso a paso',
};

export function etiquetaConducta(clave: string): string {
  return ETIQUETAS_CONDUCTA[clave] ?? clave;
}
