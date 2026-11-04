import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import DetallePartida from '../components/docente/DetallePartida';
import VistaClase, { mediaHabilidades, mediaRendimiento } from '../components/docente/VistaClase';
import { Boton, Etiqueta } from '../components/ui';
import { VERSION_GUION } from '../data/guion';
import { duracionSegundos, ordenarHabilidades, porcentajes } from '../logica/puntuacion';
import { NOMBRE_BANDA, bandaFinal, evaluar, type AjusteDocente } from '../logica/evaluacion';
import { ordenarPorDesempeno } from '../logica/recomendacion';
import { CODIGO_DOCENTE } from '../config';
import { metricasPorArea, textoSecuencia } from '../logica/metricas';
import { partidaDePrueba } from '../logica/simulacion';
import { MECANICAS_INFO } from '../mecanicas/registro';
import {
  MODO,
  borrarPartidasLocales,
  cerrarSesion,
  crearClase,
  iniciarSesion,
  limpiarPartidasAntiguas,
  listarAjustes,
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

function exportarCSV(partidas: EstadoAlumno[], incluirNombres: boolean, ajustes: Record<string, AjusteDocente[]>) {
  const areas = [...HABILIDADES];
  const cab = [
    'clase',
    'id_alumno',
    ...(incluirNombres ? ['nombre'] : []),
    'inicio',
    'tiempo_total_s',
    'completada',
    'secuencia',
    ...areas.map((h) => `${h}_puntos`),
    ...areas.flatMap((h) => [`${h}_orden`, `${h}_tiempo_s`, `${h}_precision`, `${h}_aplazado`]),
    ...areas.flatMap((h) => [`${h}_desempeno`, `${h}_banda_juego`, `${h}_banda_final`, `${h}_confianza`, `${h}_ajuste_motivo`]),
    'prioridad_principal',
    'fortaleza_principal',
    'objetos_recogidos',
    'juego_sospechoso',
  ];
  const filas = partidas.map((p) => {
    const m = metricasPorArea(p);
    const de = (h: (typeof areas)[number]) => m.find((x) => x.area === h);
    const ev = evaluar(p);
    const aj = ajustes[p.partidaId] ?? [];
    return [
      p.claseId,
      p.alumnoCodigo,
      ...(incluirNombres ? [p.alumnoNombre] : []),
      p.iniciadaEn,
      duracionSegundos(p) ?? '',
      p.completada,
      textoSecuencia(p),
      ...areas.map((h) => p.habilidades[h]),
      ...areas.flatMap((h) => [de(h)?.orden ?? '', de(h)?.tiempoS ?? '', de(h)?.precision ?? '', de(h)?.retiradas ?? '']),
      ...areas.flatMap((h) => {
        const e = ev.habilidades[h];
        const f = bandaFinal(e, aj);
        return [e.valor ?? '', e.banda ? NOMBRE_BANDA[e.banda] : '', f.banda ? NOMBRE_BANDA[f.banda] : '', e.confianza, f.ajuste?.motivo ?? ''];
      }),
      ordenarHabilidades(porcentajes(p))[0],
      ordenarPorDesempeno(ev, aj)[0],
      p.inventario.map((o) => o.id).join(' '),
      ev.sospechosa,
    ];
  });
  const csv = [cab, ...filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
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
  const [ajustes, setAjustes] = useState<Record<string, AjusteDocente[]>>({});

  const cargarAjustes = useCallback(async () => {
    try {
      setAjustes(await listarAjustes());
    } catch {
      // Sin ajustes (p. ej. falta la migración en Supabase): se muestra el cálculo del juego.
      setAjustes({});
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      // El panel empieza limpio: se descartan datos simulados de versiones anteriores.
      if (MODO === 'local') limpiarPartidasAntiguas();
      setPartidas(await listarPartidas());
      await cargarAjustes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [cargarAjustes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const clases = useMemo(() => [...new Set(partidas.map((p) => p.claseId))].sort(), [partidas]);
  const claseActiva = clase && clases.includes(clase) ? clase : (clases[0] ?? '');
  const deLaClase = partidas.filter((p) => p.claseId === claseActiva && p.version === VERSION_GUION);
  const otrasVersiones = partidas.filter((p) => p.claseId === claseActiva && p.version !== VERSION_GUION).length;
  // Sin partidas reales se muestra una sola fila de ejemplo («Alumno de Prueba»), que no se guarda.
  const esPrueba = deLaClase.length === 0;
  const mostradas = useMemo(() => (esPrueba ? [partidaDePrueba(claseActiva || CODIGO_DOCENTE)] : deLaClase), [esPrueba, deLaClase, claseActiva]);
  const media = { prioridades: mediaHabilidades(mostradas), rendimiento: mediaRendimiento(mostradas) };
  const termino = busqueda.trim().toLowerCase();
  const filtradas = mostradas.filter((p) => !termino || p.alumnoNombre.toLowerCase().includes(termino) || p.alumnoCodigo.toLowerCase().includes(termino));
  const elegida = mostradas.find((p) => p.partidaId === seleccion) ?? filtradas[0];

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
          <>
            {esPrueba && (
              <p className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                Todavía no hay partidas reales. Se muestra un <strong>Alumno de Prueba</strong> para que veas cómo se presentan los datos; desaparecerá en cuanto alguien termine la misión.
              </p>
            )}
            <VistaClase partidas={mostradas} onElegir={verAlumno} esPrueba={esPrueba} ajustes={ajustes} />
          </>
        ) : pestana === 'alumnado' ? (
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="no-imprimir grid content-start gap-2">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o ID…"
                aria-label="Buscar por nombre o ID"
                className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm focus:border-cyan-300 focus:outline-none"
              />
              <ul className="grid max-h-[70dvh] gap-1 overflow-auto" aria-label="Partidas">
                {filtradas.map((p) => {
                  const f = ordenarPorDesempeno(evaluar(p), ajustes[p.partidaId] ?? [])[0];
                  const activa = elegida?.partidaId === p.partidaId;
                  return (
                    <li key={p.partidaId}>
                      <button
                        type="button"
                        onClick={() => setSeleccion(p.partidaId)}
                        aria-current={activa}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${activa ? 'bg-cyan-500/15 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <span className="min-w-0 truncate">{p.alumnoNombre}</span>
                        <span className="shrink-0 text-xs text-slate-500">{p.completada ? NOMBRE_HABILIDAD[f] : 'en curso'}</span>
                      </button>
                    </li>
                  );
                })}
                {filtradas.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin resultados.</li>}
              </ul>
            </aside>
            {elegida ? <DetallePartida key={elegida.partidaId} partida={elegida} mediaClase={esPrueba ? undefined : media} esPrueba={esPrueba} ajustes={ajustes[elegida.partidaId] ?? []} onAjustesCambiados={() => void cargarAjustes()} /> : <p className="text-slate-500">Elige una partida.</p>}
          </div>
        ) : (
          <Herramientas partidas={partidas} ajustes={ajustes} onCambio={() => void cargar()} />
        )}
      </main>
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

function Herramientas({ partidas, ajustes, onCambio }: { partidas: EstadoAlumno[]; ajustes: Record<string, AjusteDocente[]>; onCambio: () => void }) {
  const [incluirNombres, setIncluirNombres] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {MODO === 'supabase' && <NuevaClase />}
      <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold">Acceso del alumnado</h2>
        <p className="text-sm text-slate-400">Para jugar, cada estudiante escribe su nombre completo y este código de verificación:</p>
        <p className="w-fit rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 font-mono text-2xl tracking-widest text-cyan-100">{CODIGO_DOCENTE}</p>
        <p className="text-xs text-slate-500">
          Se cambia en <code className="font-mono">src/config.ts</code>. Ojo: al estar en el navegador, sirve para evitar accesos casuales en el aula, no como protección real de datos.
        </p>
      </section>

      <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold">Datos</h2>
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={incluirNombres} onChange={() => setIncluirNombres((v) => !v)} className="mt-0.5 h-5 w-5 accent-cyan-400" />
          <span>
            Incluir nombres en la exportación
            <span className="block text-xs text-slate-500">Son datos personales de menores: guarda el archivo en un lugar seguro.</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Boton onClick={() => exportarCSV(partidas, incluirNombres, ajustes)} disabled={partidas.length === 0}>⬇ Exportar CSV</Boton>
          {MODO === 'local' && (
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
          )}
        </div>
        <p className="text-sm text-slate-400">{partidas.length} partida(s) en total · guion v{VERSION_GUION}</p>
      </section>

      <section className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Cómo se evalúa</h2>
        <ul className="grid gap-2 text-sm text-slate-300">
          <li>· <strong>Prioridades:</strong> tras el apagón, el alumno atiende los 5 problemas en el orden que quiera (1.ª = 10, 2.ª = 7, 3.ª = 5, 4.ª = 3, 5.ª = 1). Dice qué le preocupa primero, no lo bien que lo hace.</li>
          <li>· <strong>Desempeño:</strong> cada reto registra lo que hace el alumno (eventos) y de ahí salen indicadores de 0 a 1. Cada indicador aporta, con un peso, a una o varias habilidades. El resultado se muestra en bandas (Emergente, En desarrollo, Consolidado) con un nivel de confianza según cuánta evidencia hay.</li>
          <li>· También cuentan la <strong>retirada estratégica</strong> (dejar un reto y volver con otra idea), la <strong>exploración</strong> y el <strong>uso alternativo de objetos</strong>, y una pregunta breve de juicio situacional al final de cada reto.</li>
          <li>· Puedes <strong>ajustar</strong> la banda de cualquier habilidad con un motivo; el valor del juego se conserva a la vista.</li>
          <li>· Fallar o agotar el tiempo nunca hace perder: hay ayudas que se adaptan y quedan registradas.</li>
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
