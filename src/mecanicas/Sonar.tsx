import { useRef, useState, type KeyboardEvent } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { INTENTOS_ANTES_DE_AYUDA, precisionPorIntentos, type PropsMecanica } from './tipos';

const COLS = 6;
const FILAS = 5;
const TOTAL = COLS * FILAS;

type Modo = 'ping' | 'ir';

const NIVELES = [
  { texto: 'Eco metálico muy fuerte', color: 'rgba(250,204,21,0.9)', clase: 'bg-yellow-300/40' },
  { texto: 'Eco fuerte', color: 'rgba(74,222,128,0.85)', clase: 'bg-green-400/35' },
  { texto: 'Eco medio', color: 'rgba(74,222,128,0.5)', clase: 'bg-green-400/20' },
  { texto: 'Eco débil', color: 'rgba(74,222,128,0.2)', clase: 'bg-green-400/8' },
];

const fila = (i: number) => Math.floor(i / COLS);
const col = (i: number) => i % COLS;
const nombreCelda = (i: number) => `${String.fromCharCode(65 + col(i))}${fila(i) + 1}`;

function nivel(i: number, dron: number): number {
  const d = Math.max(Math.abs(fila(i) - fila(dron)), Math.abs(col(i) - col(dron)));
  return Math.min(d, 3);
}

function IconoDron() {
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden="true">
      <ellipse cx="20" cy="12" rx="15" ry="8" fill="#facc15" />
      <circle cx="27" cy="11" r="4" fill="#0e7490" stroke="#fef9c3" strokeWidth="1.5" />
      <rect x="2" y="9" width="5" height="6" rx="1" fill="#a16207" />
      <path d="M12 4 v-3 M20 4 v-3" stroke="#fde68a" strokeWidth="1.5" />
    </svg>
  );
}

export default function Sonar({ onCompletar }: PropsMecanica) {
  // Posición del dron: lejos de la esquina de entrada (A5) para que haya que buscar.
  const [dron] = useState(() => {
    const candidatos = Array.from({ length: TOTAL }, (_, i) => i).filter((i) => col(i) >= 2 && fila(i) <= 3);
    return candidatos[Math.floor(Math.random() * candidatos.length)];
  });
  const [modo, setModo] = useState<Modo>('ping');
  const [pings, setPings] = useState<Map<number, number>>(new Map());
  const [vacias, setVacias] = useState<Set<number>>(new Set());
  const [pingsAntesDeMoverse, setPingsAntesDeMoverse] = useState<number | null>(null);
  const [fallos, setFallos] = useState(0);
  const [coordinado, setCoordinado] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [encontrado, setEncontrado] = useState(false);
  const [mensaje, setMensaje] = useState('Elige una zona del hangar para lanzar un ping de sonar.');
  const [foco, setFoco] = useState(TOTAL - COLS); // A5: la entrada
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const lanzarPing = (i: number) => {
    const n = nivel(i, dron);
    sonido.ping(1 - n / 3);
    setPings((p) => new Map(p).set(i, n));
    setMensaje(`${nombreCelda(i)}: ${NIVELES[n].texto.toLowerCase()}.`);
  };

  const ir = (i: number) => {
    if (pingsAntesDeMoverse === null) setPingsAntesDeMoverse(pings.size);
    if (i === dron) {
      setEncontrado(true);
      sonido.exito();
      setMensaje(`¡El dron está en ${nombreCelda(i)}!`);
      const antes = pingsAntesDeMoverse ?? pings.size;
      const conductas: string[] = [];
      if (coordinado) conductas.push('busqueda_coordinada');
      if (fallos > 0) conductas.push('reintento');
      if (antes >= 3) conductas.push('exploro_antes');
      else if (!coordinado) conductas.push('actuo_con_poca_informacion');
      if (ayuda) conductas.push('ayuda_automatica');
      const clave = coordinado ? 'coordinado' : fallos > 0 ? 'constante' : antes >= 3 ? 'explorador' : 'intuitivo';
      window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda, precision: precisionPorIntentos(fallos, ayuda) }), 1000);
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    setVacias((v) => new Set(v).add(i));
    setMensaje(`En ${nombreCelda(i)} solo hay cajas volcadas. ${NIVELES[nivel(i, dron)].texto} desde aquí.`);
    setPings((p) => new Map(p).set(i, nivel(i, dron)));
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA) setAyuda(true);
  };

  const pulsar = (i: number) => {
    if (encontrado) return;
    setFoco(i);
    if (modo === 'ping') lanzarPing(i);
    else ir(i);
  };

  const coordinar = () => {
    setCoordinado(true);
    sonido.ping(0.6);
    // Leo rastrea la mitad derecha del hangar y comparte lo que oye.
    setPings((p) => {
      const nuevo = new Map(p);
      for (let i = 0; i < TOTAL; i++) if (col(i) >= COLS / 2 && fila(i) % 2 === 0) nuevo.set(i, nivel(i, dron));
      return nuevo;
    });
    setMensaje('Leo rastrea la mitad este del hangar mientras tú cubres la oeste.');
  };

  const teclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const mover: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    const d = mover[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const j = i + d;
    if (j < 0 || j >= TOTAL || (Math.abs(d) === 1 && fila(j) !== fila(i))) return;
    setFoco(j);
    refs.current[j]?.focus();
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Acción" className="inline-flex rounded-xl border border-cyan-400/30 p-1">
          {(['ping', 'ir'] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modo === m}
              onClick={() => {
                sonido.click();
                setModo(m);
              }}
              className={`min-h-10 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                modo === m ? 'bg-cyan-400/30 text-white' : 'text-slate-300 hover:bg-cyan-400/10'
              }`}
            >
              {m === 'ping' ? '📡 Lanzar ping' : '🚶 Ir a la zona'}
            </button>
          ))}
        </div>
        <Boton onClick={coordinar} disabled={coordinado || encontrado}>
          🤝 Repartir la búsqueda con Leo
        </Boton>
      </div>

      <div
        role="grid"
        aria-label="Mapa del hangar. Usa las flechas para moverte."
        className="relative mx-auto grid w-full max-w-md gap-1.5 rounded-2xl border border-green-400/20 bg-[#020a0a] p-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.08), transparent 70%)' }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const n = pings.get(i);
          const esDron = encontrado && i === dron;
          const pistaLeo = ayuda && !encontrado && i === dron;
          const vacia = vacias.has(i);
          const etiqueta = `${nombreCelda(i)}${n !== undefined ? `, ${NIVELES[n].texto}` : ', sin explorar'}${vacia ? ', solo cajas' : ''}${esDron ? ', dron encontrado' : ''}`;
          return (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="gridcell"
              tabIndex={i === foco ? 0 : -1}
              aria-label={etiqueta}
              onClick={() => pulsar(i)}
              onKeyDown={(e) => teclado(e, i)}
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md border text-[10px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none ${
                esDron
                  ? 'border-yellow-300 bg-yellow-300/30'
                  : pistaLeo
                    ? 'border-yellow-300/80 motion-safe:animate-pulse'
                    : n !== undefined
                      ? `border-green-500/30 ${NIVELES[n].clase}`
                      : 'border-green-900/40 bg-green-950/20 hover:border-green-400/50'
              }`}
            >
              {n !== undefined && !esDron && (
                <span
                  aria-hidden="true"
                  className="absolute inset-1 rounded-full border-2 motion-safe:animate-[sonar_1.6s_ease-out_1]"
                  style={{ borderColor: NIVELES[n].color }}
                />
              )}
              {esDron ? <IconoDron /> : vacia ? <span aria-hidden="true">📦</span> : <span aria-hidden="true" className="text-green-700/70">{nombreCelda(i)}</span>}
            </button>
          );
        })}
      </div>

      <p role="status" className="text-center text-sm text-green-200/90">
        {mensaje}
      </p>

      {coordinado && !encontrado && (
        <Bocadillo personaje="leo" expresion="contento">
          ¡Hecho! He marcado lo que oigo en el lado este. Cuanto más amarillo, más cerca.
        </Bocadillo>
      )}
      {ayuda && !encontrado && (
        <Bocadillo personaje="leo" expresion="pensativo">
          Mi sonar pita fuerte por aquí… ¡mira la zona que parpadea!
        </Bocadillo>
      )}

      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer text-cyan-300/80">¿Cómo funciona el sonar?</summary>
        <p className="mt-1">El ping indica lo cerca que está el dron de esa zona: débil (lejos), medio, fuerte (justo al lado) o muy fuerte (el dron está ahí). Cuando lo tengas claro, cambia a «Ir a la zona».</p>
      </details>
    </div>
  );
}
