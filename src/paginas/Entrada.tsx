import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { sonido } from '../audio/sonido';
import Retrato from '../components/Retrato';
import { Boton, Etiqueta, Panel } from '../components/ui';
import { escenasPorId } from '../data/guion';
import { generarCodigo } from '../logica/simulacion';
import { useAjustesStore } from '../store/useAjustesStore';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore';

const RE_CODIGO = /^[A-Z0-9-]+$/;

function normalizar(v: string) {
  return v.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');
}

export default function Entrada() {
  const navigate = useNavigate();
  const guardada = useGameStore(
    useShallow((s) => ({ codigo: s.alumnoCodigo, clase: s.claseId, escena: s.escenaActual, completada: s.completada, pasos: s.historial.length })),
  );
  const reiniciarPartida = useGameStore((s) => s.reiniciarPartida);
  const { sonido: sonidoOn, alternar } = useAjustesStore();

  const hayGuardada = guardada.codigo !== 'ANON' && !guardada.completada && guardada.pasos > 0;
  const [clase, setClase] = useState(guardada.codigo !== 'ANON' ? guardada.clase : '');
  const [codigo, setCodigo] = useState(guardada.codigo !== 'ANON' ? guardada.codigo : '');
  const [errores, setErrores] = useState<{ clase?: string; codigo?: string }>({});
  const [paso, setPaso] = useState<'datos' | 'briefing'>('datos');
  const idClase = useId();
  const idCodigo = useId();
  const tituloBriefing = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (paso === 'briefing') tituloBriefing.current?.focus();
  }, [paso]);

  const validar = () => {
    const e: typeof errores = {};
    if (clase.length < 2 || clase.length > 20 || !RE_CODIGO.test(clase)) e.clase = 'Escribe el código de clase que te ha dado tu docente (por ejemplo, 2ESO-B).';
    if (codigo.length < 3 || codigo.length > 12 || !RE_CODIGO.test(codigo)) e.codigo = 'Tu código debe tener entre 3 y 12 letras o números.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const continuar = (ev: FormEvent) => {
    ev.preventDefault();
    if (!validar()) return;
    sonido.seleccion();
    if (hayGuardada && guardada.codigo === codigo && guardada.clase === clase) {
      navigate('/jugar');
      return;
    }
    setPaso('briefing');
  };

  const empezar = () => {
    reiniciarPartida(codigo, clase);
    sonido.iniciarAmbiente();
    navigate('/jugar');
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <div aria-hidden="true" className="fixed inset-0 bg-cover bg-center opacity-50 motion-safe:animate-[deriva_40s_ease-in-out_infinite_alternate]" style={{ backgroundImage: 'url(/img/esc_10_capsula.svg)' }} />
      <div aria-hidden="true" className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-4 py-10">
        <header className="text-center">
          <Etiqueta>Estación de investigación · -3.000 m</Etiqueta>
          <h1 className="mt-3 bg-gradient-to-b from-white to-cyan-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
            Protocolo Abismo
          </h1>
          <p className="mt-3 text-lg text-slate-300">Una aventura submarina en la que tus decisiones cuentan la historia.</p>
        </header>

        {paso === 'datos' ? (
          <Panel className="p-5 sm:p-7">
            <form onSubmit={continuar} noValidate className="grid gap-5">
              <div className="grid gap-1.5">
                <label htmlFor={idClase} className="text-sm font-medium text-cyan-100">
                  Código de clase
                </label>
                <input
                  id={idClase}
                  value={clase}
                  onChange={(e) => setClase(normalizar(e.target.value))}
                  placeholder="2ESO-B"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={20}
                  aria-invalid={!!errores.clase}
                  aria-describedby={errores.clase ? `${idClase}-error` : undefined}
                  className="min-h-12 rounded-xl border border-cyan-400/30 bg-slate-900/80 px-4 font-mono text-lg tracking-widest text-white placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                />
                {errores.clase && (
                  <p id={`${idClase}-error`} className="text-sm text-amber-300">
                    {errores.clase}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor={idCodigo} className="text-sm font-medium text-cyan-100">
                  Tu código de investigador/a
                </label>
                <div className="flex gap-2">
                  <input
                    id={idCodigo}
                    value={codigo}
                    onChange={(e) => setCodigo(normalizar(e.target.value))}
                    placeholder="A7K2"
                    autoComplete="off"
                    autoCapitalize="characters"
                    maxLength={12}
                    aria-invalid={!!errores.codigo}
                    aria-describedby={`${idCodigo}-ayuda${errores.codigo ? ` ${idCodigo}-error` : ''}`}
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-cyan-400/30 bg-slate-900/80 px-4 font-mono text-lg tracking-widest text-white placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                  />
                  <Boton onClick={() => setCodigo(generarCodigo())} title="Generar un código al azar">
                    🎲
                  </Boton>
                </div>
                <p id={`${idCodigo}-ayuda`} className="text-xs text-slate-400">
                  Usa el código que te ha dado tu docente. Nunca escribas tu nombre.
                </p>
                {errores.codigo && (
                  <p id={`${idCodigo}-error`} className="text-sm text-amber-300">
                    {errores.codigo}
                  </p>
                )}
              </div>

              {hayGuardada && (
                <p className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
                  Hay una misión en pausa de <strong className="font-mono">{guardada.codigo}</strong> en «{escenasPorId.get(guardada.escena)?.titulo}». Escribe el mismo código para continuarla.
                </p>
              )}

              <Boton type="submit" variante="primario" className="min-h-12 text-lg" silencioso>
                {hayGuardada && guardada.codigo === codigo && guardada.clase === clase ? 'Continuar la misión →' : 'Entrar en la estación →'}
              </Boton>
            </form>
          </Panel>
        ) : (
          <Panel className="grid gap-5 p-5 sm:p-7">
            <h2 ref={tituloBriefing} tabIndex={-1} className="text-2xl font-semibold text-white outline-none">
              Antes de bajar, {codigo}
            </h2>
            <ul className="grid gap-3 text-slate-300">
              <li className="flex gap-3">
                <span aria-hidden="true">🌊</span>
                <span>Un temblor ha dañado la estación. Tendrás que cooperar con dos supervivientes para volver a la superficie.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">🧭</span>
                <span>
                  <strong className="text-white">No es un examen.</strong> No hay respuestas buenas ni malas: elige lo que tú harías.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">🛠️</span>
                <span>Encontrarás retos: cables, mapas, inventos… Equivocarse forma parte del juego y siempre puedes pedir ayuda.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">⏸</span>
                <span>Tu partida se guarda sola. Dura unos 15–20 minutos.</span>
              </li>
            </ul>
            <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-center gap-3">
                <Retrato personaje="irene" tamano={40} />
                <p className="text-sm">
                  <strong className="text-white">Irene</strong> <span className="text-slate-400">· Ingeniera jefa. Sabe muchísimo y está agotada.</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Retrato personaje="leo" tamano={40} expresion="preocupado" />
                <p className="text-sm">
                  <strong className="text-white">Leo</strong> <span className="text-slate-400">· Técnico en prácticas. Detallista y un poco asustado.</span>
                </p>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" checked={sonidoOn} onChange={() => alternar('sonido')} className="h-5 w-5 accent-cyan-400" />
              Jugar con sonido (mejor con auriculares)
            </label>
            <div className="flex flex-wrap gap-3">
              <Boton variante="primario" className="min-h-12 flex-1 text-lg" onClick={empezar} silencioso>
                Comenzar la misión
              </Boton>
              <Boton variante="fantasma" onClick={() => setPaso('datos')}>
                ← Volver
              </Boton>
            </div>
          </Panel>
        )}

        <footer className="text-center text-sm text-slate-500">
          <Link to="/docente" className="rounded px-2 py-1 text-slate-400 underline-offset-4 hover:text-cyan-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Acceso docente →
          </Link>
        </footer>
      </div>
    </main>
  );
}
