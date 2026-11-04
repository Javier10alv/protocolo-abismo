import { useEffect, useRef, useState } from 'react';
import { escenasPorId } from '../data/guion';
import { seleccionarEstadoAlumno, useGameStore } from '../store/useGameStore';
import { FIN, type EstadoAlumno, type Opcion, type Scene } from '../types/game';

interface GameEngineProps {
  /** Se llama una vez al terminar la partida, con el estado listo para enviar al backend. */
  onPartidaFinalizada?: (estado: EstadoAlumno) => void;
}

export default function GameEngine({ onPartidaFinalizada }: GameEngineProps) {
  const escenaActual = useGameStore((s) => s.escenaActual);
  const completada = useGameStore((s) => s.completada);
  const partidaId = useGameStore((s) => s.partidaId);
  const seleccionarOpcion = useGameStore((s) => s.seleccionarOpcion);

  // Evita enviar dos veces la misma partida (StrictMode ejecuta los efectos dos veces en desarrollo).
  const partidaEnviada = useRef<string | null>(null);

  useEffect(() => {
    if (!completada || partidaEnviada.current === partidaId) return;
    partidaEnviada.current = partidaId;
    onPartidaFinalizada?.(seleccionarEstadoAlumno(useGameStore.getState()));
  }, [completada, partidaId, onPartidaFinalizada]);

  if (escenaActual === FIN) return <PantallaFin />;

  const escena = escenasPorId.get(escenaActual);
  if (!escena) return <PantallaError escenaId={escenaActual} />;

  // `key` fuerza el remontaje en cada escena: reinicia la animación de entrada y el foco.
  return <PantallaEscena key={escena.id} escena={escena} onElegir={seleccionarOpcion} />;
}

/* -------------------------------------------------------------------------- */

interface PantallaEscenaProps {
  escena: Scene;
  onElegir: (opcion: Opcion) => void;
}

const LETRAS = ['A', 'B', 'C', 'D'];

function PantallaEscena({ escena, onElegir }: PantallaEscenaProps) {
  const [visible, setVisible] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    // Lleva el foco al título para que teclado y lector de pantalla empiecen por la nueva escena.
    tituloRef.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Fondo: imagen de la escena */}
      <div
        role="img"
        aria-label={escena.altImagen}
        className={`absolute inset-0 bg-cover bg-center transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none ${
          visible ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
        }`}
        style={{ backgroundImage: `url(${escena.imagen})` }}
      />

      {/* Overlay oscuro: más denso abajo, donde va el texto */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(2,6,23,0.97) 0%, rgba(2,6,23,0.75) 45%, rgba(8,20,45,0.35) 100%)',
        }}
      />

      {/* Barra superior decorativa */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/70 sm:px-8 sm:pt-6">
        <span>Estación Abismo</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] motion-safe:animate-pulse" />
          -3.000 m
        </span>
      </header>

      {/* Caja de diálogo */}
      <section className="relative z-10 flex min-h-[calc(100dvh-3rem)] flex-col justify-end px-4 pb-4 sm:px-8 sm:pb-8">
        <div
          className={`mx-auto w-full max-w-3xl rounded-2xl border border-cyan-400/25 bg-black/55 p-5 shadow-[0_0_48px_-12px_rgba(34,211,238,0.35)] backdrop-blur-md transition-[opacity,transform] delay-150 duration-700 ease-out motion-reduce:transition-none sm:p-7 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/80">
            Registro de bitácora
          </p>

          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="mt-2 text-2xl font-semibold tracking-tight text-white outline-none sm:text-3xl"
          >
            {escena.titulo}
          </h1>

          <p aria-live="polite" className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">
            {escena.textoNarrativo}
          </p>

          <div className="my-5 h-px bg-gradient-to-r from-cyan-400/40 via-cyan-400/10 to-transparent" />

          <ul className="grid gap-3" aria-label="¿Qué decides hacer?">
            {escena.opciones.map((opcion, i) => (
              <li key={opcion.id}>
                <button
                  type="button"
                  onClick={() => onElegir(opcion)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-cyan-400/20 bg-slate-900/60 px-4 py-3.5 text-left text-base text-slate-200 transition-all duration-300 ease-out hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-white hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)] focus-visible:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 active:scale-[0.99] motion-reduce:transition-none sm:px-5 sm:py-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/40 font-mono text-sm text-cyan-300 transition-colors duration-300 group-hover:border-cyan-300 group-hover:bg-cyan-400/20 group-hover:text-white"
                  >
                    {LETRAS[i] ?? i + 1}
                  </span>
                  <span>{opcion.textoBoton}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function PantallaFin() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-cyan-400/30 motion-safe:animate-ping" />
        <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.9)]" />
      </div>
      <p className="font-mono text-sm uppercase tracking-[0.25em] text-cyan-300 motion-safe:animate-pulse sm:text-base">
        Transmitiendo telemetría al panel del docente...
      </p>
    </main>
  );
}

function PantallaError({ escenaId }: { escenaId: string }) {
  const reiniciarPartida = useGameStore((s) => s.reiniciarPartida);
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-300">
      <p className="font-mono text-sm text-red-300">Escena no encontrada: {escenaId}</p>
      <button
        type="button"
        onClick={() => reiniciarPartida()}
        className="rounded-lg border border-cyan-400/40 px-4 py-2 text-cyan-200 transition-colors hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        Reiniciar partida
      </button>
    </main>
  );
}
