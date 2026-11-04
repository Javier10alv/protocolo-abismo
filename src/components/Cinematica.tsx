import { useEffect, useRef, useState } from 'react';
import { useAjustesStore } from '../store/useAjustesStore';
import type { Cinematica as TipoCinematica } from '../types/game';
import Icono from './Iconos';
import Retrato, { NOMBRE_PERSONAJE } from './Retrato';

interface Props {
  cinematica: TipoCinematica;
  /** Se llama una vez: al terminar el vídeo, al saltarlo o si no se puede reproducir. */
  onTerminar: () => void;
}

const FUNDIDO_MS = 600;

/** Vídeo a pantalla completa con subtítulos, botón de saltar y fundidos de entrada y salida. */
export default function Cinematica({ cinematica, onTerminar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const saltarRef = useRef<HTMLButtonElement>(null);
  const terminado = useRef(false);
  const sonidoOn = useAjustesStore((s) => s.sonido);
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [silenciadoForzado, setSilenciadoForzado] = useState(false);

  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const terminar = () => {
    if (terminado.current) return;
    terminado.current = true;
    setSaliendo(true);
    window.setTimeout(onTerminar, reducido ? 0 : FUNDIDO_MS);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setVisible(true);
    saltarRef.current?.focus({ preventScroll: true });
    v.muted = !useAjustesStore.getState().sonido;
    // Si el navegador bloquea el autoplay con sonido, se reproduce en silencio y se ofrece activarlo.
    v.play().catch(() => {
      v.muted = true;
      setSilenciadoForzado(true);
      v.play().catch(() => terminar());
    });
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') terminar();
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el alumno silencia o activa el sonido durante el vídeo.
  useEffect(() => {
    if (videoRef.current && !silenciadoForzado) videoRef.current.muted = !sonidoOn;
  }, [sonidoOn, silenciadoForzado]);

  const activarSonido = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setSilenciadoForzado(false);
  };

  const subtitulo = cinematica.subtitulos?.find((s) => tiempo >= s.desde && tiempo < s.hasta);
  const progreso = duracion > 0 ? Math.min(100, (tiempo / duracion) * 100) : 0;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black transition-opacity ease-out motion-reduce:transition-none ${visible && !saliendo ? 'opacity-100' : 'opacity-0'}`}
      style={{ transitionDuration: `${FUNDIDO_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label="Escena de vídeo"
    >
      <video
        ref={videoRef}
        src={cinematica.src}
        playsInline
        preload="auto"
        aria-hidden="true"
        onTimeUpdate={(e) => setTiempo(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration)}
        onEnded={terminar}
        onError={terminar}
        className="absolute inset-0 h-full w-full object-contain landscape:object-cover"
      />
      <p className="sr-only">{cinematica.descripcion}</p>

      {/* Viñeta para que subtítulos y botones se lean sobre cualquier fotograma */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65))]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 to-transparent" />

      <div className="absolute right-4 top-4 flex gap-2 sm:right-8 sm:top-6">
        {silenciadoForzado && sonidoOn && (
          <button
            type="button"
            onClick={activarSonido}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/40 bg-black/60 px-4 text-sm text-cyan-100 backdrop-blur hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <Icono nombre="sonido" /> Activar sonido
          </button>
        )}
        <button
          ref={saltarRef}
          type="button"
          onClick={terminar}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-black/60 px-4 text-sm text-white backdrop-blur hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Saltar <Icono nombre="saltar" className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-8 sm:pb-10">
        <div className="mx-auto flex min-h-24 max-w-3xl items-end justify-center" aria-live="polite">
          {subtitulo &&
            (subtitulo.personaje ? (
              <div key={subtitulo.texto} className="flex items-center gap-3 rounded-2xl border border-cyan-400/25 bg-black/70 px-4 py-3 backdrop-blur-md motion-safe:animate-[aparecer_250ms_ease-out]">
                <Retrato personaje={subtitulo.personaje} tamano={48} />
                <p className="text-base text-white sm:text-lg">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300">{NOMBRE_PERSONAJE[subtitulo.personaje]}</span>
                  {subtitulo.texto}
                </p>
              </div>
            ) : (
              <p key={subtitulo.texto} className="text-center font-mono text-sm uppercase tracking-[0.3em] text-cyan-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] motion-safe:animate-[aparecer_400ms_ease-out] sm:text-base">
                {subtitulo.texto}
              </p>
            ))}
        </div>
        <div className="mx-auto mt-4 h-0.5 max-w-3xl overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <div className="h-full bg-cyan-300/80" style={{ width: `${progreso}%` }} />
        </div>
      </div>
    </div>
  );
}
