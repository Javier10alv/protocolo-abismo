import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cinemáticas ya vistas, por partida y escena (`partidaId:escenaId`).
 * Así, si el alumno recarga, no vuelve a ver el mismo vídeo. No se envía a ningún sitio.
 */
interface Cinematicas {
  vistas: string[];
  marcar: (clave: string) => void;
}

export const useCinematicasStore = create<Cinematicas>()(
  persist(
    (set) => ({
      vistas: [],
      // Se guardan solo las 40 últimas para no crecer sin límite.
      marcar: (clave) => set((s) => ({ vistas: [...s.vistas.filter((v) => v !== clave), clave].slice(-40) })),
    }),
    { name: 'protocolo-abismo-cinematicas' },
  ),
);
