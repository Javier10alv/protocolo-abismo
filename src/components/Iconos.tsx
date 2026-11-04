// Iconos de trazo (24×24) para la barra de ajustes. Decorativos: el botón lleva su aria-label.
import type { ReactNode } from 'react';

type Nombre = 'sonido' | 'silencio' | 'leer' | 'parar' | 'texto' | 'saltar' | 'pausa';

const TRAZOS: Record<Nombre, ReactNode> = {
  sonido: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  silencio: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </>
  ),
  leer: (
    <>
      <path d="M4 5h10M4 9h10M4 13h6" />
      <path d="M15 14v5l3-2.5z" fill="currentColor" />
      <path d="M20 13a4 4 0 0 1 0 7" />
    </>
  ),
  parar: <rect x="6" y="6" width="12" height="12" rx="2" />,
  texto: (
    <>
      <path d="M3 19l5-13 5 13M5 14h6" />
      <path d="M14 19l3.5-8 3.5 8M15.2 16.5h4.6" />
    </>
  ),
  saltar: (
    <>
      <path d="M4 6l7 6-7 6z" />
      <path d="M12 6l7 6-7 6z" />
    </>
  ),
  pausa: <path d="M8 5v14M16 5v14" />,
};

export default function Icono({ nombre, className = 'h-5 w-5' }: { nombre: Nombre; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {TRAZOS[nombre]}
    </svg>
  );
}
