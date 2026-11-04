import type { Personaje } from '../types/game';

export type Expresion = 'neutral' | 'preocupado' | 'contento' | 'pensativo';

export const NOMBRE_PERSONAJE: Record<Personaje, string> = {
  irene: 'Irene',
  leo: 'Leo',
};

export const ROL_PERSONAJE: Record<Personaje, string> = {
  irene: 'Ingeniera jefa',
  leo: 'Técnico en prácticas',
};

interface RetratoProps {
  personaje: Personaje;
  expresion?: Expresion;
  tamano?: number;
  className?: string;
}

const BOCA: Record<Expresion, string> = {
  neutral: 'M42 70 q8 3 16 0',
  preocupado: 'M42 72 q8 -5 16 0',
  contento: 'M40 68 q10 10 20 0',
  pensativo: 'M44 71 h12',
};

const CEJAS: Record<Expresion, [string, string]> = {
  neutral: ['M34 46 l10 -1', 'M56 45 l10 1'],
  preocupado: ['M34 44 l10 3', 'M56 47 l10 -3'],
  contento: ['M34 45 q5 -3 10 0', 'M56 45 q5 -3 10 0'],
  pensativo: ['M34 46 l10 -1', 'M56 43 l10 2'],
};

/** Retrato vectorial de un personaje. Decorativo: el nombre va siempre en texto al lado. */
export default function Retrato({ personaje, expresion = 'neutral', tamano = 56, className = '' }: RetratoProps) {
  const esIrene = personaje === 'irene';
  const piel = esIrene ? '#d6a07a' : '#8d5a3b';
  const pelo = esIrene ? '#cbd5e1' : '#1c1917';
  const fondo = esIrene ? '#0e7490' : '#7c3aed';
  const [cejaI, cejaD] = CEJAS[expresion];

  return (
    <svg
      viewBox="0 0 100 100"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className={`shrink-0 rounded-full ring-2 ring-cyan-400/40 ${className}`}
    >
      <circle cx="50" cy="50" r="50" fill={fondo} />
      {/* Cuerpo / mono de trabajo */}
      <path d="M14 100 q4 -22 36 -24 q32 2 36 24z" fill={esIrene ? '#f59e0b' : '#334155'} />
      <path d="M44 78 l6 8 l6 -8" fill="none" stroke="#0f172a" strokeWidth="2" />
      {/* Cuello y cara */}
      <rect x="43" y="68" width="14" height="12" fill={piel} />
      <ellipse cx="50" cy="54" rx="21" ry="24" fill={piel} />
      {/* Pelo */}
      {esIrene ? (
        <path d="M28 52 q-2 -26 22 -28 q24 2 22 28 q-4 -14 -22 -16 q-14 0 -22 16z" fill={pelo} />
      ) : (
        <g fill={pelo}>
          {[30, 38, 46, 54, 62, 70].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 32 : 35} r="8" />
          ))}
          <circle cx="29" cy="44" r="6" />
          <circle cx="71" cy="44" r="6" />
        </g>
      )}
      {/* Ojos */}
      <circle cx="41" cy="53" r="2.6" fill="#0f172a" />
      <circle cx="59" cy="53" r="2.6" fill="#0f172a" />
      {!esIrene && (
        <g fill="none" stroke="#e2e8f0" strokeWidth="1.8">
          <circle cx="41" cy="53" r="7" />
          <circle cx="59" cy="53" r="7" />
          <path d="M48 53 h4" />
        </g>
      )}
      <path d={cejaI} stroke={esIrene ? '#64748b' : '#1c1917'} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d={cejaD} stroke={esIrene ? '#64748b' : '#1c1917'} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d={BOCA[expresion]} stroke="#3f1d0f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {esIrene && <rect x="27" y="27" width="46" height="5" rx="2.5" fill="#f59e0b" opacity="0.9" />}
      {expresion === 'preocupado' && <path d="M68 40 q3 5 0 8 q-3 -3 0 -8z" fill="#7dd3fc" />}
    </svg>
  );
}
