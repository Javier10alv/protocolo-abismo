import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { sonido } from '../audio/sonido';
import { escenasPorId, hubDeEscena, progresoDe, siguientesDe } from '../data/guion';
import { JUICIO } from '../data/juicio';
import { COMPONENTES_MECANICA } from '../mecanicas';
import { useAjustesStore } from '../store/useAjustesStore';
import { useCinematicasStore } from '../store/useCinematicasStore';
import { seleccionarEstadoAlumno, useGameStore } from '../store/useGameStore';
import {
  FIN,
  type EscenaDecision,
  type EscenaMinijuego,
  type EstadoAlumno,
  type EventoJuego,
  type Resultado,
  type ResultadoMecanica,
  type Scene,
} from '../types/game';
import Cinematica from './Cinematica';
import Escenario from './Escenario';
import ExplorarSala from './ExplorarSala';
import { BarraSuperior, Burbujas } from './Marco';
import PantallaHub from './PantallaHub';
import Retrato, { NOMBRE_PERSONAJE, ROL_PERSONAJE } from './Retrato';
import { Bocadillo, Boton, Etiqueta, Panel, TextoAnimado } from './ui';

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
  return <EscenaConCinematica key={escena.id} escena={escena} partidaId={partidaId} onSalir={onSalir} />;
}

/** Reproduce, en orden, las cinemáticas de la escena que aún no se han visto en esta partida. */
function EscenaConCinematica({ escena, partidaId, onSalir }: { escena: Scene; partidaId: string; onSalir?: () => void }) {
  const vistas = useCinematicasStore((s) => s.vistas);
  const marcar = useCinematicasStore((s) => s.marcar);
  const lista = escena.cinematicas ?? [];
  const pendiente = lista.findIndex((_, i) => !vistas.includes(`${partidaId}:${escena.id}:${i}`));
  const hayVideo = pendiente >= 0;

  useEffect(() => {
    if (!hayVideo) return;
    // El zumbido ambiente se pausa mientras suena el vídeo.
    sonido.detenerAmbiente();
    return () => sonido.iniciarAmbiente();
  }, [hayVideo]);

  if (hayVideo) {
    return (
      <Cinematica
        key={pendiente}
        cinematica={lista[pendiente]}
        onTerminar={() => marcar(`${partidaId}:${escena.id}:${pendiente}`)}
      />
    );
  }
  if (escena.tipo === 'hub') return <PantallaHub escena={escena} onSalir={onSalir} />;
  return <PantallaEscena escena={escena} onSalir={onSalir} />;
}

/* -------------------------------------------------------------------------- */

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

/** Precarga los vídeos de las escenas a las que se puede llegar desde esta, para que la transición sea fluida. */
function PrecargarCinematicas({ escena }: { escena: Scene }) {
  const srcs = new Set<string>();
  for (const id of siguientesDe(escena)) {
    const siguiente = escenasPorId.get(id);
    if (siguiente?.cinematicas?.[0]) srcs.add(siguiente.cinematicas[0].src);
    // Precarga también el fondo, para que la transición no muestre un hueco negro.
    if (siguiente) srcs.add(siguiente.imagen);
  }
  return (
    <>
      {[...srcs].map((src) => (
        <link key={src} rel="prefetch" href={src} as={src.endsWith('.mp4') ? 'video' : 'image'} />
      ))}
    </>
  );
}

function PantallaEscena({ escena, onSalir }: { escena: EscenaDecision | EscenaMinijuego; onSalir?: () => void }) {
  const progreso = useGameStore((s) => progresoDe(s));
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
      <Escenario escena={escena} visible={visible} />
      <Burbujas />
      <PrecargarCinematicas escena={escena} />
      <BarraSuperior progreso={progreso} texto={textoLectura} onSalir={onSalir} />

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
                    <Retrato personaje={p} tamano={44} expresion={escena.tipo === 'decision' ? 'contento' : 'neutral'} />
                    <span className="sr-only">
                      {NOMBRE_PERSONAJE[p]}, {ROL_PERSONAJE[p]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cierre ? (
            <Cierre resultado={cierre.resultado} mecanica={cierre.mecanica} escena={escena as EscenaMinijuego} />
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
  const inicio = useRef(Date.now());
  const eventos = useRef<EventoJuego[]>([]);
  const inventario = useGameStore(useShallow((s) => s.inventario.map((o) => o.id)));
  const reintento = useGameStore((s) => s.historial.some((r) => r.escenaId === escena.id && r.retirada));
  const retirarse = useGameStore((s) => s.retirarse);
  const [confirmar, setConfirmar] = useState(false);
  const puedeRetirarse = !!hubDeEscena(escena.id);

  // Registro de telemetría: estable entre renders para que las mecánicas puedan usarlo en efectos.
  const registrar = useCallback((tipo: string, datos?: EventoJuego['datos']) => {
    if (hecho.current) return;
    eventos.current.push({ t: Math.round((Date.now() - inicio.current) / 100) / 10, tipo, ...(datos ? { datos } : {}) });
  }, []);

  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
        <span aria-hidden="true">🛈</span>
        {escena.instruccion}
      </p>
      {reintento && (
        <Bocadillo personaje={escena.personajes?.[0] ?? 'lisa'} expresion="contento">
          ¡Has vuelto! Empezamos de nuevo con calma: puede que ahora tengas otras ideas… o algo nuevo en el inventario.
        </Bocadillo>
      )}
      <ExplorarSala escenaId={escena.id} registrar={registrar} />
      <Suspense fallback={<p className="text-sm text-slate-400">Cargando sistema…</p>}>
        <Componente
          registrar={registrar}
          inventario={inventario}
          reintento={reintento}
          onCompletar={(r) => {
            if (hecho.current) return;
            hecho.current = true;
            onCompletar({ ...r, eventos: eventos.current });
          }}
        />
      </Suspense>
      {puedeRetirarse && !confirmar && (
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          className="justify-self-start rounded-lg px-2 py-1 text-sm text-slate-400 underline-offset-4 hover:text-cyan-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          ↩ Volver a la sala de control y hacerlo más tarde
        </button>
      )}
      {confirmar && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          <span className="flex-1 basis-56">Este reto quedará aplazado: podrás volver cuando quieras y empezarlo de nuevo.</span>
          <Boton onClick={() => setConfirmar(false)}>Seguir aquí</Boton>
          <Boton
            variante="primario"
            onClick={() => {
              if (hecho.current) return;
              hecho.current = true;
              retirarse([...eventos.current, { t: Math.round((Date.now() - inicio.current) / 100) / 10, tipo: 'retirada' }]);
            }}
          >
            Volver a la sala
          </Boton>
        </div>
      )}
    </div>
  );
}

function Cierre({ resultado, mecanica, escena }: { resultado: Resultado; mecanica: ResultadoMecanica; escena: EscenaMinijuego }) {
  const completarMinijuego = useGameStore((s) => s.completarMinijuego);
  const animarTexto = useAjustesStore((s) => s.animarTexto);
  const [listo, setListo] = useState(false);
  const [respuesta, setRespuesta] = useState<number | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  // Pregunta breve de juicio situacional (solo en los retos del hub).
  const juicio = hubDeEscena(escena.id) ? JUICIO[escena.mecanica] : undefined;
  const puedeSeguir = listo && (!juicio || respuesta !== null);

  useEffect(() => {
    if (puedeSeguir) botonRef.current?.focus();
  }, [puedeSeguir]);

  const continuar = () => {
    if (!juicio || respuesta === null) return completarMinijuego(mecanica);
    const opcion = juicio.opciones[respuesta];
    const t = mecanica.eventos?.length ? mecanica.eventos[mecanica.eventos.length - 1].t : 0;
    completarMinijuego({
      ...mecanica,
      indicadores: { ...mecanica.indicadores, [`sjt_${juicio.habilidad}`]: opcion.valor },
      eventos: [...(mecanica.eventos ?? []), { t, tipo: 'sjt', datos: { habilidad: juicio.habilidad, opcion: respuesta } }],
    });
  };

  const texto = mecanica.notaCierre ? `${resultado.textoCierre} ${mecanica.notaCierre}` : resultado.textoCierre;

  return (
    <div className="mt-3 grid gap-5" role="status">
      <TextoAnimado texto={texto} animar={animarTexto} onTerminado={() => setListo(true)} className="text-base leading-relaxed text-emerald-100 sm:text-lg" />
      {juicio && (
        <Aparecer visible={listo}>
          <div className="grid gap-3 rounded-xl border border-cyan-400/20 bg-slate-900/60 p-3">
            <Bocadillo personaje={juicio.personaje} anunciar={false}>
              Antes de seguir, una pregunta rápida: {juicio.pregunta}
            </Bocadillo>
            <ul className="grid gap-2" aria-label="Tu respuesta">
              {juicio.opciones.map((o, i) => (
                <li key={o.texto}>
                  <button
                    type="button"
                    aria-pressed={respuesta === i}
                    onClick={() => {
                      sonido.click();
                      setRespuesta(i);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      respuesta === i ? 'border-cyan-200 bg-cyan-400/25 text-white' : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                    }`}
                  >
                    {o.texto}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Aparecer>
      )}
      <Aparecer visible={puedeSeguir}>
        <Boton ref={botonRef} variante="primario" className="w-full sm:w-auto" onClick={continuar}>
          Continuar →
        </Boton>
      </Aparecer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PantallaFin({ envio, onReintentar, onSalir }: { envio: EstadoEnvio; onReintentar: () => void; onSalir?: () => void }) {
  const historial = useGameStore((s) => s.historial);
  const primerNombre = useGameStore((s) => s.alumnoNombre.split(' ')[0]);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    tituloRef.current?.focus();
    sonido.exito();
  }, []);

  // Recorrido: los problemas que fue resolviendo, en el orden que eligió.
  const recorrido = historial
    .filter((h) => !h.retirada && escenasPorId.get(h.escenaId)?.tipo === 'minijuego')
    .map((h) => escenasPorId.get(h.escenaId)!.titulo);

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
          ¡Misión cumplida, {primerNombre}!
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          El batiscafo de rescate sale a la superficie al amanecer. Lisa, Leo, Reyes, Aris y tú lo habéis conseguido juntos. Cada decisión que tomaste formó parte de la historia: no había respuestas buenas ni malas.
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
