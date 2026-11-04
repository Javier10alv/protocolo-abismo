import { useEffect, useMemo, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { opcionesAplazadas, opcionesCompletadas, opcionesHechas, progresoDe } from '../data/guion';
import { OBJETOS_POR_ID } from '../data/objetos';
import { hubCompletado } from '../logica/partida';
import { useAjustesStore } from '../store/useAjustesStore';
import { useGameStore } from '../store/useGameStore';
import { NOMBRE_HABILIDAD, type EscenaHub, type Habilidad, type LineaDialogo, type Personaje } from '../types/game';
import Escenario from './Escenario';
import ExplorarSala from './ExplorarSala';
import { BarraSuperior, Burbujas } from './Marco';
import Retrato, { NOMBRE_PERSONAJE } from './Retrato';
import { Boton, Etiqueta, Panel, TextoAnimado } from './ui';

const ICONO_AREA: Record<Habilidad, string> = {
  logica: '⚙️',
  creatividad: '🌱',
  liderazgo: '🧭',
  comunicacion: '📡',
  resiliencia: '🛰️',
};

const ORDINAL = ['1.º', '2.º', '3.º', '4.º', '5.º'];

/**
 * Hub central (novela visual). La primera vez: Leo entra y explica el problema,
 * Lisa entra y pregunta, y aparece el menú. Al volver de cada minijuego, la opción
 * hecha desaparece y Lisa vuelve a preguntar con una frase adaptada.
 */
export default function PantallaHub({ escena, onSalir }: { escena: EscenaHub; onSalir?: () => void }) {
  const historial = useGameStore((s) => s.historial);
  const inventario = useGameStore((s) => s.inventario);
  const progreso = useGameStore((s) => progresoDe(s));
  const elegirArea = useGameStore((s) => s.elegirArea);
  const salir = useGameStore((s) => s.salirDelHub);
  const animarTexto = useAjustesStore((s) => s.animarTexto);

  const elegidas = useMemo(() => opcionesHechas({ historial }, escena), [historial, escena]);
  const hechas = useMemo(() => opcionesCompletadas({ historial }, escena), [historial, escena]);
  const aplazadas = useMemo(() => opcionesAplazadas({ historial }, escena), [historial, escena]);
  const completo = hubCompletado({ historial }, escena);
  const pendientes = escena.opciones.filter((o) => !hechas.some((h) => h.id === o.id));
  const vieneDeRetirada = historial[historial.length - 1]?.retirada === true;

  // Guion de esta visita al hub.
  const lineas: LineaDialogo[] = useMemo(() => {
    if (completo) return [escena.cierre];
    if (elegidas.length === 0) return [...escena.introduccion, escena.pregunta];
    if (vieneDeRetirada) return [escena.lineaRetirada];
    return [escena.preguntasRetorno[Math.max(0, Math.min(hechas.length, escena.preguntasRetorno.length) - 1)]];
  }, [completo, elegidas.length, hechas.length, vieneDeRetirada, escena]);

  const [paso, setPaso] = useState(0);
  const [textoListo, setTextoListo] = useState(false);
  const [visible, setVisible] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const siguienteRef = useRef<HTMLButtonElement>(null);

  const linea = lineas[Math.min(paso, lineas.length - 1)];
  const ultima = paso >= lineas.length - 1;

  // Quién está en escena: en la presentación entran a medida que hablan; al volver, están todos.
  const enEscena: Personaje[] = useMemo(() => {
    if (elegidas.length > 0 || completo) return escena.personajes ?? [];
    return [...new Set(lineas.slice(0, paso + 1).map((l) => l.personaje))];
  }, [elegidas.length, completo, escena.personajes, lineas, paso]);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 30);
    tituloRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (textoListo && !ultima) siguienteRef.current?.focus({ preventScroll: true });
  }, [textoListo, ultima]);

  const avanzar = () => {
    if (ultima) return;
    sonido.click();
    setTextoListo(false);
    setPaso((p) => p + 1);
  };

  const elegir = (id: string) => {
    if (elegida) return;
    sonido.seleccion();
    setElegida(id);
    window.setTimeout(() => elegirArea(id), 450);
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <Escenario escena={escena} visible={visible} enEscena={enEscena} hablando={linea.personaje} />
      <Burbujas />
      <BarraSuperior progreso={progreso} texto={linea.texto} onSalir={onSalir} />
      <h1 ref={tituloRef} tabIndex={-1} className="sr-only">
        {escena.titulo}
      </h1>

      <section className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col justify-end gap-3 px-4 pb-4 pt-6 sm:px-8 sm:pb-8">
        {(hechas.length > 0 || aplazadas.length > 0 || inventario.length > 0) && (
          <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2">
            {hechas.length > 0 && (
              <ol className="flex flex-wrap gap-2" aria-label="Problemas resueltos">
                {hechas.map((o, i) => (
                  <li key={o.id} className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 backdrop-blur">
                    ✓ {ORDINAL[i]} {NOMBRE_HABILIDAD[o.area]}
                  </li>
                ))}
              </ol>
            )}
            {aplazadas.map((o) => (
              <span key={o.id} className="rounded-full border border-amber-300/30 bg-amber-500/15 px-3 py-1 text-xs text-amber-100 backdrop-blur">
                ⏸ {NOMBRE_HABILIDAD[o.area]} (aplazado)
              </span>
            ))}
            {inventario.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label="Inventario">
                {inventario.map((i) => {
                  const o = OBJETOS_POR_ID.get(i.id);
                  return o ? (
                    <li key={i.id} title={o.nombre} className="rounded-full border border-amber-300/20 bg-black/40 px-2 py-1 text-xs text-amber-50 backdrop-blur">
                      <span aria-hidden="true">{o.icono}</span>
                      <span className="sr-only">{o.nombre}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
          </div>
        )}

        <Panel className={`mx-auto w-full max-w-3xl p-5 transition-[opacity,transform] delay-150 duration-700 ease-out motion-reduce:transition-none sm:p-7 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {/* Caja de diálogo */}
          <div
            className="flex cursor-pointer items-start gap-4"
            onClick={() => textoListo && avanzar()}
          >
            <Retrato personaje={linea.personaje} tamano={56} expresion={linea.personaje === 'leo' && hechas.length === 0 ? 'preocupado' : 'neutral'} />
            <div className="min-w-0 flex-1">
              <Etiqueta>{NOMBRE_PERSONAJE[linea.personaje]}</Etiqueta>
              <TextoAnimado
                key={`${hechas.length}-${paso}`}
                texto={linea.texto}
                animar={animarTexto}
                onTerminado={() => setTextoListo(true)}
                className="mt-2 text-base leading-relaxed text-slate-100 sm:text-lg"
              />
            </div>
          </div>

          {!ultima && (
            <div className="mt-4 flex justify-end">
              <Boton ref={siguienteRef} variante="primario" onClick={avanzar} disabled={!textoListo}>
                Siguiente ▸
              </Boton>
            </div>
          )}

          {ultima && textoListo && (
            <div className="mt-5 motion-safe:animate-[aparecer_400ms_ease-out]">
              <div className="mb-4 h-px bg-gradient-to-r from-cyan-400/40 via-cyan-400/10 to-transparent" />
              {completo ? (
                <Boton variante="primario" className="w-full sm:w-auto" onClick={salir}>
                  Continuar →
                </Boton>
              ) : (
                <>
                <ul className="grid gap-3" aria-label="¿Qué atiendes ahora?">
                  {pendientes.map((o) => {
                    const esta = elegida === o.id;
                    const aplazada = aplazadas.some((a) => a.id === o.id);
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => elegir(o.id)}
                          disabled={elegida !== null}
                          className={`group flex w-full items-start gap-4 rounded-xl border px-4 py-3.5 text-left text-base transition-all duration-300 ease-out focus-visible:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 active:scale-[0.99] motion-reduce:transition-none ${
                            esta
                              ? 'border-cyan-200 bg-cyan-400/25 text-white shadow-[0_0_28px_-6px_rgba(34,211,238,0.8)]'
                              : elegida
                                ? 'border-cyan-400/10 bg-slate-900/40 text-slate-500'
                                : 'border-cyan-400/20 bg-slate-900/60 text-slate-200 hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-white'
                          }`}
                        >
                          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-400/40 text-lg">
                            {ICONO_AREA[o.area]}
                          </span>
                          <span>
                            {aplazada && <span className="mr-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-100">Aplazado · retomar</span>}
                            {o.textoBoton}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 grid">
                  <ExplorarSala key={historial.length} escenaId={escena.id} etiqueta="🔍 Echar un vistazo a la sala de control" />
                </div>
                </>
              )}
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}
