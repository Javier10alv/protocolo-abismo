// Genera partidas simuladas. Se usa para la demo del panel del docente y para que
// el validador recorra el guion y compruebe el esquema del estado.

import { escenasPorId } from '../data/guion';
import { MECANICAS_INFO } from '../mecanicas/registro';
import { HABILIDADES, type EstadoAlumno, type Habilidad, type Opcion, type Resultado } from '../types/game';
import { aplicarMinijuego, aplicarOpcion, crearEstadoInicial } from './partida';

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

/** Elige con más probabilidad las elecciones que suben la habilidad preferida. */
function elegir<T extends Opcion | Resultado>(
  elecciones: T[],
  preferida: Habilidad,
  azar: () => number,
): T {
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
  alumnoCodigo: string,
  claseId: string,
  azar: () => number,
  inicio = new Date(),
  preferida: Habilidad = HABILIDADES[Math.floor(azar() * HABILIDADES.length)],
): EstadoAlumno {
  let estado = crearEstadoInicial(alumnoCodigo, claseId, inicio);
  let reloj = inicio.getTime();

  for (let pasos = 0; !estado.completada && pasos < 100; pasos++) {
    const escena = escenasPorId.get(estado.escenaActual);
    if (!escena) throw new Error(`Escena inexistente: ${estado.escenaActual}`);
    const tiempo = escena.tipo === 'decision' ? 6000 + azar() * 20000 : 30000 + azar() * 90000;
    reloj += tiempo;

    const siguiente =
      escena.tipo === 'decision'
        ? aplicarOpcion(estado, elegir(escena.opciones, preferida, azar).id, tiempo, new Date(reloj))
        : (() => {
            const r = elegir(escena.resultados, preferida, azar);
            const tipicas = MECANICAS_INFO[escena.mecanica].conductasTipicas[r.clave] ?? [];
            const fallos = tipicas.includes('reintento') ? 1 + Math.floor(azar() * 3) : 0;
            const ayuda = fallos >= 3;
            return aplicarMinijuego(
              estado,
              {
                clave: r.clave,
                conductas: ayuda ? [...tipicas, 'ayuda_automatica'] : tipicas,
                intentos: fallos,
                ayudaRecibida: ayuda,
              },
              tiempo,
              new Date(reloj),
            );
          })();

    if (!siguiente) throw new Error(`Transición no válida en ${estado.escenaActual}`);
    estado = siguiente;
  }
  return estado;
}

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';

/** Código seudónimo tipo 'A7K2' (sin letras ni números confundibles). */
export function generarCodigo(azar: () => number = Math.random): string {
  const l = () => LETRAS[Math.floor(azar() * LETRAS.length)];
  const d = () => DIGITOS[Math.floor(azar() * DIGITOS.length)];
  return `${l()}${d()}${l()}${d()}`;
}

/** Partidas de ejemplo para enseñar el panel del docente sin alumnos reales. */
export function generarPartidasDemo(cantidad = 14, claseId = 'DEMO-2ESO', semilla = 2026): EstadoAlumno[] {
  const azar = crearAzar(semilla);
  const ahora = Date.now();
  const usados = new Set<string>();
  return Array.from({ length: cantidad }, (_, i) => {
    let codigo = generarCodigo(azar);
    while (usados.has(codigo)) codigo = generarCodigo(azar);
    usados.add(codigo);
    const inicio = new Date(ahora - (cantidad - i) * 3.6e6 - azar() * 3.6e6);
    return simularPartida(codigo, claseId, azar, inicio);
  });
}
