import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ESCENA_INICIAL, VERSION_GUION, escenasPorId } from '../data/guion';
import {
  FIN,
  HABILIDADES,
  type EstadoAlumno,
  type Habilidades,
  type Opcion,
} from '../types/game';

const habilidadesACero = (): Habilidades => ({
  logica: 0,
  creatividad: 0,
  comunicacion: 0,
  resiliencia: 0,
  liderazgo: 0,
});

export function crearEstadoInicial(alumnoCodigo = 'ANON', claseId = 'DEMO'): EstadoAlumno {
  return {
    version: VERSION_GUION,
    partidaId: crypto.randomUUID(),
    alumnoCodigo,
    claseId,
    escenaActual: ESCENA_INICIAL,
    habilidades: habilidadesACero(),
    historial: [],
    completada: false,
    iniciadaEn: new Date().toISOString(),
    finalizadaEn: null,
  };
}

interface GameStore extends EstadoAlumno {
  /** Interno: cuándo se mostró la escena actual. No se persiste ni se envía. */
  escenaMostradaEn: number;
  seleccionarOpcion: (opcionSeleccionada: Opcion) => void;
  reiniciarPartida: (alumnoCodigo?: string, claseId?: string) => void;
}

/** Extrae del store solo los campos del esquema (lo que se persiste y se envía al backend). */
export const seleccionarEstadoAlumno = (s: GameStore): EstadoAlumno => ({
  version: s.version,
  partidaId: s.partidaId,
  alumnoCodigo: s.alumnoCodigo,
  claseId: s.claseId,
  escenaActual: s.escenaActual,
  habilidades: s.habilidades,
  historial: s.historial,
  completada: s.completada,
  iniciadaEn: s.iniciadaEn,
  finalizadaEn: s.finalizadaEn,
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...crearEstadoInicial(),
      escenaMostradaEn: Date.now(),

      seleccionarOpcion: (opcionSeleccionada) => {
        const estado = get();
        if (estado.completada) return;

        // Ignora opciones que no pertenecen a la escena actual (p. ej. un doble clic
        // sobre un botón de la escena anterior).
        const escena = escenasPorId.get(estado.escenaActual);
        if (!escena?.opciones.some((o) => o.id === opcionSeleccionada.id)) return;

        const ahora = Date.now();
        const habilidades = { ...estado.habilidades };
        for (const h of HABILIDADES) {
          habilidades[h] += opcionSeleccionada.modificadores[h] ?? 0;
        }

        const esFinal = opcionSeleccionada.siguienteEscena === FIN;

        set({
          habilidades,
          historial: [
            ...estado.historial,
            {
              escenaId: estado.escenaActual,
              opcionId: opcionSeleccionada.id,
              timestamp: new Date(ahora).toISOString(),
              tiempoRespuestaMs: Math.max(0, ahora - estado.escenaMostradaEn),
            },
          ],
          escenaActual: opcionSeleccionada.siguienteEscena,
          completada: esFinal,
          finalizadaEn: esFinal ? new Date(ahora).toISOString() : null,
          escenaMostradaEn: ahora,
        });
      },

      reiniciarPartida: (alumnoCodigo, claseId) => {
        const { alumnoCodigo: codigoActual, claseId: claseActual } = get();
        set({
          ...crearEstadoInicial(alumnoCodigo ?? codigoActual, claseId ?? claseActual),
          escenaMostradaEn: Date.now(),
        });
      },
    }),
    {
      name: 'protocolo-abismo-partida',
      storage: createJSONStorage(() => localStorage),
      partialize: seleccionarEstadoAlumno,
      // Si el guion ha cambiado desde que se guardó la partida, se descarta.
      merge: (persistido, actual) => {
        const p = persistido as Partial<EstadoAlumno> | undefined;
        if (!p || p.version !== VERSION_GUION) return actual;
        return { ...actual, ...p };
      },
    },
  ),
);
