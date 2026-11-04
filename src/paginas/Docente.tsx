import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import DetallePartida from '../components/docente/DetallePartida';
import VistaClase, { mediaHabilidades } from '../components/docente/VistaClase';
import { Boton, Etiqueta } from '../components/ui';
import { VERSION_GUION, escenas } from '../data/guion';
import { duracionMinutos, ordenarHabilidades, porcentajes } from '../logica/puntuacion';
import { generarCodigo, generarPartidasDemo } from '../logica/simulacion';
import { MECANICAS_INFO } from '../mecanicas/registro';
import {
  MODO,
  borrarPartidasLocales,
  cerrarSesion,
  crearClase,
  iniciarSesion,
  importarPartidasLocales,
  listarPartidas,
  sesionDocente,
} from '../servicios/partidas';
import { HABILIDADES, NOMBRE_HABILIDAD, type EstadoAlumno } from '../types/game';

type Pestana = 'clase' | 'alumnado' | 'herramientas';

export default function Docente() {
  const [sesion, setSesion] = useState(sesionDocente);
  if (MODO === 'supabase' && !sesion) return <Login onEntrar={setSesion} />;
  return (
    <Panel
      onSalir={
        MODO === 'supabase'
          ? () => {
              cerrarSesion();
              setSesion(null);
            }
          : undefined
      }
    />
  );
}

function Login({ onEntrar }: { onEntrar: (s: ReturnType<typeof sesionDocente>) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      onEntrar(await iniciarSesion(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 text-slate-100">
      <form onSubmit={enviar} className="grid w-full max-w-sm gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <Etiqueta>Panel del docente</Etiqueta>
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <label className="grid gap-1 text-sm">
          Correo
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 focus:border-cyan-300 focus:outline-none" />
        </label>
        <label className="grid gap-1 text-sm">
          Contraseña
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 focus:border-cyan-300 focus:outline-none" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <Boton type="submit" variante="primario" disabled={cargando} silencioso>
          {cargando ? 'Entrando…' : 'Entrar'}
        </Boton>
        <Link to="/" className="text-center text-sm text-slate-400 hover:text-cyan-200">← Volver al juego</Link>
      </form>
    </main>
  );
}

function exportarCSV(partidas: EstadoAlumno[]) {
  const cab = ['clase', 'codigo', 'version', 'inicio', 'minutos', 'completada', ...HABILIDADES.map((h) => `${h}_pct`), 'fortaleza_principal'];
  const filas = partidas.map((p) => {
    const pct = porcentajes(p);
    return [p.claseId, p.alumnoCodigo, p.version, p.iniciadaEn, duracionMinutos(p) ?? '', p.completada, ...HABILIDADES.map((h) => pct[h]), ordenarHabilidades(pct)[0]];
  });
  const csv = [cab, ...filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `protocolo-abismo-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Panel({ onSalir }: { onSalir?: () => void }) {
  const [partidas, setPartidas] = useState<EstadoAlumno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [clase, setClase] = useState<string>('');
  const [pestana, setPestana] = useState<Pestana>('clase');
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPartidas(await listarPartidas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const clases = useMemo(() => [...new Set(partidas.map((p) => p.claseId))].sort(), [partidas]);
  const claseActiva = clase && clases.includes(clase) ? clase : (clases[0] ?? '');
  const deLaClase = partidas.filter((p) => p.claseId === claseActiva && p.version === VERSION_GUION);
  const otrasVersiones = partidas.filter((p) => p.claseId === claseActiva && p.version !== VERSION_GUION).length;
  const media = mediaHabilidades(deLaClase);
  const filtradas = deLaClase.filter((p) => p.alumnoCodigo.includes(busqueda.toUpperCase()));
  const elegida = deLaClase.find((p) => p.partidaId === seleccion) ?? filtradas[0];

  const verAlumno = (id: string) => {
    setSeleccion(id);
    setPestana('alumnado');
  };

  const pestanas: { id: Pestana; nombre: string }[] = [
    { id: 'clase', nombre: 'Clase' },
    { id: 'alumnado', nombre: 'Alumnado' },
    { id: 'herramientas', nombre: 'Herramientas' },
  ];

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="no-imprimir sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <Etiqueta>Protocolo Abismo</Etiqueta>
            <p className="text-lg font-semibold">Panel del docente</p>
          </div>
          {clases.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Clase
              <select value={claseActiva} onChange={(e) => setClase(e.target.value)} className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-slate-100 focus:border-cyan-300 focus:outline-none">
                {clases.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <Boton variante="fantasma" onClick={() => void cargar()} aria-label="Recargar partidas">⟳</Boton>
          {onSalir && <Boton variante="fantasma" onClick={onSalir}>Salir</Boton>}
          <Link to="/" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Ir al juego</Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4" role="tablist" aria-label="Secciones del panel">
          {pestanas.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={pestana === p.id}
              onClick={() => setPestana(p.id)}
              className={`border-b-2 px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${pestana === p.id ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              {p.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
        {MODO === 'local' && (
          <p className="no-imprimir rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
            <strong>Modo demo local:</strong> las partidas se guardan solo en este navegador y el panel no pide contraseña. Configura Supabase para usarlo con una clase real (ver README).
          </p>
        )}
        {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">{error}</p>}
        {otrasVersiones > 0 && (
          <p className="text-sm text-slate-500">{otrasVersiones} partida(s) de esta clase usan otra versión del guion y no se comparan.</p>
        )}

        {cargando ? (
          <p className="text-slate-400">Cargando partidas…</p>
        ) : pestana === 'clase' ? (
          partidas.length === 0 ? (
            <Vacio onDemo={() => { importarPartidasLocales(generarPartidasDemo()); void cargar(); }} />
          ) : (
            <VistaClase partidas={deLaClase} onElegir={verAlumno} />
          )
        ) : pestana === 'alumnado' ? (
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="no-imprimir grid content-start gap-2">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar código…"
                aria-label="Buscar por código"
                className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm focus:border-cyan-300 focus:outline-none"
              />
              <ul className="grid max-h-[70dvh] gap-1 overflow-auto" aria-label="Partidas">
                {filtradas.map((p) => {
                  const f = ordenarHabilidades(porcentajes(p))[0];
                  const activa = elegida?.partidaId === p.partidaId;
                  return (
                    <li key={p.partidaId}>
                      <button
                        type="button"
                        onClick={() => setSeleccion(p.partidaId)}
                        aria-current={activa}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${activa ? 'bg-cyan-500/15 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <span className="font-mono">{p.alumnoCodigo}</span>
                        <span className="text-xs text-slate-500">{p.completada ? NOMBRE_HABILIDAD[f] : 'en curso'}</span>
                      </button>
                    </li>
                  );
                })}
                {filtradas.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin resultados.</li>}
              </ul>
            </aside>
            {elegida ? <DetallePartida key={elegida.partidaId} partida={elegida} mediaClase={media} /> : <p className="text-slate-500">Elige una partida.</p>}
          </div>
        ) : (
          <Herramientas partidas={partidas} onCambio={() => void cargar()} />
        )}
      </main>
    </div>
  );
}

function Vacio({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
      <p className="text-lg text-slate-300">Todavía no hay partidas.</p>
      <p className="max-w-md text-sm text-slate-500">Cuando tu alumnado termine la misión, sus perfiles aparecerán aquí. Para ver cómo funciona el panel, puedes cargar una clase de ejemplo simulada.</p>
      {MODO === 'local' && (
        <Boton variante="primario" onClick={onDemo}>
          Cargar clase de ejemplo
        </Boton>
      )}
    </div>
  );
}

function NuevaClase() {
  const [id, setId] = useState('');
  const [estado, setEstado] = useState('');
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEstado('Creando…');
    try {
      await crearClase(id);
      setEstado(`✓ Clase ${id} creada. Comparte este código con tu alumnado.`);
      setId('');
    } catch (err) {
      setEstado(err instanceof Error ? err.message : 'Error');
    }
  };
  return (
    <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
      <h2 className="text-lg font-semibold">Nueva clase</h2>
      <form onSubmit={enviar} className="flex flex-wrap items-center gap-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
          placeholder="2ESO-B"
          maxLength={20}
          aria-label="Código de la nueva clase"
          className="min-h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono focus:border-cyan-300 focus:outline-none"
        />
        <Boton type="submit" disabled={id.length < 2} silencioso>Crear clase</Boton>
      </form>
      {estado && <p role="status" className="text-sm text-slate-300">{estado}</p>}
    </section>
  );
}

function Herramientas({ partidas, onCambio }: { partidas: EstadoAlumno[]; onCambio: () => void }) {
  const [cantidad, setCantidad] = useState(25);
  const [codigos, setCodigos] = useState<string[]>([]);

  const generar = () => {
    const set = new Set<string>();
    while (set.size < Math.min(60, Math.max(1, cantidad))) set.add(generarCodigo());
    setCodigos([...set]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {MODO === 'supabase' && <NuevaClase />}
      <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold">Códigos seudónimos para la clase</h2>
        <p className="text-sm text-slate-400">Reparte un código a cada estudiante y guarda tú la correspondencia en papel. El juego nunca pide nombres.</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            Cantidad
            <input type="number" min={1} max={60} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="min-h-10 w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 focus:border-cyan-300 focus:outline-none" />
          </label>
          <Boton onClick={generar}>Generar</Boton>
          {codigos.length > 0 && <Boton variante="fantasma" onClick={() => window.print()}>🖨 Imprimir</Boton>}
        </div>
        {codigos.length > 0 && (
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {codigos.map((c, i) => (
              <li key={c} className="rounded-lg border border-dashed border-slate-600 px-2 py-3 text-center">
                <span className="block text-[10px] text-slate-500">#{i + 1}</span>
                <span className="font-mono text-lg tracking-widest">{c}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold">Datos</h2>
        <div className="flex flex-wrap gap-2">
          <Boton onClick={() => exportarCSV(partidas)} disabled={partidas.length === 0}>⬇ Exportar CSV</Boton>
          {MODO === 'local' && (
            <>
              <Boton onClick={() => { importarPartidasLocales(generarPartidasDemo(14, 'DEMO-2ESO', Date.now() % 100000)); onCambio(); }}>+ Clase de ejemplo</Boton>
              <Boton
                variante="peligro"
                onClick={() => {
                  if (window.confirm('¿Borrar todas las partidas guardadas en este navegador? No se puede deshacer.')) {
                    borrarPartidasLocales();
                    onCambio();
                  }
                }}
              >
                Borrar datos locales
              </Boton>
            </>
          )}
        </div>
        <p className="text-sm text-slate-400">{partidas.length} partida(s) en total · guion v{VERSION_GUION}</p>
      </section>

      <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Cómo se evalúa</h2>
        <ul className="grid gap-2 text-sm text-slate-300">
          <li>· {escenas.length} escenas y 5 caminos: tras el apagón, cada alumno elige qué frente atender y juega el minijuego de esa habilidad. Cada decisión suma 2 puntos a una habilidad y 1 a otra; ninguna opción es «la buena».</li>
          <li>· El radar muestra el porcentaje sobre el máximo que el alumno podía alcanzar en su propio camino.</li>
          <li>· En los minijuegos se observan <strong>comportamientos</strong> (pedir ayuda, reintentar, explorar antes de actuar), nunca velocidad ni precisión. Tras 3 intentos, un personaje ayuda y la historia sigue.</li>
          <li>· El tiempo de respuesta se registra como telemetría, pero no puntúa.</li>
        </ul>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(MECANICAS_INFO).map((m) => (
            <div key={m.nombre} className="rounded-xl border border-slate-700 p-3">
              <p className="font-medium text-white">{m.nombre}</p>
              <p className="mt-1 text-xs text-slate-400">{m.queObserva}</p>
              {m.fundamento && <p className="mt-1 text-[11px] italic text-slate-500">{m.fundamento}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
