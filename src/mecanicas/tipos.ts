import type { EventoJuego, ResultadoMecanica } from '../types/game';

export type DatosEvento = EventoJuego['datos'];

export interface PropsMecanica {
  /** Se llama una sola vez, cuando el alumno completa la mecánica. */
  onCompletar: (resultado: ResultadoMecanica) => void;
  /**
   * Registra un evento de telemetría. Vocabulario común: `accion` (cualquier
   * interacción), `fallo` (con `firma` del intento, para saber si repite la misma
   * estrategia), `ayuda` (`tipo`: consejo | pista | automatica), `presion` (entra en
   * el último 20 % del tiempo) y `tiempo_agotado`.
   */
  registrar: (tipo: string, datos?: DatosEvento) => void;
  /** Ids de los objetos del inventario. */
  inventario: string[];
  /** true si el alumno ya entró antes en este reto y se retiró. */
  reintento: boolean;
}

/** Intentos fallidos tras los que un personaje ayuda y la historia sigue. */
export const INTENTOS_ANTES_DE_AYUDA = 3;

/** Eficiencia genérica (0–100): cada intento fallido resta 20 y la ayuda limita al 40 %. */
export function precisionPorIntentos(fallos: number, ayuda: boolean): number {
  return Math.max(ayuda ? 20 : 40, Math.min(ayuda ? 40 : 100, 100 - fallos * 20));
}

/** Registrador vacío para las mecánicas antiguas o pruebas. */
export const sinRegistro: PropsMecanica['registrar'] = () => {};
