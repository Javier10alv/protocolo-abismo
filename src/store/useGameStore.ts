import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { VERSION_GUION } from '../data/guion';
import { aplicarMinijuego, aplicarOpcion, crearEstadoInicial } from '../logica/partida';
import type { EstadoAlumno, Opcion, ResultadoMecanica } from '../types/game';

export { crearEstadoInicial };

interface GameStore extends EstadoAlumno {
  /** Interno: cuándo se mostró la escena actual. No se persiste ni se envía. */
  escenaMostradaEn: number;
  seleccionarOpcion: (opcionSeleccionada: Opcion) => void;
  completarMinijuego: (resultado: ResultadoMecanica) => void;
  reiniciarPartida: (alumnoCodigo?: string, claseId?: string) => void;
}

/** Extrae del store solo los campos del esquema (lo que se persiste y se envía al backend). */
export const seleccionarEstadoAlumno = (s: EstadoAlumno): EstadoAlumno => ({
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
  persist<GameStore, [], [], EstadoAlumno>(
    (set, get) => ({
      ...crearEstadoInicial(),
      escenaMostradaEn: Date.now(),

      seleccionarOpcion: (opcionSeleccionada) => {
        const estado = get();
        // aplicarOpcion ignora opciones que no son de la escena actual (p. ej. doble clic).
        const siguiente = aplicarOpcion(
          seleccionarEstadoAlumno(estado),
          opcionSeleccionada.id,
          Date.now() - estado.escenaMostradaEn,
        );
        if (siguiente) set({ ...siguiente, escenaMostradaEn: Date.now() });
      },

      completarMinijuego: (resultado) => {
        const estado = get();
        const siguiente = aplicarMinijuego(
          seleccionarEstadoAlumno(estado),
          resultado,
          Date.now() - estado.escenaMostradaEn,
        );
        if (siguiente) set({ ...siguiente, escenaMostradaEn: Date.now() });
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
        return { ...actual, ...p, escenaMostradaEn: Date.now() };
      },
    },
  ),
);
