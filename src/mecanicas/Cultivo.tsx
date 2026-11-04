import { useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Objeto = 'cafe' | 'filtro' | 'baterias' | 'cascaras' | 'bicarbonato' | 'aluminio' | 'vinagre' | 'cinta';

const OBJETOS: { id: Objeto; nombre: string; icono: string; usoNormal: string }[] = [
  { id: 'cafe', nombre: 'Café soluble', icono: '☕', usoNormal: 'para el desayuno' },
  { id: 'filtro', nombre: 'Filtro de mascarilla', icono: '😷', usoNormal: 'para respirar' },
  { id: 'baterias', nombre: 'Baterías gastadas', icono: '🔋', usoNormal: 'casi sin carga' },
  { id: 'cascaras', nombre: 'Cáscaras de huevo', icono: '🥚', usoNormal: 'de la cocina' },
  { id: 'bicarbonato', nombre: 'Bicarbonato', icono: '🧂', usoNormal: 'del botiquín' },
  { id: 'aluminio', nombre: 'Papel de aluminio', icono: '🥡', usoNormal: 'para envolver' },
  { id: 'vinagre', nombre: 'Vinagre', icono: '🍶', usoNormal: 'para aliñar' },
  { id: 'cinta', nombre: 'Cinta adhesiva', icono: '🩹', usoNormal: 'para pegar' },
];

const par = (a: Objeto, b: Objeto) => [a, b].sort().join('+');

/** Soluciones válidas. `original` marca usos muy alejados de la función habitual del objeto. */
const SOLUCIONES: Record<string, { nombre: string; texto: string; original: boolean }> = {
  [par('cascaras', 'filtro')]: {
    nombre: 'Filtro de calcio',
    texto: 'Rellenas el filtro con cáscaras trituradas: el calcio va neutralizando el ácido del agua.',
    original: false,
  },
  [par('bicarbonato', 'cafe')]: {
    nombre: 'Mezcla tampón',
    texto: 'Disuelves bicarbonato con un poco de café: el pH sube despacio, sin cambios bruscos para las raíces.',
    original: false,
  },
  [par('baterias', 'aluminio')]: {
    nombre: 'Electrodos caseros',
    texto: 'Con la poca carga de las baterías y el aluminio haces unos electrodos que equilibran el agua. ¡Ingenioso!',
    original: true,
  },
  [par('filtro', 'cafe')]: {
    nombre: 'Filtro de carbón',
    texto: 'El filtro de la mascarilla lleva carbón activo: con los posos de café, atrapa la acidez. ¡Nadie lo habría pensado!',
    original: true,
  },
};

function mensajeFallo(a: Objeto, b: Objeto) {
  if (a === 'vinagre' || b === 'vinagre') return 'El vinagre es ácido: ¡el pH baja todavía más! Prueba otra cosa.';
  if (a === 'cinta' || b === 'cinta') return 'Queda muy bien pegado, pero el agua sigue igual de ácida.';
  return 'El medidor ni se inmuta. Esa combinación no cambia el pH.';
}

export default function Cultivo({ onCompletar }: PropsMecanica) {
  const [seleccion, setSeleccion] = useState<Objeto[]>([]);
  const [soluciones, setSoluciones] = useState<string[]>([]);
  const [fallos, setFallos] = useState(0);
  const [pidioIdeas, setPidioIdeas] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [sugeridos, setSugeridos] = useState<Objeto[]>([]);
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [terminado, setTerminado] = useState(false);

  const ph = soluciones.length > 0 ? 6.2 : fallos > 0 && mensaje?.texto.startsWith('El vinagre') ? 3.9 : 4.3;
  const phOk = ph >= 5.8;

  const alternar = (o: Objeto) => {
    if (terminado) return;
    sonido.click();
    setSeleccion((s) => (s.includes(o) ? s.filter((x) => x !== o) : s.length >= 2 ? [s[1], o] : [...s, o]));
  };

  const combinar = () => {
    if (seleccion.length !== 2) return;
    const [a, b] = seleccion;
    const clave = par(a, b);
    const solucion = SOLUCIONES[clave];
    setSeleccion([]);
    setSugeridos([]);
    if (solucion) {
      if (soluciones.includes(clave)) {
        setMensaje({ ok: true, texto: `Ya tienes el ${solucion.nombre.toLowerCase()}. ¿Se te ocurre otra forma distinta?` });
        return;
      }
      sonido.exito();
      setSoluciones((s) => [...s, clave]);
      setMensaje({ ok: true, texto: solucion.texto });
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    setMensaje({ ok: false, texto: mensajeFallo(a, b) });
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA && soluciones.length === 0 && !ayuda) {
      setAyuda(true);
      setSugeridos(['cascaras', 'filtro']);
    }
  };

  const pedirIdeas = () => {
    setPidioIdeas(true);
    setSugeridos(['bicarbonato']);
  };

  const terminar = () => {
    setTerminado(true);
    const originales = soluciones.filter((s) => SOLUCIONES[s].original).length;
    const conductas: string[] = [];
    if (pidioIdeas) conductas.push('pidio_ideas');
    if (soluciones.length >= 2) conductas.push('exploro_alternativas');
    if (originales > 0) conductas.push('uso_original');
    if (fallos > 0) conductas.push('reintento');
    if (ayuda) conductas.push('ayuda_automatica');
    if (soluciones.length === 1 && originales === 0 && fallos === 0) conductas.push('solucion_directa');
    const clave = pidioIdeas
      ? 'consultor'
      : soluciones.length >= 2
        ? 'divergente'
        : originales > 0
          ? 'original'
          : fallos >= 2
            ? 'tenaz'
            : 'practico';
    onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda });
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2" role="status" aria-label={`pH del agua: ${ph.toFixed(1)}`}>
        <span className="text-sm text-slate-300">pH del agua</span>
        <div className="relative h-3 flex-1 rounded-full bg-gradient-to-r from-rose-500 via-emerald-400 to-violet-500" aria-hidden="true">
          <span className="absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded bg-white shadow transition-[left] duration-700" style={{ left: `${((ph - 3) / 6) * 100}%` }} />
          <span className="absolute -bottom-4 text-[10px] text-emerald-300" style={{ left: `${((5.8 - 3) / 6) * 100}%` }}>
            zona sana
          </span>
        </div>
        <span className={`w-10 text-right font-mono ${phOk ? 'text-emerald-300' : 'text-rose-300'}`}>{ph.toFixed(1)}</span>
      </div>

      <ul className="mt-2 grid grid-cols-4 gap-2" aria-label="Objetos disponibles">
        {OBJETOS.map((o) => {
          const elegido = seleccion.includes(o.id);
          const sugerido = sugeridos.includes(o.id);
          return (
            <li key={o.id}>
              <button
                type="button"
                aria-pressed={elegido}
                onClick={() => alternar(o.id)}
                disabled={terminado}
                className={`flex h-full min-h-24 w-full flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 text-center text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none sm:text-sm ${
                  elegido
                    ? 'scale-[1.03] border-cyan-200 bg-cyan-400/25 text-white shadow-[0_0_20px_-6px_rgba(34,211,238,0.9)]'
                    : sugerido
                      ? 'border-amber-300/80 bg-amber-400/10 text-amber-100 motion-safe:animate-pulse'
                      : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                }`}
              >
                <span aria-hidden="true" className="text-2xl">
                  {o.icono}
                </span>
                <span className="leading-tight">{o.nombre}</span>
                <span className="text-[10px] leading-tight text-slate-500">{o.usoNormal}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Boton variante="primario" onClick={combinar} disabled={seleccion.length !== 2 || terminado} silencioso>
          🧪 Combinar {seleccion.length === 2 ? `(${seleccion.map((s) => OBJETOS.find((o) => o.id === s)?.nombre).join(' + ')})` : `(${seleccion.length}/2)`}
        </Boton>
        <Boton onClick={pedirIdeas} disabled={terminado || pidioIdeas}>
          💬 Pedir ideas a Lisa
        </Boton>
      </div>

      {pidioIdeas && (
        <Bocadillo personaje="lisa" expresion="pensativo">
          El bicarbonato sube el pH… pero de golpe puede dañar las raíces. ¿Con qué lo suavizarías?
        </Bocadillo>
      )}
      {ayuda && (
        <Bocadillo personaje="lisa" expresion="pensativo">
          ¡Espera! Las cáscaras de huevo tienen calcio. Si las metemos en algo que deje pasar el agua…
        </Bocadillo>
      )}
      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {mensaje.texto}
        </p>
      )}

      {soluciones.length > 0 && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-200">
            Soluciones encontradas: {soluciones.map((s) => SOLUCIONES[s].nombre).join(', ')}.
            {soluciones.length < Object.keys(SOLUCIONES).length && ' Puedes aplicarla ya o buscar otras formas.'}
          </p>
          <Boton variante="primario" className="mt-2 w-full" onClick={terminar} disabled={terminado}>
            🌱 Aplicar al invernadero
          </Boton>
        </div>
      )}
    </div>
  );
}
