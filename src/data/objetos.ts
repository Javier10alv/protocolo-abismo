// Objetos que se pueden encontrar explorando las salas. Ninguno es obligatorio:
// cada reto tiene su solución estándar, y los objetos abren soluciones
// alternativas. Usar un objeto para algo distinto de su función habitual es
// evidencia de creatividad (fijación funcional, Duncker, 1945).
//
// Regla de diseño (la comprueba `npm run validar`): todos los retos del hub
// tienen al menos un uso con un objeto de la sala de control, para que haya
// alternativa sea cual sea el orden en que se juegan.

import type { Mecanica } from '../types/game';

export interface UsoObjeto {
  mecanica: Mecanica;
  /** Qué consigue en ese reto (lo ve el docente). */
  efecto: string;
}

export interface Objeto {
  id: string;
  nombre: string;
  icono: string;
  /** Cómo aparece al explorar la sala. */
  pista: string;
  /** Escena (sala) donde se encuentra. */
  sala: string;
  usos: UsoObjeto[];
}

export const OBJETOS: Objeto[] = [
  {
    id: 'condensador',
    nombre: 'Condensador de repuesto',
    icono: '⚡',
    pista: 'Bajo una consola apagada hay una caja de recambios con un condensador nuevo. No parece servir para nada ahora mismo.',
    sala: 'esc_01_hub',
    usos: [{ mecanica: 'ondas', efecto: 'Sustituye el condensador dañado del monitor (ERR-47) antes de sincronizar.' }],
  },
  {
    id: 'cinta',
    nombre: 'Cinta americana',
    icono: '🩹',
    pista: 'Un rollo de cinta americana olvidado junto al panel de mando.',
    sala: 'esc_01_hub',
    usos: [
      { mecanica: 'tuberias', efecto: 'Sella la tubería agrietada y permite un recorrido más corto.' },
      { mecanica: 'sos', efecto: 'Repara el cable de la antena: un hueco más de ancho de banda.' },
    ],
  },
  {
    id: 'linterna',
    nombre: 'Linterna de luz ultravioleta',
    icono: '🔦',
    pista: 'En un cajón de emergencia hay una linterna con un filtro violeta.',
    sala: 'esc_01_hub',
    usos: [
      { mecanica: 'especie', efecto: 'La luz ultravioleta revela un rasgo oculto de la criatura.' },
      { mecanica: 'guiar', efecto: 'Se la da a Aris para que vea las palancas de las compuertas a oscuras (dar recursos al equipo).' },
      { mecanica: 'frecuencias', efecto: 'Activa directamente el sensor óptico de la compuerta.' },
    ],
  },
  {
    id: 'walkie',
    nombre: 'Walkie-talkie viejo',
    icono: '📻',
    pista: 'Colgado de una tubería hay un walkie-talkie con la batería a medias.',
    sala: 'esc_02_tuberias',
    usos: [{ mecanica: 'sos', efecto: 'Reyes retransmite un fragmento por otra frecuencia: un hueco más.' }],
  },
  {
    id: 'gel',
    nombre: 'Bote de gel de algas',
    icono: '🧪',
    pista: 'Junto a los tanques hay un bote de gel de algas muy espeso que se endurece con el agua fría.',
    sala: 'esc_02_especie',
    usos: [{ mecanica: 'tuberias', efecto: 'Tapona la grieta de la tubería como si fuera masilla.' }],
  },
  {
    id: 'bateria',
    nombre: 'Batería portátil',
    icono: '🔋',
    pista: 'Debajo de la mesa de reuniones hay una batería portátil cargada.',
    sala: 'esc_02_liderazgo',
    usos: [{ mecanica: 'tuberias', efecto: 'Alimenta la bomba auxiliar: más tiempo y una comprobación extra del caudal.' }],
  },
  {
    id: 'manual',
    nombre: 'Manual de averías',
    icono: '📘',
    pista: 'En la estantería de comunicaciones hay un manual de averías con las esquinas dobladas.',
    sala: 'esc_02_sos',
    usos: [{ mecanica: 'ondas', efecto: 'Explica el código ERR-47: indica que el fallo está en el condensador del monitor.' }],
  },
  {
    id: 'cuerda',
    nombre: 'Cuerda de seguridad',
    icono: '🪢',
    pista: 'Enrollada junto a la puerta estanca hay una cuerda de seguridad con mosquetón.',
    sala: 'esc_02_ondas',
    usos: [{ mecanica: 'guiar', efecto: 'Se la da a Aris para que vaya asegurada por el pasillo inundado (dar recursos al equipo).' }],
  },
];

export const OBJETOS_POR_ID: ReadonlyMap<string, Objeto> = new Map(OBJETOS.map((o) => [o.id, o]));

export function objetosDeSala(escenaId: string): Objeto[] {
  return OBJETOS.filter((o) => o.sala === escenaId);
}

/** Objetos del inventario que sirven en una mecánica. */
export function objetosUtiles(inventario: readonly string[], mecanica: Mecanica): Objeto[] {
  return inventario.map((id) => OBJETOS_POR_ID.get(id)).filter((o): o is Objeto => !!o && o.usos.some((u) => u.mecanica === mecanica));
}
