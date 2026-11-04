// Cálculo del DESEMPEÑO por habilidad (distinto de las PRIORIDADES del hub).
//
// Sigue el Diseño Centrado en la Evidencia (Mislevy, Steinberg y Almond, 2003):
//   acciones en el juego → indicadores (0–1) → evidencia ponderada por habilidad
//   → nivel en bandas + confianza.
// La MATRIZ es la tabla de especificación: qué indicador, de dónde sale, a qué
// habilidades aporta y con qué peso. Funciones puras: las usan el panel, la
// simulación y el validador.

import { escenasPorId, hubDeEscena, registroCompletado } from '../data/guion';
import { objetosDeSala, objetosUtiles } from '../data/objetos';
import { HABILIDADES, type EstadoAlumno, type EventoJuego, type Habilidad, type Mecanica, type RegistroDecision } from '../types/game';

export type Fuente = Mecanica | 'general' | 'retirada' | 'inventario' | 'juicio';

export interface IndicadorDef {
  id: string;
  nombre: string;
  /** Qué significa un valor alto, en lenguaje para el docente. */
  descripcion: string;
  fuente: Fuente;
  pesos: Partial<Record<Habilidad, number>>;
  referencia: string;
}

export const MATRIZ: IndicadorDef[] = [
  // --- Generales (salen de los eventos de cualquier reto) ---
  { id: 'g_analisis_inicial', nombre: 'Análisis antes de actuar', descripcion: 'Se toma unos segundos para observar antes de la primera acción.', fuente: 'general', pesos: { logica: 0.3 }, referencia: 'Planificación (Miyake et al., 2000)' },
  { id: 'g_recuperacion', nombre: 'Recuperación tras un error', descripcion: 'Retoma la tarea después de cada fallo, sin quedarse bloqueado.', fuente: 'general', pesos: { resiliencia: 0.6 }, referencia: 'Tolerancia a la frustración (Rosenzweig, 1944)' },
  { id: 'g_cambio_estrategia', nombre: 'Cambio de estrategia', descripcion: 'Tras fallar, prueba algo distinto en vez de repetir lo mismo.', fuente: 'general', pesos: { resiliencia: 0.5, creatividad: 0.3 }, referencia: 'Flexibilidad cognitiva (Diamond, 2013)' },
  { id: 'g_ayuda_oportuna', nombre: 'Pide ayuda en el momento oportuno', descripcion: 'Pide consejo después de intentarlo por sí mismo, no antes ni demasiado tarde.', fuente: 'general', pesos: { comunicacion: 0.6 }, referencia: 'Búsqueda de ayuda adaptativa (Newman, 1990)' },
  { id: 'g_presion', nombre: 'Rendimiento bajo presión', descripcion: 'No comete más errores cuando el tiempo aprieta.', fuente: 'general', pesos: { resiliencia: 0.5 }, referencia: 'Regulación emocional (Gross, 1998)' },
  { id: 'g_persistencia', nombre: 'Persistencia', descripcion: 'Tras fallar, termina el reto sin necesitar la ayuda automática.', fuente: 'general', pesos: { resiliencia: 0.7 }, referencia: 'Perseverancia (Duckworth, 2016)' },
  // --- Retirada estratégica ---
  { id: 'r_retirada', nombre: 'Retirada estratégica', descripcion: 'Si deja un reto a medias, vuelve y lo resuelve de otra forma (no es evitación).', fuente: 'retirada', pesos: { resiliencia: 1, creatividad: 0.3 }, referencia: 'Afrontamiento centrado en el problema (Lazarus y Folkman, 1984)' },
  // --- Inventario ---
  { id: 'o_exploracion', nombre: 'Exploración', descripcion: 'Explora las salas y recoge objetos antes de saber para qué sirven.', fuente: 'inventario', pesos: { creatividad: 0.6 }, referencia: 'Planteamiento de problemas (Getzels y Csikszentmihalyi, 1976)' },
  { id: 'o_uso_alternativo', nombre: 'Uso alternativo de objetos', descripcion: 'Cuando tiene un objeto útil, lo usa para resolver el reto de otra manera.', fuente: 'inventario', pesos: { creatividad: 1 }, referencia: 'Fijación funcional (Duncker, 1945)' },
  // --- Tuberías ---
  { id: 'tub_eficiencia', nombre: 'Eficiencia del recorrido', descripcion: 'Giros realizados frente al mínimo necesario.', fuente: 'tuberias', pesos: { logica: 1.2 }, referencia: 'Planificación (Miyake et al., 2000)' },
  { id: 'tub_foco', nombre: 'Foco en el recorrido', descripcion: 'Proporción de giros en piezas que forman parte del recorrido final.', fuente: 'tuberias', pesos: { logica: 0.8 }, referencia: 'Resolución sistemática de problemas' },
  { id: 'tub_hipotesis', nombre: 'Comprobación de hipótesis', descripcion: 'Comprueba el caudal antes de abrir la válvula o acierta a la primera.', fuente: 'tuberias', pesos: { logica: 0.8 }, referencia: 'Razonamiento hipotético-deductivo' },
  { id: 'tub_regiro', nombre: 'Consistencia', descripcion: 'No deshace piezas que ya estaban bien colocadas.', fuente: 'tuberias', pesos: { logica: 0.5 }, referencia: 'Memoria de trabajo (Miyake et al., 2000)' },
  // --- Especie desconocida ---
  { id: 'esp_originalidad', nombre: 'Originalidad', descripcion: 'Proporción de rasgos alejados del prototipo conocido (un pez).', fuente: 'especie', pesos: { creatividad: 1.5 }, referencia: 'Imaginación estructurada (Ward, 1994); Torrance' },
  { id: 'esp_utilidad', nombre: 'Utilidad', descripcion: 'Su primer diseño ya resolvía los problemas del entorno.', fuente: 'especie', pesos: { creatividad: 1, logica: 0.5 }, referencia: 'Creatividad = originalidad + utilidad (Runco y Jaeger, 2012)' },
  { id: 'esp_flexibilidad', nombre: 'Flexibilidad', descripcion: 'Innova en categorías distintas (cuerpo, sentidos, alimentación…).', fuente: 'especie', pesos: { creatividad: 1 }, referencia: 'Torrance (TTCT)' },
  { id: 'esp_elaboracion', nombre: 'Elaboración', descripcion: 'Explica correctamente para qué sirve cada adaptación.', fuente: 'especie', pesos: { creatividad: 0.8, comunicacion: 0.3 }, referencia: 'Torrance (TTCT)' },
  { id: 'esp_fluidez', nombre: 'Fluidez', descripcion: 'Diseña más de una especie viable y distinta.', fuente: 'especie', pesos: { creatividad: 1 }, referencia: 'Torrance (TTCT); Guilford (1967)' },
  // --- Al frente del equipo (liderazgo situacional) ---
  { id: 'gui_ajuste', nombre: 'Ajuste del estilo a la persona', descripcion: 'A la primera, usa con cada persona el estilo que necesita (dirigir, entrenar, apoyar o delegar).', fuente: 'guiar', pesos: { liderazgo: 1.5 }, referencia: 'Liderazgo situacional (Hersey y Blanchard, 1969)' },
  { id: 'gui_flexibilidad', nombre: 'Flexibilidad de estilo', descripcion: 'Cuando el estado de las personas cambia, cambia su forma de guiarlas en lugar de repetir lo que funcionó antes.', fuente: 'guiar', pesos: { liderazgo: 1.2 }, referencia: 'Liderazgo situacional (Hersey y Blanchard, 1969)' },
  { id: 'gui_diagnostico', nombre: 'Diagnóstico antes de actuar', descripcion: 'Pregunta a cada persona cómo está antes de decirle qué hacer.', fuente: 'guiar', pesos: { comunicacion: 0.8, liderazgo: 0.5 }, referencia: 'Consideración individualizada (Bass, 1985)' },
  { id: 'gui_correccion', nombre: 'Aprende de la reacción', descripcion: 'Si su primer enfoque no funciona, acierta en el siguiente intento.', fuente: 'guiar', pesos: { liderazgo: 0.6, resiliencia: 0.3 }, referencia: 'Liderazgo adaptativo (Heifetz, 1994)' },
  // --- Mensaje roto ---
  { id: 'men_ambiguedad', nombre: 'Detección de ambigüedad', descripcion: 'Se da cuenta de que «NO compuerta B» admite dos lecturas y lo aclara con una pregunta concreta.', fuente: 'mensaje', pesos: { comunicacion: 1 }, referencia: 'Inferencia pragmática (Grice, 1975; Sperber y Wilson, 1986)' },
  { id: 'men_preguntas', nombre: 'Calidad de las preguntas', descripcion: 'Pregunta lo que de verdad no se puede deducir, de forma concreta, sin gastar transmisiones en lo obvio.', fuente: 'mensaje', pesos: { comunicacion: 1.2 }, referencia: 'Preguntas de aclaración en la comunicación referencial (Krauss y Fussell, 1996)' },
  { id: 'men_inferencia', nombre: 'Inferencia por el contexto', descripcion: 'Deduce bien lo que el contexto deja claro, integrando los dos mensajes, aunque falten trozos.', fuente: 'mensaje', pesos: { comunicacion: 0.6, logica: 0.6 }, referencia: 'Teoría de la relevancia (Sperber y Wilson, 1986)' },
  { id: 'men_bucle', nombre: 'Comunicación en bucle cerrado', descripcion: 'Repite por radio lo que ha entendido para que se lo confirmen antes de actuar.', fuente: 'mensaje', pesos: { comunicacion: 1.2, logica: 0.3 }, referencia: 'Closed-loop communication (Salas, Sims y Burke, 2005)' },
  { id: 'men_transmision', nombre: 'Transmisión al equipo', descripcion: 'Da a cada persona del equipo justo la información que necesita para su tarea, sin quedarse corto ni saturarla.', fuente: 'mensaje', pesos: { comunicacion: 0.8, liderazgo: 0.3 }, referencia: 'Diseño para la audiencia (Bell, 1984; Clark y Murphy, 1982)' },
  // --- Ondas ---
  { id: 'ond_anticipacion', nombre: 'Anticipación', descripcion: 'Detecta el aviso de error y lo resuelve antes de que provoque un fallo (mejor cuanto menos pistas necesita).', fuente: 'ondas', pesos: { resiliencia: 1.2, logica: 0.5 }, referencia: 'Afrontamiento proactivo (Aspinwall y Taylor, 1997)' },
  { id: 'ond_reaccion', nombre: 'Reacción ante lo imprevisto', descripcion: 'Ante una interferencia que le ocurre a todos, sigue o se autorregula con una pausa.', fuente: 'ondas', pesos: { resiliencia: 1.5 }, referencia: 'Regulación emocional (Gross, 1998)' },
  // --- Frecuencias enlazadas ---
  { id: 'fre_asociacion', nombre: 'Asociación remota', descripcion: 'Encuentra la palabra que une tres conceptos alejados con poca ayuda.', fuente: 'frecuencias', pesos: { creatividad: 1.2, logica: 0.6 }, referencia: 'Test de Asociados Remotos (Mednick, 1962)' },
  { id: 'fre_objeto', nombre: 'Atajo con un objeto', descripcion: 'Usa la linterna para activar el sensor óptico.', fuente: 'frecuencias', pesos: { creatividad: 0.6 }, referencia: 'Fijación funcional (Duncker, 1945)' },
  // --- Juicio situacional ---
  ...HABILIDADES.map(
    (h): IndicadorDef => ({
      id: `sjt_${h}`,
      nombre: 'Juicio situacional',
      descripcion: 'Elige la respuesta más eficaz en una situación breve planteada al final de un reto.',
      fuente: 'juicio',
      pesos: { [h]: 0.6 },
      referencia: 'Tests de juicio situacional (McDaniel et al., 2001)',
    }),
  ),
];

export const INDICADOR: ReadonlyMap<string, IndicadorDef> = new Map(MATRIZ.map((d) => [d.id, d]));

export type Banda = 'emergente' | 'desarrollo' | 'consolidado';
export const NOMBRE_BANDA: Record<Banda, string> = { emergente: 'Emergente', desarrollo: 'En desarrollo', consolidado: 'Consolidado' };
export const BANDAS: Banda[] = ['emergente', 'desarrollo', 'consolidado'];
export type Confianza = 'alta' | 'media' | 'baja';

export function bandaDe(valor: number): Banda {
  return valor >= 70 ? 'consolidado' : valor >= 40 ? 'desarrollo' : 'emergente';
}

export interface Evidencia {
  def: IndicadorDef;
  valor: number;
  /** Reto o fuente de la que sale (p. ej. «Refrigerar el motor»). */
  origen: string;
}

export interface EvaluacionHabilidad {
  habilidad: Habilidad;
  /** 0–100, o null si no hay evidencia. */
  valor: number | null;
  banda: Banda | null;
  confianza: Confianza;
  /** Suma de pesos observados. */
  peso: number;
  evidencias: Evidencia[];
}

export interface Evaluacion {
  habilidades: Record<Habilidad, EvaluacionHabilidad>;
  /** Patrón de juego al azar (clics muy rápidos y sin pausa): baja la confianza. */
  sospechosa: boolean;
}

/** Peso observado a partir del cual la confianza es media / alta. */
const PESO_MEDIA = 2;
const PESO_ALTA = 4;

/* ----------------------------- Indicadores ------------------------------ */

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Indicadores generales de un reto a partir de sus eventos (de todos los intentos). */
export function indicadoresGenerales(eventos: EventoJuego[], ayudaAutomatica: boolean): Record<string, number> {
  const ind: Record<string, number> = {};
  const acciones = eventos.filter((e) => e.tipo === 'accion');
  const fallos = eventos.filter((e) => e.tipo === 'fallo');
  const propios = fallos.filter((e) => !e.datos?.provocado);

  if (acciones.length) {
    const t = acciones[0].t;
    ind.g_analisis_inicial = t < 2 ? 0.3 : t < 5 ? 0.6 : 1;
  }
  if (fallos.length) {
    // Recuperación: ¿retoma tras cada fallo? (umbral amplio: no se premia la rapidez).
    ind.g_recuperacion = media(
      fallos.map((f) => {
        const siguiente = acciones.find((a) => a.t > f.t);
        if (!siguiente) return 0.3;
        return siguiente.t - f.t <= 60 ? 1 : 0.6;
      }),
    );
  }
  const firmas = propios.map((f) => String(f.datos?.firma ?? ''));
  if (firmas.length >= 2) ind.g_cambio_estrategia = new Set(firmas).size / firmas.length;

  const consejo = eventos.find((e) => e.tipo === 'ayuda' && e.datos?.tipo === 'consejo');
  if (consejo) {
    const intentoAntes = fallos.some((f) => f.t < consejo.t) || acciones.filter((a) => a.t < consejo.t).length >= 5;
    ind.g_ayuda_oportuna = intentoAntes ? 1 : 0.6;
  } else if (ayudaAutomatica) {
    ind.g_ayuda_oportuna = 0.3;
  }

  const presion = eventos.find((e) => e.tipo === 'presion');
  if (presion) ind.g_presion = propios.some((f) => f.t > presion.t) ? 0.5 : 1;
  if (propios.length) ind.g_persistencia = ayudaAutomatica ? 0.4 : 1;
  return ind;
}

/** Todos los eventos de un reto: los de las retiradas y los del intento final. */
function eventosDeEscena(estado: Pick<EstadoAlumno, 'historial'>, escenaId: string): EventoJuego[] {
  return estado.historial.filter((r) => r.escenaId === escenaId).flatMap((r) => r.eventos ?? []);
}

function evaluarRetirada(estado: Pick<EstadoAlumno, 'historial'>, retirada: RegistroDecision): number {
  const acciones = (retirada.eventos ?? []).filter((e) => e.tipo === 'accion').length;
  if (acciones === 0) return 0.2; // se fue sin intentarlo: posible evitación
  const final = registroCompletado(estado, retirada.escenaId);
  if (!final) return 0.5;
  const cambio = (final.conductas ?? []).includes('uso_objeto_alternativo') || (final.intentos ?? 0) < (retirada.intentos ?? 0) || (final.intentos ?? 0) === 0;
  return cambio ? 1 : 0.6;
}

/** Recoge todas las evidencias observadas en una partida. */
export function evidenciasDe(estado: Pick<EstadoAlumno, 'historial' | 'inventario'>): Evidencia[] {
  const evidencias: Evidencia[] = [];
  const anadir = (id: string, valor: number, origen: string) => {
    const def = INDICADOR.get(id);
    if (def && Number.isFinite(valor)) evidencias.push({ def, valor: Math.max(0, Math.min(1, valor)), origen });
  };

  const completados = estado.historial.filter((r) => !r.retirada && escenasPorId.get(r.escenaId)?.tipo === 'minijuego');
  for (const r of completados) {
    const escena = escenasPorId.get(r.escenaId)!;
    const titulo = escena.titulo;
    for (const [id, v] of Object.entries(r.indicadores ?? {})) anadir(id, v, titulo);
    for (const [id, v] of Object.entries(indicadoresGenerales(eventosDeEscena(estado, r.escenaId), !!r.ayudaRecibida))) anadir(id, v, titulo);
  }

  for (const r of estado.historial.filter((x) => x.retirada)) {
    anadir('r_retirada', evaluarRetirada(estado, r), escenasPorId.get(r.escenaId)?.titulo ?? r.escenaId);
  }

  // Exploración: objetos recogidos frente a los que había en las salas visitadas.
  const salas = new Set(['esc_01_hub', ...estado.historial.map((r) => r.escenaId)]);
  const disponibles = [...salas].flatMap((s) => objetosDeSala(s));
  if (disponibles.length && completados.length >= 2) {
    const recogidos = estado.inventario.filter((o) => disponibles.some((d) => d.id === o.id)).length;
    anadir('o_exploracion', recogidos / disponibles.length, 'Salas exploradas');
  }

  // Uso alternativo: en los retos donde tenía algún objeto útil, ¿lo usó?
  let oportunidades = 0;
  let usos = 0;
  for (const r of completados) {
    const escena = escenasPorId.get(r.escenaId);
    if (escena?.tipo !== 'minijuego' || !hubDeEscena(escena.id)) continue;
    const enMano = estado.inventario.filter((o) => o.timestamp <= r.timestamp).map((o) => o.id);
    if (objetosUtiles(enMano, escena.mecanica).length === 0) continue;
    oportunidades++;
    if (eventosDeEscena(estado, r.escenaId).some((e) => e.tipo === 'objeto' && e.datos?.util === true)) usos++;
  }
  if (oportunidades > 0) anadir('o_uso_alternativo', usos / oportunidades, `${oportunidades} reto(s) con un objeto útil a mano`);

  return evidencias;
}

/** Detecta juego al azar: muchas acciones con intervalos muy cortos en varios retos. */
export function partidaSospechosa(estado: Pick<EstadoAlumno, 'historial'>): boolean {
  let rapidos = 0;
  for (const r of estado.historial) {
    const t = (r.eventos ?? []).filter((e) => e.tipo === 'accion').map((e) => e.t);
    if (t.length < 15) continue;
    const huecos = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
    if (huecos[Math.floor(huecos.length / 2)] < 0.35) rapidos++;
  }
  return rapidos >= 2;
}

export function evaluar(estado: Pick<EstadoAlumno, 'historial' | 'inventario'>): Evaluacion {
  const evidencias = evidenciasDe(estado);
  const sospechosa = partidaSospechosa(estado);
  const habilidades = {} as Record<Habilidad, EvaluacionHabilidad>;
  for (const h of HABILIDADES) {
    const propias = evidencias.filter((e) => (e.def.pesos[h] ?? 0) > 0);
    const peso = propias.reduce((a, e) => a + e.def.pesos[h]!, 0);
    const valor = peso > 0 ? Math.round((propias.reduce((a, e) => a + e.def.pesos[h]! * e.valor, 0) / peso) * 100) : null;
    const confianza: Confianza = sospechosa ? 'baja' : peso >= PESO_ALTA ? 'alta' : peso >= PESO_MEDIA ? 'media' : 'baja';
    habilidades[h] = { habilidad: h, valor, banda: valor === null ? null : bandaDe(valor), confianza, peso: Math.round(peso * 10) / 10, evidencias: propias };
  }
  return { habilidades, sospechosa };
}

/** Desempeño 0–100 por habilidad (0 si no hay evidencia), para medias y gráficos. */
export function desempenoNumerico(e: Evaluacion): Record<Habilidad, number> {
  const r = {} as Record<Habilidad, number>;
  for (const h of HABILIDADES) r[h] = e.habilidades[h].valor ?? 0;
  return r;
}

/* --------------------------- Ajustes del docente -------------------------- */

/** Ajuste manual de una banda por parte del docente, con su motivo. El valor del juego se conserva. */
export interface AjusteDocente {
  habilidad: Habilidad;
  banda: Banda;
  motivo: string;
  fecha: string;
}

/** Banda final: la del docente si la ha ajustado; si no, la calculada. */
export function bandaFinal(ev: EvaluacionHabilidad, ajustes: AjusteDocente[]): { banda: Banda | null; ajuste?: AjusteDocente } {
  const ajuste = ajustes.find((a) => a.habilidad === ev.habilidad);
  return ajuste ? { banda: ajuste.banda, ajuste } : { banda: ev.banda };
}
