import type { Personaje } from '../types/game';

export type Expresion = 'neutral' | 'preocupado' | 'contento' | 'pensativo';

export const NOMBRE_PERSONAJE: Record<Personaje, string> = {
  lisa: 'Lisa',
  leo: 'Leo',
};

export const ROL_PERSONAJE: Record<Personaje, string> = {
  lisa: 'Ingeniera jefa',
  leo: 'Técnico en prácticas',
};

/** Sprite de cuerpo entero (fondo transparente) de cada personaje. */
export const SPRITE_PERSONAJE: Record<Personaje, string> = {
  lisa: '/img/personajes/lisa.webp',
  leo: '/img/personajes/leo.webp',
};

/**
 * Encuadre de la cara dentro del sprite, en fracciones del tamaño del sprite:
 * centro (x, y) y altura de la cara. Sirve para recortar los retratos circulares.
 */
const CARA: Record<Personaje, { x: number; y: number; alto: number }> = {
  leo: { x: 0.5, y: 0.083, alto: 0.15 },
  lisa: { x: 0.5, y: 0.078, alto: 0.15 },
};

/** Proporción ancho/alto de cada sprite (para calcular el recorte). */
const PROPORCION: Record<Personaje, number> = {
  leo: 447 / 1200,
  lisa: 415 / 1200,
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
  // Alto del sprite para que la cara ocupe ~el 80 % del círculo.
  const alto = (tamano * 0.8) / cara.alto;
  const ancho = alto * PROPORCION[personaje];
  const x = tamano / 2 - cara.x * ancho;
  const y = tamano / 2 - cara.y * alto;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-cyan-900 to-slate-900 ring-2 ring-cyan-400/40 ${className}`}
      style={{ width: tamano, height: tamano }}
    >
      <img
        src={SPRITE_PERSONAJE[personaje]}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: ancho, height: alto, left: x, top: y, filter: TINTE[expresion] || undefined }}
      />
    </span>
  );
}
