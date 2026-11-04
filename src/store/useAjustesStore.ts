import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Preferencias del alumno en este dispositivo (no se envían a ningún sitio). */
interface Ajustes {
  sonido: boolean;
  textoGrande: boolean;
  /** Efecto máquina de escribir en la narración. */
  animarTexto: boolean;
  alternar: (clave: 'sonido' | 'textoGrande' | 'animarTexto') => void;
}

export const useAjustesStore = create<Ajustes>()(
  persist(
    (set) => ({
      sonido: true,
      textoGrande: false,
      animarTexto: true,
      alternar: (clave) => set((s) => ({ [clave]: !s[clave] })),
    }),
    { name: 'protocolo-abismo-ajustes', partialize: ({ sonido, textoGrande, animarTexto }) => ({ sonido, textoGrande, animarTexto }) },
  ),
);
