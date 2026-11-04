import type { ResultadoMecanica } from '../types/game';

export interface PropsMecanica {
  /** Se llama una sola vez, cuando el alumno completa la mecánica. */
  onCompletar: (resultado: ResultadoMecanica) => void;
}

/** Intentos fallidos tras los que un personaje ayuda y la historia sigue. */
export const INTENTOS_ANTES_DE_AYUDA = 3;
