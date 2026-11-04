import { useMemo, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { NOMBRE_PERSONAJE } from '../components/Retrato';
import { Bocadillo, Boton } from '../components/ui';
import type { Personaje } from '../types/game';
import BarraInventario from './Inventario';
import type { PropsMecanica } from './tipos';

// «Mensaje roto»: no se descifra un código, se descifra una INTENCIÓN.
//  - Inferencia pragmática: deducir por el contexto e integrando dos mensajes
//    (Grice, 1975; Sperber y Wilson, 1986).
//  - Detectar la ambigüedad y preguntar solo lo necesario (hay muy pocas transmisiones).
//  - Comunicación en bucle cerrado: repetir lo entendido para que lo confirmen
//    antes de actuar (Salas, Sims y Burke, 2005).
//  - Adaptar la información a cada receptor (Bell, 1984; Clark y Murphy, 1982).

type Punto = 'hora' | 'muelle' | 'compuerta' | 'equipaje' | 'servidor';

interface PuntoDef {
  id: Punto;
  titulo: string;
  correcta: string;
  opciones: { id: string; texto: string }[];
  /** Qué hay que hacer para saberlo: deducirlo del contexto o preguntarlo. */
  como: 'deducir' | 'preguntar';
  /** Corrección completa (solo en la segunda confirmación fallida: ayuda adaptativa). */
  correccion: string;
}

const PUNTOS: PuntoDef[] = [
  {
    id: 'hora',
    titulo: 'Hora de llegada',
    correcta: '0330',
    como: 'deducir',
    opciones: [
      { id: '0400', texto: 'A las 04:00' },
      { id: '0330', texto: 'A las 03:30' },
      { id: '0430', texto: 'A las 04:30' },
      { id: '1600', texto: 'A las 16:00' },
    ],
    correccion: 'Llegada a las 03:30: adelantamos media hora sobre las 04:00.',
  },
  {
    id: 'muelle',
    titulo: 'Muelle de acoplamiento',
    correcta: 'm3',
    como: 'preguntar',
    opciones: [
      { id: 'm2', texto: 'Muelle 2' },
      { id: 'm3', texto: 'Muelle 3' },
      { id: 'm4', texto: 'Muelle 4' },
    ],
    correccion: 'Muelle TRES. El dos está inutilizado.',
  },
  {
    id: 'compuerta',
    titulo: 'Compuerta B',
    correcta: 'evitar',
    como: 'preguntar',
    opciones: [
      { id: 'evitar', texto: 'No hay que pasar por la compuerta B' },
      { id: 'noesta', texto: 'El batiscafo no se acoplará junto a la compuerta B' },
      { id: 'dentro', texto: 'La compuerta B no se puede abrir desde dentro' },
    ],
    correccion: 'NO paséis por la compuerta B: está inundada. Id por la A.',
  },
  {
    id: 'equipaje',
    titulo: 'Equipaje',
    correcta: 'limite',
    como: 'deducir',
    opciones: [
      { id: 'libre', texto: 'Cada uno puede llevar lo que quiera' },
      { id: 'limite', texto: 'Hay un límite de peso por persona' },
      { id: 'nada', texto: 'No se puede llevar nada' },
    ],
    correccion: 'Hay un límite de cinco kilos por persona.',
  },
  {
    id: 'servidor',
    titulo: 'Aris y el servidor',
    correcta: 'copiar',
    como: 'deducir',
    opciones: [
      { id: 'llevar', texto: 'Aris debe subir el servidor al batiscafo' },
      { id: 'copiar', texto: 'Aris debe copiar los datos y dejar el servidor' },
      { id: 'quedarse', texto: 'Aris debe quedarse vigilando el servidor' },
    ],
    correccion: 'El servidor pesa demasiado: que Aris copie los datos en discos y lo deje.',
  },
];

type TipoPregunta = 'util' | 'vaga' | 'innecesaria';

const PREGUNTAS: { id: string; texto: string; respuesta: string; resuelve?: Punto; tipo: TipoPregunta }[] = [
  { id: 'repetir', texto: '¿Podéis repetir todo el mensaje?', respuesta: '«…▒▒▒scafo… amanecer… a las ▒▒… muelle ▒▒… NO ▒▒▒ compuerta… máximo ▒▒ kilos…» La interferencia sigue igual.', tipo: 'vaga' },
  { id: 'hora', texto: '¿A qué hora llegáis?', respuesta: 'A las tres y media, como indicamos en la corrección.', resuelve: 'hora', tipo: 'innecesaria' },
  { id: 'muelle2', texto: '¿El muelle 2?', respuesta: 'Muelle dos… ▒▒▒… inutilizado. Cambio.', tipo: 'vaga' },
  { id: 'muelle', texto: 'Si el muelle 2 no sirve, ¿en qué muelle os acopláis?', respuesta: 'En el muelle tres. Repito: muelle tres.', resuelve: 'muelle', tipo: 'util' },
  { id: 'compuertaVaga', texto: '¿Qué pasa con la compuerta B?', respuesta: 'Compuerta B… ▒▒▒… no. Cambio.', tipo: 'vaga' },
  { id: 'compuerta', texto: '«NO compuerta B»: ¿significa que no pasemos por ella o que no os acoplaréis junto a ella?', respuesta: 'Que NO paséis por la compuerta B: está inundada. Id por la A.', resuelve: 'compuerta', tipo: 'util' },
  { id: 'kilos', texto: '¿Cuántos kilos puede llevar cada uno?', respuesta: 'Cinco kilos por persona.', resuelve: 'equipaje', tipo: 'innecesaria' },
  { id: 'servidor', texto: '¿Qué tiene que hacer Aris con el servidor?', respuesta: 'Que copie los datos en discos. El servidor no cabe.', resuelve: 'servidor', tipo: 'innecesaria' },
];

/** Información que se puede pasar al equipo. */
type Dato = 'hora' | 'muelle' | 'ruta' | 'peso' | 'datos';
const DATOS: { id: Dato; texto: string; enFrase: string }[] = [
  { id: 'hora', texto: 'Llegada a las 03:30', enFrase: 'a qué hora llega' },
  { id: 'muelle', texto: 'Acoplamiento en el muelle 3', enFrase: 'en qué muelle se acopla' },
  { id: 'ruta', texto: 'No pasar por la compuerta B: ir por la A', enFrase: 'por dónde hay que ir' },
  { id: 'peso', texto: 'Máximo cinco kilos por persona', enFrase: 'cuánto podemos llevar' },
  { id: 'datos', texto: 'Copiar los datos en discos y dejar el servidor', enFrase: 'qué hacer con el servidor' },
];
const frase = (ds: Dato[]) => ds.map((d) => DATOS.find((x) => x.id === d)!.enFrase).join(' ni ');

/** Lo que necesita saber cada persona para hacer su parte. */
const NECESITA: { personaje: Personaje; tarea: string; datos: Dato[] }[] = [
  { personaje: 'reyes', tarea: 'pilotará el acoplamiento', datos: ['hora', 'muelle'] },
  { personaje: 'leo', tarea: 'abrirá el paso hasta el muelle', datos: ['muelle', 'ruta'] },
  { personaje: 'aris', tarea: 'salvará la investigación', datos: ['peso', 'datos'] },
];

const TRANSMISIONES_BASE = 2;

const barajar = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type Fase = 'interpretar' | 'equipo' | 'hecho';

export default function Mensaje({ onCompletar, registrar, inventario }: PropsMecanica) {
  // Opciones y preguntas en orden aleatorio: la posición no delata la respuesta.
  const puntos = useMemo(() => PUNTOS.map((p) => ({ ...p, opciones: barajar(p.opciones) })), []);
  const preguntas = useMemo(() => barajar(PREGUNTAS), []);
  const [fase, setFase] = useState<Fase>('interpretar');
  const [lectura, setLectura] = useState<Partial<Record<Punto, string>>>({});
  const [preguntadas, setPreguntadas] = useState<string[]>([]);
  const [extra, setExtra] = useState(0);
  const [radio, setRadio] = useState<{ quien: 'tu' | 'superficie' | 'equipo'; texto: string; ok?: boolean }[]>([]);
  const [pidioConsejo, setPidioConsejo] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [avisos, setAvisos] = useState<Record<string, Dato[]>>({});
  const [reacciones, setReacciones] = useState<Record<string, { ok: boolean; texto: string }>>({});
  // Telemetría para los indicadores.
  const readbacks = useRef(0);
  const actuoSinConfirmar = useRef<'no' | 'bien' | 'mal'>('no');
  const primeraLectura = useRef<Partial<Record<Punto, string>> | null>(null);
  const usoObjeto = useRef(false);
  const notaEquipo = useRef<number[]>([]);

  const disponibles = TRANSMISIONES_BASE + extra - preguntadas.length;
  const completa = puntos.every((p) => lectura[p.id]);
  const errores = puntos.filter((p) => lectura[p.id] !== p.correcta);
  const anadir = (...ms: typeof radio) => setRadio((r) => [...r, ...ms]);

  const interpretar = (punto: Punto, id: string) => {
    registrar('accion', { que: 'interpretar', punto, id });
    setLectura((l) => ({ ...l, [punto]: id }));
  };

  const preguntar = (id: string) => {
    if (disponibles <= 0 || preguntadas.includes(id)) return;
    const p = PREGUNTAS.find((x) => x.id === id)!;
    sonido.click();
    registrar('accion', { que: 'preguntar', id, tipo: p.tipo });
    setPreguntadas((ps) => [...ps, id]);
    anadir({ quien: 'tu', texto: p.texto }, { quien: 'superficie', texto: p.respuesta });
  };

  const fijarPrimeraLectura = () => {
    if (!primeraLectura.current) primeraLectura.current = { ...lectura };
  };

  /**
   * Bucle cerrado: lee lo entendido y la superficie confirma o corrige.
   * La primera corrección solo dice QUÉ puntos están mal; desde la segunda, también el valor (ayuda adaptativa).
   */
  const confirmar = () => {
    fijarPrimeraLectura();
    readbacks.current++;
    registrar('accion', { que: 'readback', errores: errores.length });
    const resumen = puntos.map((p) => p.opciones.find((o) => o.id === lectura[p.id])?.texto).join('. ');
    anadir({ quien: 'tu', texto: `Confirmo lo entendido: ${resumen}.` });
    if (errores.length === 0) {
      sonido.exito();
      anadir({ quien: 'superficie', texto: 'Afirmativo. Todo correcto. Os esperamos.', ok: true });
      setFase('equipo');
      return;
    }
    sonido.aviso();
    if (readbacks.current === 1) {
      anadir({ quien: 'superficie', texto: `Negativo en: ${errores.map((p) => p.titulo.toLowerCase()).join(', ')}. Revisadlo.`, ok: false });
    } else {
      registrar('ayuda', { tipo: 'pista' });
      anadir({ quien: 'superficie', texto: `Negativo. ${errores.map((p) => p.correccion).join(' ')}`, ok: false });
    }
  };

  /** Actuar sin confirmar: si había algo mal entendido, se descubre tarde. */
  const actuar = () => {
    fijarPrimeraLectura();
    registrar('accion', { que: 'actuar_sin_confirmar', errores: errores.length });
    if (errores.length === 0) {
      if (actuoSinConfirmar.current === 'no') actuoSinConfirmar.current = 'bien';
      sonido.exito();
      anadir({ quien: 'equipo', texto: 'Por suerte lo habías entendido todo bien. Reyes comenta: «La próxima vez, confírmalo por radio antes: aquí abajo un malentendido sale caro».', ok: true });
      setFase('equipo');
      return;
    }
    actuoSinConfirmar.current = 'mal';
    sonido.aviso();
    setFallos((f) => f + 1);
    registrar('fallo', { firma: errores.map((p) => p.id).sort().join('+') });
    const CONSECUENCIA: Record<Punto, string> = {
      compuerta: 'Leo abre la compuerta B… y entra agua a chorro. Consigue cerrarla a tiempo, pero ha ido de poco.',
      muelle: 'El equipo carga todo hacia un muelle que no es y tiene que volver sobre sus pasos.',
      hora: 'El equipo se prepara a otra hora: el batiscafo podría irse sin vosotros.',
      equipaje: 'El equipo prepara bolsas enormes que no caben en el batiscafo.',
      servidor: 'Aris desconecta el servidor para llevárselo… y pesa más que dos personas juntas.',
    };
    anadir({ quien: 'equipo', texto: `${CONSECUENCIA[errores[0].id]} Algo no se había entendido bien.`, ok: false });
  };

  const alternarDato = (personaje: string, dato: Dato) => {
    if (reacciones[personaje]?.ok) return;
    setAvisos((a) => {
      const actual = a[personaje] ?? [];
      return { ...a, [personaje]: actual.includes(dato) ? actual.filter((d) => d !== dato) : [...actual, dato] };
    });
  };

  /** Adaptar el mensaje a cada receptor: lo que necesita, sin saturarle. */
  const avisar = (n: (typeof NECESITA)[number]) => {
    const dados = avisos[n.personaje] ?? [];
    const faltan = n.datos.filter((d) => !dados.includes(d));
    const sobran = dados.filter((d) => !n.datos.includes(d));
    const nota = Math.max(0, (n.datos.length - faltan.length) / n.datos.length - sobran.length * 0.15);
    // Cuenta la nota del primer aviso a cada persona.
    if (reacciones[n.personaje] === undefined) notaEquipo.current.push(nota);
    registrar('accion', { que: 'avisar', persona: n.personaje, faltan: faltan.length, sobran: sobran.length });
    const nombre = NOMBRE_PERSONAJE[n.personaje];
    let texto: string;
    if (faltan.length) {
      sonido.aviso();
      texto = `${nombre}: «Pero no me has dicho ${frase(faltan)}».`;
    } else if (sobran.length) {
      sonido.exito();
      texto = `${nombre}: «Entendido… aunque para mi tarea no necesitaba saber ${frase(sobran)}».`;
    } else {
      sonido.exito();
      texto = `${nombre}: «Claro y justo lo que necesito. ¡En marcha!»`;
    }
    const nuevas = { ...reacciones, [n.personaje]: { ok: faltan.length === 0, texto } };
    setReacciones(nuevas);
    if (NECESITA.every((x) => nuevas[x.personaje]?.ok)) {
      setFase('hecho');
      cerrar();
    }
  };

  const cerrar = () => {
    const primera = primeraLectura.current ?? lectura;
    const hechas = preguntadas.map((id) => PREGUNTAS.find((p) => p.id === id)!);
    const utiles = hechas.filter((p) => p.tipo === 'util').length;
    const malgastadas = hechas.filter((p) => p.tipo !== 'util').length;
    const ambigua = preguntadas.includes('compuerta') ? 1 : preguntadas.includes('compuertaVaga') ? 0.5 : primera.compuerta === 'evitar' ? 0.3 : 0.2;
    const deducibles = PUNTOS.filter((p) => p.como === 'deducir');
    const inferidos = deducibles.filter((p) => primera[p.id] === p.correcta && !hechas.some((h) => h.resuelve === p.id)).length;
    const bucle = actuoSinConfirmar.current === 'mal' ? 0.2 : actuoSinConfirmar.current === 'bien' ? 0.5 : 1;
    const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const indicadores: Record<string, number> = {
      men_ambiguedad: ambigua,
      men_preguntas: Math.max(0, utiles / 2 - malgastadas * 0.25),
      men_inferencia: inferidos / deducibles.length,
      men_bucle: bucle,
      men_transmision: media(notaEquipo.current),
    };
    const conductas: string[] = [];
    if (pidioConsejo) conductas.push('pidio_consejo');
    if (ambigua === 1) conductas.push('detecto_ambiguedad');
    if (malgastadas > 0) conductas.push('pregunta_innecesaria');
    if (actuoSinConfirmar.current === 'no') conductas.push('cerro_bucle');
    else conductas.push('actuo_sin_confirmar');
    if (fallos > 0) conductas.push('reintento');
    if (indicadores.men_transmision >= 0.9) conductas.push('transmitio_completo');
    if (usoObjeto.current) conductas.push('uso_objeto_alternativo');
    if (readbacks.current > 2) conductas.push('ayuda_automatica');
    const clave = pidioConsejo ? 'asesorado' : actuoSinConfirmar.current === 'mal' ? 'rectificador' : actuoSinConfirmar.current === 'bien' ? 'intuitivo' : 'riguroso';
    window.setTimeout(
      () => onCompletar({ clave, conductas, intentos: fallos + Math.max(0, readbacks.current - 1), ayudaRecibida: readbacks.current > 2, precision: Math.round(media(Object.values(indicadores)) * 100), indicadores }),
      1500,
    );
  };

  const usarObjeto = (id: string): string | null => {
    if ((id === 'cinta' || id === 'walkie') && !usoObjeto.current) {
      usoObjeto.current = true;
      setExtra((n) => n + 1);
      return id === 'cinta' ? 'Reparas con cinta el cable suelto de la antena: tienes una transmisión más.' : 'Reyes usa el walkie como repetidor: tienes una transmisión más.';
    }
    return null;
  };

  const ruido = (n: number) => <span className="text-slate-600">{'▒'.repeat(n)}</span>;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-xl border border-cyan-400/25 bg-black/50 p-3 font-mono text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Mensaje 1 · superficie</p>
          <p className="mt-1 leading-relaxed text-cyan-100">
            «…batiscafo lleg{ruido(2)} antes del amanecer, a las 4… acoplará en el muelle {ruido(2)}… NO {ruido(3)} compuerta B… máximo {ruido(2)} kilos por persona… Aris: {ruido(3)} servidor… {ruido(3)}»
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Mensaje 2 · un minuto después</p>
          <p className="mt-1 leading-relaxed text-cyan-100">
            «…CORRECCIÓN… adelantamos {ruido(3)} media hora… muelle 2 {ruido(3)} inutilizado… usad {ruido(2)} {ruido(3)}…»
          </p>
        </div>
      </div>

      {fase === 'interpretar' && (
        <>
          <div className="grid gap-2">
            <p className="text-sm text-slate-300">¿Qué crees que quieren decir? Elige tu interpretación de cada punto (ten en cuenta los dos mensajes).</p>
            {puntos.map((p) => (
              <fieldset key={p.id} className="grid gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{p.titulo}</legend>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {p.opciones.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={lectura[p.id] === o.id}
                      onClick={() => interpretar(p.id, o.id)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        lectura[p.id] === o.id ? 'border-cyan-200 bg-cyan-400/25 text-white' : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-cyan-300/60'
                      }`}
                    >
                      {o.texto}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-300">¿Necesitas aclarar algo? Cada pregunta gasta una transmisión y quedan muy pocas.</p>
              <span className="font-mono text-xs text-cyan-200" aria-label={`${disponibles} transmisiones disponibles`}>
                📡 {disponibles} {disponibles === 1 ? 'transmisión' : 'transmisiones'}
              </span>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {preguntas.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => preguntar(q.id)}
                    disabled={disponibles <= 0 || preguntadas.includes(q.id)}
                    className="h-full w-full rounded-lg border border-slate-600 bg-slate-950/60 px-2.5 py-2 text-left text-sm text-slate-200 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                  >
                    {q.texto}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {radio.length > 0 && (
        <ol className="grid gap-2" aria-label="Registro de radio" aria-live="polite">
          {radio.map((m, i) => (
            <li
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.quien === 'tu' ? 'bg-slate-800/80 text-slate-200' : m.ok === false ? 'bg-amber-500/10 text-amber-200' : m.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-cyan-500/10 text-cyan-100'
              }`}
            >
              <span className="font-mono text-[11px] uppercase tracking-widest opacity-70">{m.quien === 'tu' ? 'Tú · ' : m.quien === 'superficie' ? 'Superficie · ' : 'Equipo · '}</span>
              {m.texto}
            </li>
          ))}
        </ol>
      )}

      {fase !== 'interpretar' && (
        <div className="grid gap-3">
          <Bocadillo personaje="lisa" expresion="pensativo" anunciar={false}>
            Cuéntale a cada uno lo que necesita para su parte. Ni más ni menos: con tanto lío, la información de sobra también confunde.
          </Bocadillo>
          {NECESITA.map((n) => {
            const r = reacciones[n.personaje];
            const dados = avisos[n.personaje] ?? [];
            return (
              <div key={n.personaje} className={`grid gap-2 rounded-xl border p-3 ${r?.ok ? 'border-emerald-400/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/60'}`}>
                <p className="text-sm font-semibold text-white">
                  {NOMBRE_PERSONAJE[n.personaje]} <span className="font-normal text-slate-400">· {n.tarea}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DATOS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={dados.includes(d.id)}
                      onClick={() => alternarDato(n.personaje, d.id)}
                      disabled={r?.ok}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        dados.includes(d.id) ? 'border-cyan-200 bg-cyan-400/25 text-white' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-cyan-300/60'
                      }`}
                    >
                      {d.texto}
                    </button>
                  ))}
                </div>
                {r && <p role="status" className={`text-sm ${r.ok ? 'text-emerald-200' : 'text-amber-200'}`}>{r.texto}</p>}
                {!r?.ok && (
                  <Boton className="justify-self-start" onClick={() => avisar(n)} disabled={dados.length === 0} silencioso>
                    📢 Avisar a {NOMBRE_PERSONAJE[n.personaje]}
                  </Boton>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pidioConsejo && fase === 'interpretar' && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          Junta los dos mensajes: el segundo corrige al primero. Pregunta solo lo que no puedas deducir, y de forma concreta. Y antes de actuar, confírmalo por radio.
        </Bocadillo>
      )}

      {fase === 'interpretar' && <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} />}

      {fase === 'interpretar' && (
        <div className="flex flex-wrap gap-2">
          <Boton variante="primario" className="flex-1" onClick={confirmar} disabled={!completa} silencioso>
            📻 Confirmar por radio lo que he entendido
          </Boton>
          <Boton onClick={actuar} disabled={!completa} silencioso>
            ▶ Actuar ya
          </Boton>
          <Boton
            variante="fantasma"
            onClick={() => {
              setPidioConsejo(true);
              registrar('ayuda', { tipo: 'consejo' });
            }}
            disabled={pidioConsejo}
          >
            💬 Consejo de Reyes
          </Boton>
        </div>
      )}
    </div>
  );
}
