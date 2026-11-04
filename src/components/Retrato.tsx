import type { Personaje } from '../types/game';

export type Expresion = 'neutral' | 'preocupado' | 'contento' | 'pensativo';

export const NOMBRE_PERSONAJE: Record<Personaje, string> = {
  lisa: 'Lisa',
  leo: 'Leo',
  reyes: 'Comandante Reyes',
  aris: 'Dra. Aris',
};

export const ROL_PERSONAJE: Record<Personaje, string> = {
  lisa: 'Bióloga jefa',
  leo: 'Ingeniero mecánico en prácticas',
  reyes: 'Jefe de seguridad y piloto',
  aris: 'Científica de datos',
};

/** Especialidad de cada personaje (la usan el reparto de tareas y el panel). */
export const ESPECIALIDAD_PERSONAJE: Record<Personaje, string> = {
  lisa: 'Botánica, ecosistemas cerrados y soporte vital',
  leo: 'Maquinaria, presiones, tuberías y reparaciones',
  reyes: 'Navegación, protocolos de emergencia y pilotaje',
  aris: 'Servidores, cifrado y bases de datos',
};

/** Sprite de cuerpo entero (fondo transparente) de cada personaje. */
export const SPRITE_PERSONAJE: Partial<Record<Personaje, string>> = {
  lisa: '/img/personajes/lisa.webp',
  leo: '/img/personajes/leo.webp',
  reyes: '/img/personajes/reyes.webp',
  aris: '/img/personajes/aris.webp',
};

/** Retrato de reserva si falta el sprite de un personaje: iniciales sobre un color propio. */
const PROVISIONAL: Record<Personaje, { iniciales: string; color: string }> = {
  lisa: { iniciales: 'LI', color: '#0e7490' },
  leo: { iniciales: 'LE', color: '#1d4ed8' },
  reyes: { iniciales: 'CR', color: '#b45309' },
  aris: { iniciales: 'DA', color: '#7c3aed' },
};

/**
 * Encuadre de la cara dentro del sprite, en fracciones del tamaño del sprite:
 * centro (x, y) y altura de la cara. Sirve para recortar los retratos circulares.
 */
const CARA: Partial<Record<Personaje, { x: number; y: number; alto: number }>> = {
  leo: { x: 0.5, y: 0.083, alto: 0.15 },
  lisa: { x: 0.5, y: 0.078, alto: 0.15 },
  reyes: { x: 0.52, y: 0.075, alto: 0.12 },
  aris: { x: 0.44, y: 0.1, alto: 0.12 },
};

/** Proporción ancho/alto de cada sprite (para calcular el recorte). */
const PROPORCION: Partial<Record<Personaje, number>> = {
  leo: 449 / 1200,
  lisa: 416 / 1200,
  reyes: 412 / 1200,
  aris: 498 / 1200,
};

const TINTE: Record<Expresion, string> = {
  neutral: '',
  contento: 'saturate(1.1) brightness(1.05)',
  preocupado: 'saturate(0.85)',
  pensativo: '',
};

interface RetratoProps {
  personaje: Personaje;
  /** Matiz sutil del retrato según el momento de la historia. */
  expresion?: Expresion;
  tamano?: number;
  className?: string;
}

/** Retrato circular recortado del sprite del personaje. Decorativo: el nombre va siempre en texto al lado. */
export default function Retrato({ personaje, expresion = 'neutral', tamano = 56, className = '' }: RetratoProps) {
  const cara = CARA[personaje];
  const sprite = SPRITE_PERSONAJE[personaje];
  const proporcion = PROPORCION[personaje];
  if (!cara || !sprite || !proporcion) {
    const { iniciales, color } = PROVISIONAL[personaje];
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold text-white ring-2 ring-cyan-400/40 ${className}`}
        style={{ width: tamano, height: tamano, fontSize: tamano * 0.34, background: `radial-gradient(circle at 35% 30%, ${color}, #0f172a)` }}
      >
        {iniciales}
      </span>
    );
  }
  // Alto del sprite para que la cara ocupe ~el 80 % del círculo.
  const alto = (tamano * 0.8) / cara.alto;
  const ancho = alto * proporcion;
  const x = tamano / 2 - cara.x * ancho;
  const y = tamano / 2 - cara.y * alto;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-cyan-900 to-slate-900 ring-2 ring-cyan-400/40 ${className}`}
      style={{ width: tamano, height: tamano }}
    >
      <img
        src={sprite}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: ancho, height: alto, left: x, top: y, filter: TINTE[expresion] || undefined }}
      />
    </span>
  );
}
