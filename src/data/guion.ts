import escenasJson from './escenas.json';
import type { Scene } from '../types/game';

/** Versión del guion. Súbela cada vez que cambies escenas.json. */
export const VERSION_GUION = '1.0.0';

export const escenas: Scene[] = escenasJson;

export const ESCENA_INICIAL = escenas[0].id; // 'esc_01_despertar'

/** Búsqueda O(1) de una escena por id. */
export const escenasPorId: ReadonlyMap<string, Scene> = new Map(
  escenas.map((escena) => [escena.id, escena]),
);
