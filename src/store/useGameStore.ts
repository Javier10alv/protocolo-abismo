import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { VERSION_GUION } from '../data/guion';
import { aplicarMinijuego, aplicarOpcion, aplicarOpcionHub, aplicarRetirada, crearEstadoInicial, recogerObjeto, salirDelHub } from '../logica/partida';
import type { EstadoAlumno, EventoJuego, Opcion, ResultadoMecanica } from '../types/game';

export { crearEstadoInicial };

/** Partida vacía mientras no hay alumno identificado. */
export const SIN_ALUMNO = 'SIN-ALUMNO';

interface GameStore extends EstadoAlumno {
  /** Interno: cuándo se mostró la escena actual. No se persiste ni se envía. */
  escenaMostradaEn: number;
  seleccionarOpcion: (opcionSeleccionada: Opcion) => void;
  elegirArea: (opcionHubId: string) => void;
  salirDelHub: () => void;
  completarMinijuego: (resultado: ResultadoMecanica) => void;
  /** Deja el minijuego a medias y vuelve a la sala de control. */
  retirarse: (eventos: EventoJuego[]) => void;
  /** Recoge un objeto de la sala actual (no reinicia el cronómetro de la escena). */
  recogerObjeto: (objetoId: string) => void;
  /** Empieza una partida nueva para un alumno (se genera un ID único). */
  iniciarPartida: (alumnoNombre: string, claseId: string) => void;
  /** Vuelve a empezar con el mismo alumno. */
  reiniciarPartida: () => void;
}

/** Extrae del store solo los campos del esquema (lo que se persiste y se envía al backend). */
export const seleccionarEstadoAlumno = (s: EstadoAlumno): EstadoAlumno => ({
  version: s.version,
  partidaId: s.partidaId,
  alumnoCodigo: s.alumnoCodigo,
  alumnoNombre: s.alumnoNombre,
  claseId: s.claseId,
  escenaActual: s.escenaActual,
  habilidades: s.habilidades,
  historial: s.historial,
  inventario: s.inventario,
  completada: s.completada,
  iniciadaEn: s.iniciadaEn,
  finalizadaEn: s.finalizadaEn,
});

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], EstadoAlumno>(
    (set, get) => {
      /** Aplica una transición pura y reinicia el cronómetro de la escena. */
      const transicion = (f: (estado: EstadoAlumno, ms: number) => EstadoAlumno | null) => {
        const estado = get();
        const siguiente = f(seleccionarEstadoAlumno(estado), Date.now() - estado.escenaMostradaEn);
        if (siguiente) set({ ...siguiente, escenaMostradaEn: Date.now() });
      };

      return {
        ...crearEstadoInicial(SIN_ALUMNO, SIN_ALUMNO, new Date(), SIN_ALUMNO),
        escenaMostradaEn: Date.now(),

        // Todas ignoran elecciones que no son válidas en la escena actual (p. ej. un doble clic).
        seleccionarOpcion: (opcion) => transicion((e, ms) => aplicarOpcion(e, opcion.id, ms)),
        elegirArea: (id) => transicion((e, ms) => aplicarOpcionHub(e, id, ms)),
        salirDelHub: () => transicion((e) => salirDelHub(e)),
        completarMinijuego: (resultado) => transicion((e, ms) => aplicarMinijuego(e, resultado, ms)),
        retirarse: (eventos) => transicion((e, ms) => aplicarRetirada(e, eventos, ms)),
        recogerObjeto: (id) => {
          const siguiente = recogerObjeto(seleccionarEstadoAlumno(get()), id);
          if (siguiente) set({ inventario: siguiente.inventario });
        },

        iniciarPartida: (alumnoNombre, claseId) => set({ ...crearEstadoInicial(alumnoNombre, claseId), escenaMostradaEn: Date.now() }),
        reiniciarPartida: () => {
          const { alumnoNombre, claseId, alumnoCodigo } = get();
          set({ ...crearEstadoInicial(alumnoNombre, claseId, new Date(), alumnoCodigo), escenaMostradaEn: Date.now() });
        },
      };
    },
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
