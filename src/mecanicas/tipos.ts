import type { ResultadoMecanica } from '../types/game';

export interface PropsMecanica {
  /** Se llama una sola vez, cuando el alumno completa la mecánica. */
  onCompletar: (resultado: ResultadoMecanica) => void;
}

/** Intentos fallidos tras los que un personaje ayuda y la historia sigue. */
export const INTENTOS_ANTES_DE_AYUDA = 3;

/** Eficiencia genérica (0–100): cada intento fallido resta 20 y la ayuda limita al 40 %. */
export function precisionPorIntentos(fallos: number, ayuda: boolean): number {
  return Math.max(ayuda ? 20 : 40, Math.min(ayuda ? 40 : 100, 100 - fallos * 20));
}
