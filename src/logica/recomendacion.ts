// Recomendación pedagógica con plantilla local (sin LLM) y sugerencia de
// agrupamientos. Lenguaje de "indicios" y "oportunidades", nunca diagnósticos.

import { NOMBRE_HABILIDAD, type EstadoAlumno, type Habilidad } from '../types/game';
import { etiquetaConducta } from '../mecanicas/registro';
import { ordenarHabilidades, porcentajes } from './puntuacion';

const FORTALEZA: Record<Habilidad, string> = {
  logica: 'analizar la información y buscar la causa de los problemas antes de actuar',
  creatividad: 'proponer soluciones originales y aprovechar los recursos de formas inesperadas',
  comunicacion: 'escuchar, preguntar y apoyarse en el resto del equipo',
  resiliencia: 'mantener la calma y volver a intentarlo cuando algo sale mal',
  liderazgo: 'organizar al grupo, repartir tareas y asumir responsabilidades',
};

const ACTIVIDAD: Record<Habilidad, string> = {
  logica: 'retos de pensamiento paso a paso (enigmas, diagramas de causa-efecto o pequeños experimentos con hipótesis)',
  creatividad: 'tareas abiertas con más de una respuesta válida, como diseñar un invento con materiales reciclados',
  comunicacion: 'dinámicas de escucha activa por parejas o asumir el rol de portavoz del grupo',
  resiliencia: 'proyectos con varias versiones (borrador, revisión, versión final) en los que equivocarse forme parte del proceso',
  liderazgo: 'roles rotativos de coordinación en trabajos de grupo, con un objetivo pequeño y claro',
};

export interface Recomendacion {
  fortalezas: Habilidad[];
  oportunidad: Habilidad;
  conductasDestacadas: string[];
  texto: string;
}

export function recomendacionLocal(estado: EstadoAlumno): Recomendacion {
  const pct = porcentajes(estado);
  const orden = ordenarHabilidades(pct);
  const fortalezas = orden.slice(0, 2);
  const oportunidad = orden[orden.length - 1];

  const conteo = new Map<string, number>();
  for (const r of estado.historial) {
    for (const c of r.conductas ?? []) conteo.set(c, (conteo.get(c) ?? 0) + 1);
  }
  const conductasDestacadas = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const reintentos = conteo.get('reintento') ?? 0;
  const ayudas = (conteo.get('pidio_ayuda') ?? 0) + (conteo.get('pidio_ideas') ?? 0) + (conteo.get('pregunto_equipo') ?? 0);

  const partes: string[] = [];
  partes.push(
    `Durante la partida aparecen indicios de que ${estado.alumnoCodigo} se siente cómodo/a al ${FORTALEZA[fortalezas[0]]}, y también al ${FORTALEZA[fortalezas[1]]}.`,
  );
  if (reintentos >= 2) {
    partes.push('Volvió a intentarlo varias veces cuando algo no salía, una señal positiva de perseverancia.');
  }
  if (ayudas >= 2) {
    partes.push('Recurrió al equipo en varios momentos, lo que sugiere confianza para pedir apoyo.');
  }
  partes.push(
    `Como oportunidad de crecimiento, podría beneficiarse de ${ACTIVIDAD[oportunidad]}, para practicar la ${NOMBRE_HABILIDAD[oportunidad].toLowerCase()} en un entorno seguro.`,
  );
  partes.push(
    `Para aprovechar sus puntos fuertes, puede ser buena idea darle un papel relacionado con la ${NOMBRE_HABILIDAD[fortalezas[0]].toLowerCase()} en el próximo trabajo en grupo.`,
  );
  partes.push('Una sola partida es una muestra pequeña: conviene contrastar estos indicios con la observación en el aula.');

  return { fortalezas, oportunidad, conductasDestacadas, texto: partes.join(' ') };
}

/** Texto de las decisiones para enviar al LLM (sin identificadores del alumno). */
export function resumenParaLLM(estado: EstadoAlumno, describir: (escenaId: string, opcionId: string) => string, tituloDe: (escenaId: string) => string) {
  return {
    porcentajes: porcentajes(estado),
    decisiones: estado.historial.map((r) => ({
      escena: tituloDe(r.escenaId),
      eleccion: describir(r.escenaId, r.opcionId),
      conductas: (r.conductas ?? []).map(etiquetaConducta),
      intentosFallidos: r.intentos ?? 0,
    })),
  };
}

export interface Grupo {
  miembros: EstadoAlumno[];
  fortalezas: Habilidad[];
}

/**
 * Propone grupos de 3 con fortalezas complementarias: reparte en orden de
 * "fortaleza principal" para que cada grupo mezcle perfiles distintos.
 */
export function sugerirGrupos(partidas: EstadoAlumno[], tamano = 3): Grupo[] {
  if (partidas.length === 0) return [];
  const conFortaleza = partidas.map((p) => ({ p, f: ordenarHabilidades(porcentajes(p))[0] }));
  conFortaleza.sort((a, b) => a.f.localeCompare(b.f));
  const nGrupos = Math.max(1, Math.round(partidas.length / tamano));
  const grupos: EstadoAlumno[][] = Array.from({ length: nGrupos }, () => []);
  conFortaleza.forEach(({ p }, i) => grupos[i % nGrupos].push(p));
  return grupos.map((miembros) => ({
    miembros,
    fortalezas: [...new Set(miembros.map((m) => ordenarHabilidades(porcentajes(m))[0]))],
  }));
}
