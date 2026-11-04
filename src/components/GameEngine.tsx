import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { sonido } from '../audio/sonido';
import { TOTAL_ETAPAS, escenasPorId, etapaDe } from '../data/guion';
import { COMPONENTES_MECANICA } from '../mecanicas';
import { useAjustesStore } from '../store/useAjustesStore';
import { seleccionarEstadoAlumno, useGameStore } from '../store/useGameStore';
import {
  FIN,
  type EscenaDecision,
  type EscenaMinijuego,
  type EstadoAlumno,
  type Resultado,
  type ResultadoMecanica,
  type Scene,
} from '../types/game';
import Icono from './Iconos';
import Retrato, { NOMBRE_PERSONAJE, ROL_PERSONAJE } from './Retrato';
import { Boton, Etiqueta, Panel, TextoAnimado, useLector } from './ui';

export type EstadoEnvio = 'enviando' | 'enviado' | 'error';

interface GameEngineProps {
  /** Se llama al terminar la partida, con el estado listo para enviar al backend. Debe ser idempotente. */
  onPartidaFinalizada?: (estado: EstadoAlumno) => Promise<void> | void;
  onSalir?: () => void;
}

export default function GameEngine({ onPartidaFinalizada, onSalir }: GameEngineProps) {
  const escenaActual = useGameStore((s) => s.escenaActual);
  const completada = useGameStore((s) => s.completada);
  const partidaId = useGameStore((s) => s.partidaId);
  const [envio, setEnvio] = useState<EstadoEnvio>('enviando');

  // Evita enviar dos veces la misma partida (StrictMode ejecuta los efectos dos veces en desarrollo).
  const partidaEnviada = useRef<string | null>(null);

  const enviar = useCallback(async () => {
    setEnvio('enviando');
    try {
      await onPartidaFinalizada?.(seleccionarEstadoAlumno(useGameStore.getState()));
      setEnvio('enviado');
    } catch {
      setEnvio('error');
    }
  }, [onPartidaFinalizada]);

  useEffect(() => {
    if (!completada || partidaEnviada.current === partidaId) return;
    partidaEnviada.current = partidaId;
    void enviar();
  }, [completada, partidaId, enviar]);

  // El sonido ambiente arranca con la primera interacción (los navegadores lo exigen).
  useEffect(() => {
    const arrancar = () => sonido.iniciarAmbiente();
    window.addEventListener('pointerdown', arrancar, { once: true });
    window.addEventListener('keydown', arrancar, { once: true });
    return () => {
      window.removeEventListener('pointerdown', arrancar);
      window.removeEventListener('keydown', arrancar);
      sonido.detenerAmbiente();
    };
  }, []);

  if (escenaActual === FIN) return <PantallaFin envio={envio} onReintentar={enviar} onSalir={onSalir} />;

  const escena = escenasPorId.get(escenaActual);
  if (!escena) return <PantallaError escenaId={escenaActual} />;

  // `key` fuerza el remontaje en cada escena: reinicia animaciones, foco y estado de la mecánica.
  return <PantallaEscena key={escena.id} escena={escena} onSalir={onSalir} />;
}

/* -------------------------------------------------------------------------- */

function Fondo({ escena, visible }: { escena: Scene; visible: boolean }) {
  return (
    <>
      <div
        role="img"
        aria-label={escena.altImagen}
        className={`fixed inset-0 bg-cover bg-center transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none ${
          visible ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
        } motion-safe:animate-[deriva_40s_ease-in-out_infinite_alternate]`}
        style={{ backgroundImage: `url(${escena.imagen})` }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(2,6,23,0.97) 0%, rgba(2,6,23,0.78) 45%, rgba(8,20,45,0.3) 100%)',
        }}
      />
      <Burbujas />
    </>
  );
}

/** Burbujas decorativas que suben (solo si el usuario no pide reducir movimiento). */
function Burbujas() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden motion-reduce:hidden">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="absolute bottom-[-20px] rounded-full border border-cyan-200/30 bg-cyan-200/5 animate-[subir_linear_infinite]"
          style={{
            left: `${(i * 37) % 100}%`,
            width: 6 + ((i * 7) % 14),
            height: 6 + ((i * 7) % 14),
            animationDuration: `${9 + ((i * 5) % 11)}s`,
            animationDelay: `${(i * 1.7) % 9}s`,
          }}
        />
      ))}
    </div>
  );
}

function BarraSuperior({ etapa, texto, onSalir }: { etapa: number; texto?: string; onSalir?: () => void }) {
  const { sonido: sonidoOn, textoGrande, animarTexto, alternar } = useAjustesStore();
  const lector = useLector();
  const pct = Math.round((etapa / TOTAL_ETAPAS) * 100);

  const boton = 'flex h-10 w-10 aria-pressed:border-cyan-300/70 aria-pressed:bg-cyan-400/25 items-center justify-center rounded-lg border border-cyan-400/25 bg-black/40 text-base text-cyan-100 backdrop-blur transition-colors hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';

  return (
    <header className="relative z-10 flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
      <div className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/70">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] motion-safe:animate-pulse" />
          <span className="truncate">Estación Abismo · -3.000 m</span>
        </div>
        <div
          className="mt-2 h-1 w-full max-w-56 overflow-hidden rounded-full bg-cyan-950"
          role="progressbar"
          aria-label="Progreso del protocolo de emergencia"
          aria-valuemin={0}
          aria-valuemax={TOTAL_ETAPAS}
          aria-valuenow={etapa}
          aria-valuetext={`Etapa ${etapa} de ${TOTAL_ETAPAS}`}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-200 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <nav aria-label="Ajustes" className="flex gap-2">
        {lector.disponible && texto && (
          <button type="button" className={boton} onClick={() => lector.leer(texto)} aria-pressed={lector.leyendo} title="Leer en voz alta" aria-label={lector.leyendo ? 'Detener lectura' : 'Leer en voz alta'}>
            <Icono nombre={lector.leyendo ? 'parar' : 'leer'} />
          </button>
        )}
        <button type="button" className={boton} onClick={() => alternar('textoGrande')} aria-pressed={textoGrande} title="Texto grande" aria-label="Texto grande">
          <Icono nombre="texto" />
        </button>
        <button type="button" className={boton} onClick={() => alternar('animarTexto')} aria-pressed={!animarTexto} title="Mostrar el texto de golpe" aria-label="Mostrar el texto de golpe">
          <Icono nombre="saltar" />
        </button>
        <button type="button" className={boton} onClick={() => alternar('sonido')} aria-pressed={sonidoOn} title={sonidoOn ? 'Silenciar' : 'Activar sonido'} aria-label={sonidoOn ? 'Silenciar' : 'Activar sonido'}>
          <Icono nombre={sonidoOn ? 'sonido' : 'silencio'} />
        </button>
        {onSalir && (
          <button type="button" className={boton} onClick={onSalir} title="Pausar y salir" aria-label="Pausar y salir (la partida se guarda)">
            <Icono nombre="pausa" />
          </button>
        )}
      </nav>
    </header>
  );
}

const LETRAS = ['A', 'B', 'C', 'D'];

function PantallaEscena({ escena, onSalir }: { escena: Scene; onSalir?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [textoListo, setTextoListo] = useState(false);
  const animarTexto = useAjustesStore((s) => s.animarTexto);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [cierre, setCierre] = useState<{ resultado: Resultado; mecanica: ResultadoMecanica } | null>(null);

  useEffect(() => {
    // setTimeout y no requestAnimationFrame: rAF se congela en pestañas en segundo plano.
    const t = window.setTimeout(() => setVisible(true), 30);
    // Lleva el foco al título para que teclado y lector de pantalla empiecen por la nueva escena.
    tituloRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    return () => window.clearTimeout(t);
  }, []);

  const alTerminarTexto = useCallback(() => setTextoListo(true), []);

  const textoLectura = cierre ? cierre.resultado.textoCierre : `${escena.titulo}. ${escena.textoNarrativo}`;

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <Fondo escena={escena} visible={visible} />
      <BarraSuperior etapa={etapaDe(escena.id)} texto={textoLectura} onSalir={onSalir} />

      <section className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col justify-end px-4 pb-4 pt-6 sm:px-8 sm:pb-8">
        <Panel
          className={`mx-auto w-full max-w-3xl p-5 transition-[opacity,transform] delay-150 duration-700 ease-out motion-reduce:transition-none sm:p-7 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Etiqueta>{escena.tipo === 'minijuego' ? 'Protocolo de emergencia' : 'Registro de bitácora'}</Etiqueta>
              <h1 ref={tituloRef} tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight text-white outline-none sm:text-3xl">
                {escena.titulo}
              </h1>
            </div>
            {escena.personajes && escena.personajes.length > 0 && (
              <ul className="flex shrink-0 -space-x-2" aria-label="Personajes presentes">
                {escena.personajes.map((p) => (
                  <li key={p} title={`${NOMBRE_PERSONAJE[p]}, ${ROL_PERSONAJE[p]}`}>
                    <Retrato personaje={p} tamano={44} expresion={escena.id.startsWith('esc_10') ? 'contento' : 'neutral'} />
                    <span className="sr-only">
                      {NOMBRE_PERSONAJE[p]}, {ROL_PERSONAJE[p]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cierre ? (
            <Cierre resultado={cierre.resultado} mecanica={cierre.mecanica} />
          ) : (
            <>
              <TextoAnimado
                texto={escena.textoNarrativo}
                animar={animarTexto}
                onTerminado={alTerminarTexto}
                className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg"
              />
              <div className="my-5 h-px bg-gradient-to-r from-cyan-400/40 via-cyan-400/10 to-transparent" />
              <Aparecer visible={textoListo}>
                {escena.tipo === 'decision' ? (
                  <Opciones escena={escena} />
                ) : (
                  <Minijuego
                    escena={escena}
                    onCompletar={(m) => {
                      const resultado = escena.resultados.find((r) => r.clave === m.clave);
                      if (resultado) setCierre({ resultado, mecanica: m });
                    }}
                  />
                )}
              </Aparecer>
            </>
          )}
        </Panel>
      </section>
    </main>
  );
}

function Aparecer({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
      aria-hidden={!visible}
      inert={!visible}
    >
      {children}
    </div>
  );
}

function Opciones({ escena }: { escena: EscenaDecision }) {
  const seleccionarOpcion = useGameStore((s) => s.seleccionarOpcion);
  const [elegida, setElegida] = useState<string | null>(null);

  const elegir = (id: string) => {
    if (elegida) return;
    const opcion = escena.opciones.find((o) => o.id === id);
    if (!opcion) return;
    sonido.seleccion();
    setElegida(id);
    // Breve pausa para que se vea la elección antes de cambiar de escena.
    window.setTimeout(() => seleccionarOpcion(opcion), 450);
  };

  return (
    <ul className="grid gap-3" aria-label="¿Qué decides hacer?">
      {escena.opciones.map((opcion, i) => {
        const esta = elegida === opcion.id;
        return (
          <li key={opcion.id}>
            <button
              type="button"
              onClick={() => elegir(opcion.id)}
              disabled={elegida !== null}
              className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-base transition-all duration-300 ease-out focus-visible:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 active:scale-[0.99] motion-reduce:transition-none sm:px-5 sm:py-4 ${
                esta
                  ? 'border-cyan-200 bg-cyan-400/25 text-white shadow-[0_0_28px_-6px_rgba(34,211,238,0.8)]'
                  : elegida
                    ? 'border-cyan-400/10 bg-slate-900/40 text-slate-500'
                    : 'border-cyan-400/20 bg-slate-900/60 text-slate-200 hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-white hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]'
              }`}
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
        );
      })}
    </ul>
  );
}

function Minijuego({ escena, onCompletar }: { escena: EscenaMinijuego; onCompletar: (r: ResultadoMecanica) => void }) {
  const Componente = COMPONENTES_MECANICA[escena.mecanica];
  const hecho = useRef(false);
  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
        <span aria-hidden="true">🛈</span>
        {escena.instruccion}
      </p>
      <Suspense fallback={<p className="text-sm text-slate-400">Cargando sistema…</p>}>
        <Componente
          onCompletar={(r) => {
            if (hecho.current) return;
            hecho.current = true;
            onCompletar(r);
          }}
        />
      </Suspense>
    </div>
  );
}

function Cierre({ resultado, mecanica }: { resultado: Resultado; mecanica: ResultadoMecanica }) {
  const completarMinijuego = useGameStore((s) => s.completarMinijuego);
  const animarTexto = useAjustesStore((s) => s.animarTexto);
  const [listo, setListo] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (listo) botonRef.current?.focus();
  }, [listo]);

  return (
    <div className="mt-3 grid gap-5" role="status">
      <TextoAnimado texto={resultado.textoCierre} animar={animarTexto} onTerminado={() => setListo(true)} className="text-base leading-relaxed text-emerald-100 sm:text-lg" />
      <Aparecer visible={listo}>
        <Boton ref={botonRef} variante="primario" className="w-full sm:w-auto" onClick={() => completarMinijuego(mecanica)}>
          Continuar →
        </Boton>
      </Aparecer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PantallaFin({ envio, onReintentar, onSalir }: { envio: EstadoEnvio; onReintentar: () => void; onSalir?: () => void }) {
  const historial = useGameStore((s) => s.historial);
  const alumnoCodigo = useGameStore((s) => s.alumnoCodigo);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    tituloRef.current?.focus();
    sonido.exito();
  }, []);

  const recorrido = historial.map((h) => escenasPorId.get(h.escenaId)?.titulo).filter(Boolean) as string[];

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-b from-sky-900 via-slate-950 to-slate-950 px-6 py-12 text-center text-slate-100">
      <Burbujas />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(253,224,71,0.25),transparent_70%)]" />
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-amber-200/40 motion-safe:animate-ping" />
        <span className="text-4xl" aria-hidden="true">
          🌅
        </span>
      </div>
      <div className="relative max-w-xl">
        <Etiqueta>Superficie alcanzada</Etiqueta>
        <h1 ref={tituloRef} tabIndex={-1} className="mt-3 text-3xl font-semibold text-white outline-none sm:text-4xl">
          ¡Misión cumplida, {alumnoCodigo}!
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          La cápsula sale a la superficie al amanecer. Irene, Leo y tú lo habéis conseguido juntos. Cada decisión que tomaste formó parte de la historia: no había respuestas buenas ni malas.
        </p>
      </div>

      <ol className="relative flex max-w-2xl flex-wrap justify-center gap-2" aria-label="Tu recorrido">
        {recorrido.map((t, i) => (
          <li key={`${t}-${i}`} className="rounded-full border border-cyan-400/25 bg-black/30 px-3 py-1 text-xs text-cyan-100">
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      <p role="status" aria-live="polite" className="relative font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">
        {envio === 'enviando' && <span className="motion-safe:animate-pulse">Transmitiendo bitácora…</span>}
        {envio === 'enviado' && '✓ Bitácora transmitida'}
        {envio === 'error' && <span className="text-amber-300">No se pudo transmitir la bitácora</span>}
      </p>
      <div className="relative flex flex-wrap justify-center gap-3">
        {envio === 'error' && (
          <Boton variante="primario" onClick={onReintentar}>
            Reintentar envío
          </Boton>
        )}
        {onSalir && (
          <Boton onClick={onSalir} disabled={envio === 'enviando'}>
            Volver al inicio
          </Boton>
        )}
      </div>
    </main>
  );
}

function PantallaError({ escenaId }: { escenaId: string }) {
  const reiniciarPartida = useGameStore((s) => s.reiniciarPartida);
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-300">
      <p className="font-mono text-sm text-red-300">Escena no encontrada: {escenaId}</p>
      <Boton variante="primario" onClick={() => reiniciarPartida()}>
        Reiniciar partida
      </Boton>
    </main>
  );
}
