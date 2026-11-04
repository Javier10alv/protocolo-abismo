import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { sonido } from '../audio/sonido';
import Retrato, { NOMBRE_PERSONAJE } from '../components/Retrato';
import { Boton, Etiqueta, Panel } from '../components/ui';
import { codigoValido, CODIGO_DOCENTE, normalizarNombre } from '../config';
import { escenasPorId } from '../data/guion';
import { useAjustesStore } from '../store/useAjustesStore';
import { SIN_ALUMNO, useGameStore } from '../store/useGameStore';

// Letras (con tildes, ñ, ü), espacios, apóstrofos y guiones.
const RE_NOMBRE = /^[\p{L}' -]+$/u;

export default function Entrada() {
  const navigate = useNavigate();
  const guardada = useGameStore(
    useShallow((s) => ({ nombre: s.alumnoNombre, codigo: s.alumnoCodigo, escena: s.escenaActual, completada: s.completada, pasos: s.historial.length })),
  );
  const iniciarPartida = useGameStore((s) => s.iniciarPartida);
  const { sonido: sonidoOn, alternar } = useAjustesStore();

  const hayGuardada = guardada.codigo !== SIN_ALUMNO && !guardada.completada && guardada.pasos > 0;
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [errores, setErrores] = useState<{ nombre?: string; codigo?: string }>({});
  const [paso, setPaso] = useState<'datos' | 'briefing'>('datos');
  const idNombre = useId();
  const idCodigo = useId();
  const tituloBriefing = useRef<HTMLHeadingElement>(null);
  const continuaGuardada = hayGuardada && normalizarNombre(nombre) === normalizarNombre(guardada.nombre);

  useEffect(() => {
    if (paso === 'briefing') tituloBriefing.current?.focus();
  }, [paso]);

  const validar = () => {
    const e: typeof errores = {};
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    if (limpio.length < 3 || limpio.length > 80 || !RE_NOMBRE.test(limpio) || !limpio.includes(' ')) {
      e.nombre = 'Escribe tu nombre y apellidos (solo letras).';
    }
    if (!codigoValido(codigo)) e.codigo = 'El código de verificación no es correcto. Pídeselo a tu docente.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const continuar = (ev: FormEvent) => {
    ev.preventDefault();
    if (!validar()) return;
    sonido.seleccion();
    if (continuaGuardada) {
      navigate('/jugar');
      return;
    }
    setPaso('briefing');
  };

  const empezar = () => {
    // Cada partida nueva recibe un ID único; el nombre queda asociado a ese ID.
    iniciarPartida(nombre.trim().replace(/\s+/g, ' '), CODIGO_DOCENTE);
    sonido.iniciarAmbiente();
    navigate('/jugar');
  };

  const primerNombre = nombre.trim().split(/\s+/)[0] ?? '';

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <div aria-hidden="true" className="fixed inset-0 bg-cover bg-center opacity-50 motion-safe:animate-[deriva_40s_ease-in-out_infinite_alternate]" style={{ backgroundImage: 'url(/img/base.webp)' }} />
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
                <label htmlFor={idNombre} className="text-sm font-medium text-cyan-100">
                  Nombre completo
                </label>
                <input
                  id={idNombre}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre y apellidos"
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={!!errores.nombre}
                  aria-describedby={`${idNombre}-ayuda${errores.nombre ? ` ${idNombre}-error` : ''}`}
                  className="min-h-12 rounded-xl border border-cyan-400/30 bg-slate-900/80 px-4 text-lg text-white placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                />
                <p id={`${idNombre}-ayuda`} className="text-xs text-slate-400">
                  Solo lo verá tu docente.
                </p>
                {errores.nombre && (
                  <p id={`${idNombre}-error`} role="alert" className="text-sm text-amber-300">
                    {errores.nombre}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor={idCodigo} className="text-sm font-medium text-cyan-100">
                  Código de verificación del docente
                </label>
                <input
                  id={idCodigo}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Código que te ha dado tu docente"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={20}
                  aria-invalid={!!errores.codigo}
                  aria-describedby={errores.codigo ? `${idCodigo}-error` : undefined}
                  className="min-h-12 rounded-xl border border-cyan-400/30 bg-slate-900/80 px-4 font-mono text-lg tracking-widest text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                />
                {errores.codigo && (
                  <p id={`${idCodigo}-error`} role="alert" className="flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    <span aria-hidden="true">⛔</span> {errores.codigo}
                  </p>
                )}
              </div>

              {hayGuardada && (
                <p className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
                  Hay una misión en pausa en «{escenasPorId.get(guardada.escena)?.titulo}». Escribe el mismo nombre para continuarla.
                </p>
              )}

              <Boton type="submit" variante="primario" className="min-h-12 text-lg" silencioso>
                {continuaGuardada ? 'Continuar la misión →' : 'Entrar en la estación →'}
              </Boton>
            </form>
          </Panel>
        ) : (
          <Panel className="grid gap-5 p-5 sm:p-7">
            <h2 ref={tituloBriefing} tabIndex={-1} className="text-2xl font-semibold text-white outline-none">
              Antes de bajar, {primerNombre}
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
                <span>Tu partida se guarda sola. Dura unos 15 minutos.</span>
              </li>
            </ul>
            <ul className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3" aria-label="El equipo">
              {(
                [
                  ['lisa', 'Bióloga jefa. Experta en cultivos y soporte vital.'],
                  ['leo', 'Ingeniero mecánico en prácticas. Hábil con las máquinas, pero algo inseguro.'],
                  ['reyes', 'Jefe de seguridad y piloto. Conoce todos los protocolos.'],
                  ['aris', 'Científica de datos. Domina servidores y sistemas digitales.'],
                ] as const
              ).map(([p, texto]) => (
                <li key={p} className="flex items-center gap-3">
                  <Retrato personaje={p} tamano={40} />
                  <p className="text-sm">
                    <strong className="text-white">{NOMBRE_PERSONAJE[p]}</strong> <span className="text-slate-400">· {texto}</span>
                  </p>
                </li>
              ))}
            </ul>
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
