// Genera partidas simuladas. La usa el validador para recorrer el guion y
// comprobar el esquema del estado, y el panel para la fila de «Alumno de Prueba».

import { escenasPorId, hubDeEscena, opcionesCompletadas, opcionesHechas } from '../data/guion';
import { JUICIO } from '../data/juicio';
import { objetosDeSala, objetosUtiles } from '../data/objetos';
import { MECANICAS_INFO } from '../mecanicas/registro';
import { HABILIDADES, type EscenaMinijuego, type EstadoAlumno, type EventoJuego, type Habilidad, type Opcion, type OpcionHub, type Resultado } from '../types/game';
import { MATRIZ } from './evaluacion';
import { aplicarMinijuego, aplicarOpcion, aplicarOpcionHub, aplicarRetirada, crearEstadoInicial, generarIdAlumno, recogerObjeto, salirDelHub } from './partida';

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function crearAzar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function alAzar<T>(lista: T[], azar: () => number): T {
  return lista[Math.floor(azar() * lista.length)];
}

/** En las decisiones, elige con más probabilidad lo que sube la habilidad preferida. */
function elegir<T extends Opcion | Resultado>(elecciones: T[], preferida: Habilidad, azar: () => number): T {
  const pesos = elecciones.map((e) => 1 + 3 * (e.modificadores[preferida] ?? 0));
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = azar() * total;
  for (let i = 0; i < elecciones.length; i++) {
    r -= pesos[i];
    if (r <= 0) return elecciones[i];
  }
  return elecciones[elecciones.length - 1];
}

export function simularPartida(
  alumnoNombre: string,
  claseId: string,
  azar: () => number,
  inicio = new Date(),
  preferida: Habilidad = HABILIDADES[Math.floor(azar() * HABILIDADES.length)],
): EstadoAlumno {
  let estado = crearEstadoInicial(alumnoNombre, claseId, inicio, generarIdAlumno(azar));
  let reloj = inicio.getTime();

  for (let pasos = 0; !estado.completada && pasos < 100; pasos++) {
    const escena = escenasPorId.get(estado.escenaActual);
    if (!escena) throw new Error(`Escena inexistente: ${estado.escenaActual}`);
    const tiempo = escena.tipo === 'minijuego' ? 40000 + azar() * 140000 : 5000 + azar() * 20000;
    reloj += tiempo;
    const ahora = new Date(reloj);

    let siguiente: EstadoAlumno | null;
    if (escena.tipo === 'hub') {
      // A veces explora la sala de control y recoge lo que encuentra.
      for (const o of objetosDeSala(escena.id)) if (azar() < 0.5) estado = recogerObjeto(estado, o.id, ahora) ?? estado;
      const completadas = opcionesCompletadas(estado, escena);
      const pendientes = escena.opciones.filter((o) => !completadas.some((h) => h.id === o.id));
      const aplazada = pendientes.find((o) => opcionesHechas(estado, escena).some((h) => h.id === o.id));
      if (pendientes.length === 0) {
        siguiente = salirDelHub(estado, ahora);
      } else {
        // La habilidad preferida suele elegirse antes; el resto, al azar.
        const favorita = pendientes.find((o) => o.area === preferida);
        const elegida: OpcionHub = aplazada && azar() < 0.6 ? aplazada : favorita && azar() < 0.7 ? favorita : alAzar(pendientes, azar);
        siguiente = aplicarOpcionHub(estado, elegida.id, tiempo, ahora);
      }
    } else if (escena.tipo === 'decision') {
      siguiente = aplicarOpcion(estado, elegir(escena.opciones, preferida, azar).id, tiempo, ahora);
    } else {
      for (const o of objetosDeSala(escena.id)) if (azar() < 0.4) estado = recogerObjeto(estado, o.id, ahora) ?? estado;
      const yaSeRetiro = estado.historial.some((r) => r.escenaId === escena.id && r.retirada);
      if (hubDeEscena(escena.id) && !yaSeRetiro && azar() < 0.12) {
        // Retirada estratégica: lo intenta un poco y vuelve a la sala de control.
        siguiente = aplicarRetirada(estado, [{ t: 4, tipo: 'accion' }, { t: 9, tipo: 'fallo', datos: { firma: 'a' } }, { t: 12, tipo: 'retirada' }], tiempo / 2, ahora);
      } else {
        siguiente = aplicarMinijuego(estado, simularMecanica(escena, estado, azar), tiempo, ahora);
      }
    }

    if (!siguiente) throw new Error(`Transición no válida en ${estado.escenaActual}`);
    estado = siguiente;
  }
  return estado;
}

/** Resultado verosímil de una mecánica: desenlace, conductas, indicadores y eventos. */
function simularMecanica(escena: EscenaMinijuego, estado: EstadoAlumno, azar: () => number) {
  const r = alAzar(escena.resultados, azar);
  const tipicas = MECANICAS_INFO[escena.mecanica].conductasTipicas[r.clave] ?? [];
  const fallos = tipicas.includes('reintento') ? 1 + Math.floor(azar() * 3) : Math.floor(azar() * 2);
  const ayuda = fallos >= 3;
  const habilidadAlumno = 0.35 + azar() * 0.6;
  const indicadores: Record<string, number> = {};
  for (const d of MATRIZ) if (d.fuente === escena.mecanica) indicadores[d.id] = Math.round(Math.min(1, Math.max(0, habilidadAlumno + (azar() - 0.5) * 0.4)) * 100) / 100;
  const eventos: EventoJuego[] = [{ t: 2 + Math.round(azar() * 8), tipo: 'accion' }];
  let t = eventos[0].t;
  for (let i = 0; i < fallos; i++) {
    t += 8 + Math.round(azar() * 20);
    eventos.push({ t, tipo: 'fallo', datos: { firma: azar() < 0.6 ? `f${i}` : 'f0' } }, { t: t + 4, tipo: 'accion' });
  }
  const enMano = estado.inventario.map((o) => o.id);
  const utiles = objetosUtiles(enMano, escena.mecanica);
  if (utiles.length && azar() < 0.5) eventos.push({ t: t + 2, tipo: 'objeto', datos: { id: utiles[0].id, util: true } });
  const juicio = hubDeEscena(escena.id) ? JUICIO[escena.mecanica] : undefined;
  if (juicio) {
    const opcion = Math.floor(azar() * juicio.opciones.length);
    indicadores[`sjt_${juicio.habilidad}`] = juicio.opciones[opcion].valor;
    eventos.push({ t: t + 10, tipo: 'sjt', datos: { habilidad: juicio.habilidad, opcion } });
  }
  return {
    clave: r.clave,
    conductas: ayuda ? [...tipicas, 'ayuda_automatica'] : tipicas,
    intentos: fallos,
    ayudaRecibida: ayuda,
    precision: Math.max(20, Math.round(100 - fallos * 20 - azar() * 15)),
    indicadores,
    eventos,
  };
}

/**
 * Fila de ejemplo que el panel muestra cuando todavía no hay partidas reales.
 * Es siempre la misma (semilla fija) y nunca se guarda.
 */
export function partidaDePrueba(claseId: string): EstadoAlumno {
  const inicio = new Date(Date.UTC(2026, 10, 4, 9, 0, 0));
  return simularPartida('Alumno de Prueba', claseId, crearAzar(2026), inicio, 'comunicacion');
}
