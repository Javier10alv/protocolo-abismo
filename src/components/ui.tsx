import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { sonido } from '../audio/sonido';
import type { Personaje } from '../types/game';
import Retrato, { NOMBRE_PERSONAJE, type Expresion } from './Retrato';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

const ESTILOS: Record<Variante, string> = {
  primario:
    'border-cyan-300/70 bg-cyan-400/20 text-white hover:bg-cyan-400/30 hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)]',
  secundario:
    'border-cyan-400/25 bg-slate-900/60 text-slate-200 hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-white',
  fantasma: 'border-transparent bg-transparent text-cyan-200 hover:bg-cyan-400/10',
  peligro: 'border-rose-400/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20',
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  silencioso?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Botón real con anillo de foco visible y sonido de clic. */
export function Boton({ variante = 'secundario', silencioso, className = '', onClick, children, ...resto }: BotonProps) {
  return (
    <button
      type="button"
      {...resto}
      onClick={(e) => {
        if (!silencioso) sonido.click();
        onClick?.(e);
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-base font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${ESTILOS[variante]} ${className}`}
    >
      {children}
    </button>
  );
}

interface BocadilloProps {
  personaje: Personaje;
  expresion?: Expresion;
  children: ReactNode;
  /** Anuncia el mensaje a lectores de pantalla al aparecer. */
  anunciar?: boolean;
}

/** Mensaje de un personaje con su retrato. */
export function Bocadillo({ personaje, expresion = 'neutral', children, anunciar = true }: BocadilloProps) {
  return (
    <div
      className="flex items-start gap-3 motion-safe:animate-[aparecer_300ms_ease-out]"
      role={anunciar ? 'status' : undefined}
    >
      <Retrato personaje={personaje} expresion={expresion} tamano={44} />
      <div className="rounded-2xl rounded-tl-sm border border-cyan-400/20 bg-slate-900/80 px-4 py-2.5 text-slate-200">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">{NOMBRE_PERSONAJE[personaje]}</p>
        <p className="mt-0.5 leading-snug">{children}</p>
      </div>
    </div>
  );
}

/** Lectura en voz alta con la síntesis de voz del navegador (si existe). */
export function useLector() {
  const [leyendo, setLeyendo] = useState(false);
  const disponible = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => () => {
    if (disponible) window.speechSynthesis.cancel();
  }, [disponible]);

  const leer = (texto: string) => {
    if (!disponible) return;
    const s = window.speechSynthesis;
    if (leyendo) {
      s.cancel();
      setLeyendo(false);
      return;
    }
    s.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-ES';
    u.rate = 0.95;
    const voz = s.getVoices().find((v) => v.lang.startsWith('es'));
    if (voz) u.voice = voz;
    u.onend = () => setLeyendo(false);
    u.onerror = () => setLeyendo(false);
    setLeyendo(true);
    s.speak(u);
  };

  return { disponible, leyendo, leer };
}

/** Texto con efecto máquina de escribir. El texto completo está siempre disponible para lectores de pantalla. */
export function TextoAnimado({
  texto,
  animar,
  onTerminado,
  className = '',
}: {
  texto: string;
  animar: boolean;
  onTerminado?: () => void;
  className?: string;
}) {
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const activo = animar && !reducido;
  const [n, setN] = useState(activo ? 0 : texto.length);
  const avisado = useRef(false);

  useEffect(() => {
    if (!activo) return;
    const id = window.setInterval(() => {
      setN((x) => {
        if (x >= texto.length) {
          window.clearInterval(id);
          return x;
        }
        return Math.min(texto.length, x + 2);
      });
    }, 22);
    return () => window.clearInterval(id);
  }, [activo, texto]);

  useEffect(() => {
    if (n >= texto.length && !avisado.current) {
      avisado.current = true;
      onTerminado?.();
    }
  }, [n, texto.length, onTerminado]);

  const completo = n >= texto.length;
  return (
    <p className={className}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true" onClick={() => setN(texto.length)} className={completo ? '' : 'cursor-pointer'}>
        {texto.slice(0, n)}
        {!completo && <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] bg-cyan-300/80 motion-safe:animate-pulse" />}
      </span>
    </p>
  );
}

/** Caja con estilo de panel de la estación (glassmorphism). */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-cyan-400/25 bg-black/55 shadow-[0_0_48px_-12px_rgba(34,211,238,0.35)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">{children}</p>;
}
