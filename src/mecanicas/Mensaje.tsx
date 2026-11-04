import { useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import BarraInventario from './Inventario';
import type { PropsMecanica } from './tipos';

// «Mensaje roto»: no se descifra un código, se descifra una INTENCIÓN.
//  - Inferencia pragmática: deducir por el contexto lo que se puede deducir
//    (Grice, 1975; Sperber y Wilson, 1986).
//  - Detectar la ambigüedad y preguntar solo lo necesario.
//  - Comunicación en bucle cerrado: repetir lo entendido para que lo confirmen
//    antes de actuar (Salas, Sims y Burke, 2005).
//  - Transmitir al equipo lo acordado.

type Punto = 'hora' | 'muelle' | 'compuerta' | 'equipaje';

interface Interpretacion {
  id: string;
  texto: string;
}

const PUNTOS: { id: Punto; titulo: string; correcta: string; opciones: Interpretacion[]; correccion: string }[] = [
  {
    id: 'hora',
    titulo: 'Hora',
    correcta: 'llega0400',
    opciones: [
      { id: 'sale0400', texto: 'El batiscafo sale de la superficie a las 04:00' },
      { id: 'llega0400', texto: 'El batiscafo llega a las 04:00' },
      { id: 'llega1400', texto: 'El batiscafo llega a las 14:00' },
    ],
    correccion: 'Negativo: el batiscafo LLEGA a las 04:00.',
  },
  {
    id: 'muelle',
    titulo: 'Muelle',
    correcta: 'm2',
    opciones: [
      { id: 'm7', texto: 'Se acopla en el muelle 7' },
      { id: 'm4', texto: 'Se acopla en el muelle 4' },
      { id: 'm2', texto: 'Se acopla en el muelle 2' },
    ],
    correccion: 'Negativo: muelle DOS. Repito, muelle dos.',
  },
  {
    id: 'compuerta',
    titulo: 'Compuerta B',
    correcta: 'evitar',
    opciones: [
      { id: 'noesta', texto: 'El batiscafo no estará en la compuerta B' },
      { id: 'evitar', texto: 'No hay que pasar por la compuerta B' },
      { id: 'abrir', texto: 'Hay que abrir la compuerta B' },
    ],
    correccion: 'Negativo: NO paséis por la compuerta B, está inundada. Rodead por la A.',
  },
  {
    id: 'equipaje',
    titulo: 'Equipaje',
    correcta: 'minimo',
    opciones: [
      { id: 'todo', texto: 'Llevar todo el material científico' },
      { id: 'minimo', texto: 'Llevar solo lo imprescindible' },
      { id: 'nada', texto: 'No llevar absolutamente nada' },
    ],
    correccion: 'Negativo: llevad solo lo imprescindible.',
  },
];

/** Qué se puede deducir del contexto y qué no: preguntar lo deducible gasta batería. */
const DEDUCIBLE: Record<Punto, boolean> = { hora: true, muelle: false, compuerta: false, equipaje: true };

type TipoPregunta = 'util' | 'vaga' | 'innecesaria';

const PREGUNTAS: { id: string; texto: string; respuesta: string; resuelve?: Punto; tipo: TipoPregunta }[] = [
  { id: 'repetir', texto: '¿Podéis repetir todo el mensaje?', respuesta: '«…▒▒▒scafo llega a las 04:▒▒… muelle ▒▒… NO ▒▒▒ compuerta B… ▒▒▒ imprescindible…» La interferencia sigue igual.', tipo: 'vaga' },
  { id: 'muelle', texto: '¿En qué muelle se acopla el batiscafo?', respuesta: 'Muelle dos. Repito: muelle dos.', resuelve: 'muelle', tipo: 'util' },
  { id: 'hora', texto: '¿A qué hora llegáis?', respuesta: 'Llegada a las 04:00, como os dijimos.', resuelve: 'hora', tipo: 'innecesaria' },
  { id: 'compuertaVaga', texto: '¿Qué pasa con la compuerta B?', respuesta: 'Compuerta B… ▒▒▒… no. Cambio.', tipo: 'vaga' },
  { id: 'compuerta', texto: '«NO compuerta B»: ¿significa que no pasemos por ella o que el batiscafo no estará allí?', respuesta: 'Que NO paséis por la compuerta B: está inundada. Rodead por la A.', resuelve: 'compuerta', tipo: 'util' },
  { id: 'equipaje', texto: '¿Qué tenemos que llevar?', respuesta: 'Lo imprescindible, nada más.', resuelve: 'equipaje', tipo: 'innecesaria' },
];

const AVISOS_EQUIPO = [
  { id: 'crudo', texto: '«…batiscafo lleg… 04:00… muelle… NO… compuerta B… solo… imprescindible…»', valor: 0.2, reaccion: 'Leo frunce el ceño: «¿Y eso qué significa? ¿Pasamos por la B o no?».' },
  { id: 'completo', texto: '«A las 04:00 llega el batiscafo al muelle 2. No paséis por la compuerta B, está inundada: id por la A. Llevad solo lo imprescindible.»', valor: 1, reaccion: 'Todos asienten. Reyes: «Claro y completo. En marcha».' },
  { id: 'parcial', texto: '«Muelle 2, a las 04:00.»', valor: 0.6, reaccion: 'Aris coge su portátil y tres cajas de discos. Leo va hacia la compuerta B… Reyes los frena justo a tiempo.' },
  { id: 'vago', texto: '«Viene el rescate, preparaos.»', valor: 0.3, reaccion: 'Lisa pregunta: «¿Cuándo? ¿Dónde?». Nadie sabe qué hacer.' },
];

const TRANSMISIONES_BASE = 2;

type Fase = 'interpretar' | 'equipo' | 'hecho';

export default function Mensaje({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [fase, setFase] = useState<Fase>('interpretar');
  const [lectura, setLectura] = useState<Partial<Record<Punto, string>>>({});
  const [preguntadas, setPreguntadas] = useState<string[]>([]);
  const [extra, setExtra] = useState(0);
  const [radio, setRadio] = useState<{ quien: 'tu' | 'superficie' | 'equipo'; texto: string; ok?: boolean }[]>([]);
  const [pidioConsejo, setPidioConsejo] = useState(false);
  const [fallos, setFallos] = useState(0);
  // Telemetría para los indicadores.
  const readbacks = useRef(0);
  const actuoSinConfirmar = useRef<'no' | 'bien' | 'mal'>('no');
  const primeraLectura = useRef<Partial<Record<Punto, string>> | null>(null);
  const usoObjeto = useRef(false);

  const disponibles = TRANSMISIONES_BASE + extra - preguntadas.length;
  const completa = PUNTOS.every((p) => lectura[p.id]);
  const errores = PUNTOS.filter((p) => lectura[p.id] !== p.correcta);
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

  /** Bucle cerrado: lee lo entendido y la superficie confirma o corrige. */
  const confirmar = () => {
    fijarPrimeraLectura();
    readbacks.current++;
    registrar('accion', { que: 'readback', errores: errores.length });
    const resumen = PUNTOS.map((p) => p.opciones.find((o) => o.id === lectura[p.id])?.texto).join('. ');
    if (errores.length === 0) {
      sonido.exito();
      anadir({ quien: 'tu', texto: `Confirmo lo entendido: ${resumen}.` }, { quien: 'superficie', texto: 'Afirmativo. Todo correcto. Os esperamos.', ok: true });
      setFase('equipo');
      return;
    }
    sonido.aviso();
    anadir({ quien: 'tu', texto: `Confirmo lo entendido: ${resumen}.` }, { quien: 'superficie', texto: errores.map((p) => p.correccion).join(' '), ok: false });
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
    const consecuencia =
      errores[0].id === 'compuerta'
        ? 'Leo abre la compuerta B… y entra agua a chorro. Consigue cerrarla a tiempo, pero ha ido de poco.'
        : errores[0].id === 'muelle'
          ? 'El equipo carga todo hacia el muelle equivocado y tiene que volver sobre sus pasos.'
          : errores[0].id === 'hora'
            ? 'El equipo se prepara a la hora equivocada: el batiscafo podría irse sin vosotros.'
            : 'El equipo carga con cosas que no caben en el batiscafo y hay que deshacerlo todo.';
    anadir({ quien: 'equipo', texto: `${consecuencia} Algo no se había entendido bien: confírmalo con la superficie.`, ok: false });
  };

  const avisarEquipo = (id: string) => {
    const a = AVISOS_EQUIPO.find((x) => x.id === id)!;
    registrar('accion', { que: 'avisar_equipo', id });
    anadir({ quien: 'tu', texto: a.texto }, { quien: 'equipo', texto: a.reaccion, ok: a.valor === 1 });
    setFase('hecho');
    cerrar(a.valor);
  };

  const cerrar = (aviso: number) => {
    sonido.exito();
    const primera = primeraLectura.current ?? lectura;
    const hechas = preguntadas.map((id) => PREGUNTAS.find((p) => p.id === id)!);
    const utiles = hechas.filter((p) => p.tipo === 'util').length;
    const innecesarias = hechas.filter((p) => p.tipo !== 'util').length;
    const preguntoAmbigua = preguntadas.includes('compuerta') ? 1 : preguntadas.includes('compuertaVaga') ? 0.5 : primera.compuerta === 'evitar' ? 0.3 : 0.2;
    // Inferencia: lo deducible, ¿lo interpretó bien sin gastar preguntas?
    const deducibles = PUNTOS.filter((p) => DEDUCIBLE[p.id]);
    const inferidos = deducibles.filter((p) => primera[p.id] === p.correcta && !hechas.some((h) => h.resuelve === p.id)).length;
    const bucle = actuoSinConfirmar.current === 'mal' ? 0.2 : actuoSinConfirmar.current === 'bien' ? 0.5 : 1;
    const indicadores: Record<string, number> = {
      men_ambiguedad: preguntoAmbigua,
      men_preguntas: Math.max(0, utiles / 2 - innecesarias * 0.25),
      men_inferencia: inferidos / deducibles.length,
      men_bucle: bucle,
      men_transmision: aviso,
    };
    const conductas: string[] = [];
    if (pidioConsejo) conductas.push('pidio_consejo');
    if (preguntoAmbigua === 1) conductas.push('detecto_ambiguedad');
    if (innecesarias > 0) conductas.push('pregunta_innecesaria');
    if (actuoSinConfirmar.current === 'no') conductas.push('cerro_bucle');
    else conductas.push('actuo_sin_confirmar');
    if (fallos > 0) conductas.push('reintento');
    if (aviso === 1) conductas.push('transmitio_completo');
    if (usoObjeto.current) conductas.push('uso_objeto_alternativo');
    const clave = pidioConsejo ? 'asesorado' : actuoSinConfirmar.current === 'mal' ? 'rectificador' : actuoSinConfirmar.current === 'bien' ? 'intuitivo' : 'riguroso';
    const media = Object.values(indicadores).reduce((a, b) => a + b, 0) / Object.values(indicadores).length;
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: false, precision: Math.round(media * 100), indicadores }), 1500);
  };

  const usarObjeto = (id: string): string | null => {
    if ((id === 'cinta' || id === 'walkie') && !usoObjeto.current) {
      usoObjeto.current = true;
      setExtra((n) => n + 1);
      return id === 'cinta' ? 'Reparas con cinta el cable suelto de la antena: tienes una transmisión más.' : 'Reyes usa el walkie como repetidor: tienes una transmisión más.';
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-cyan-400/25 bg-black/50 p-3 font-mono text-sm">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">Mensaje recibido · superficie</p>
        <p className="mt-1 leading-relaxed text-cyan-100">
          «…batiscafo lleg<span className="text-slate-600">▒▒</span> a las 04:00… acoplará en el muelle <span className="text-slate-600">▒▒</span>… NO <span className="text-slate-600">▒▒▒</span> compuerta B… llevad solo <span className="text-slate-600">▒▒▒</span> imprescindible… <span className="text-slate-600">▒▒▒</span>»
        </p>
      </div>

      {fase === 'interpretar' && (
        <>
          <div className="grid gap-2">
            <p className="text-sm text-slate-300">¿Qué crees que quieren decir? Elige tu interpretación de cada punto.</p>
            {PUNTOS.map((p) => (
              <fieldset key={p.id} className="grid gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{p.titulo}</legend>
                <div className="grid gap-1.5 sm:grid-cols-3">
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
              <p className="text-sm text-slate-300">¿Necesitas aclarar algo? Cada pregunta gasta una transmisión.</p>
              <span className="font-mono text-xs text-cyan-200" aria-label={`${disponibles} transmisiones disponibles`}>
                📡 {disponibles} {disponibles === 1 ? 'transmisión' : 'transmisiones'}
              </span>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {PREGUNTAS.map((q) => (
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

      {fase === 'equipo' && (
        <div className="grid gap-2">
          <Bocadillo personaje="leo" expresion="preocupado">
            ¿Qué ha dicho la superficie? ¡Cuéntanoslo a todos!
          </Bocadillo>
          <ul className="grid gap-2">
            {AVISOS_EQUIPO.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => avisarEquipo(a.id)} className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-left text-sm text-slate-200 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  {a.texto}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pidioConsejo && fase === 'interpretar' && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          Pregunta solo lo que no puedas deducir, y hazlo de forma concreta. Y antes de actuar, repite por radio lo que has entendido para que te lo confirmen.
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
