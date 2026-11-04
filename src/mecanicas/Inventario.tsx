import { useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Objeto = 'taquilla' | 'cuerda' | 'cinta' | 'bidon' | 'tubo' | 'linterna';

const OBJETOS: { id: Objeto; nombre: string; icono: string }[] = [
  { id: 'taquilla', nombre: 'Taquilla flotante', icono: '🗄️' },
  { id: 'cuerda', nombre: 'Cuerda', icono: '🪢' },
  { id: 'cinta', nombre: 'Cinta adhesiva', icono: '🩹' },
  { id: 'bidon', nombre: 'Bidones vacíos', icono: '🛢️' },
  { id: 'tubo', nombre: 'Tubos de plástico', icono: '🧪' },
  { id: 'linterna', nombre: 'Linterna', icono: '🔦' },
];

const clavePar = (a: Objeto, b: Objeto) => [a, b].sort().join('+');

const INVENTOS: Record<string, { nombre: string; texto: string }> = {
  [clavePar('taquilla', 'cuerda')]: { nombre: 'Balsa de taquillas', texto: 'Atas varias taquillas con la cuerda: ¡una balsa que aguanta a una persona!' },
  [clavePar('bidon', 'cinta')]: { nombre: 'Flotadores de bidón', texto: 'Unes los bidones con cinta: un flotador para cada uno.' },
  [clavePar('tubo', 'cuerda')]: { nombre: 'Pasamanos', texto: 'Tensas la cuerda entre dos tubos: un pasamanos para cruzar agarrados.' },
  [clavePar('taquilla', 'tubo')]: { nombre: 'Taquilla con remo', texto: 'Usas un tubo como remo y la taquilla como barca. ¡Rema, rema!' },
};

const FALLOS: Record<string, string> = {
  [clavePar('linterna', 'cinta')]: 'Una linterna pegada a la frente: útil para ver, pero no para cruzar.',
  [clavePar('cinta', 'cuerda')]: 'Una cuerda muy pegajosa… pero no flota.',
  [clavePar('linterna', 'bidon')]: 'Un bidón iluminado. Muy bonito, poco útil.',
  [clavePar('linterna', 'tubo')]: 'Un tubo con luz. Ahora el agua se ve mejor… pero sigue ahí.',
};

export default function Inventario({ onCompletar }: PropsMecanica) {
  const [seleccion, setSeleccion] = useState<Objeto[]>([]);
  const [inventos, setInventos] = useState<string[]>([]);
  const [fallos, setFallos] = useState(0);
  const [pidioIdeas, setPidioIdeas] = useState(false);
  const [ayudaRecibida, setAyudaRecibida] = useState(false);
  const [sugeridos, setSugeridos] = useState<Objeto[]>([]);
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [terminado, setTerminado] = useState(false);

  const alternar = (o: Objeto) => {
    if (terminado) return;
    sonido.click();
    setSeleccion((s) => (s.includes(o) ? s.filter((x) => x !== o) : s.length >= 2 ? [s[1], o] : [...s, o]));
  };

  const combinar = () => {
    if (seleccion.length !== 2) return;
    const par = clavePar(seleccion[0], seleccion[1]);
    const invento = INVENTOS[par];
    setSeleccion([]);
    setSugeridos([]);
    if (invento) {
      if (inventos.includes(par)) {
        setMensaje({ ok: true, texto: `Ya habías construido: ${invento.nombre}. ¿Se te ocurre otra combinación?` });
        return;
      }
      sonido.exito();
      setInventos((i) => [...i, par]);
      setMensaje({ ok: true, texto: invento.texto });
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    setMensaje({ ok: false, texto: FALLOS[par] ?? 'Eso no parece ayudar a cruzar el agua. Prueba otra combinación.' });
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA && inventos.length === 0 && !ayudaRecibida) {
      setAyudaRecibida(true);
      setSugeridos(['taquilla', 'cuerda']);
    }
  };

  const pedirIdeas = () => {
    setPidioIdeas(true);
    setSugeridos(inventos.includes(clavePar('bidon', 'cinta')) ? ['tubo', 'cuerda'] : ['bidon', 'cinta']);
  };

  const cruzar = () => {
    setTerminado(true);
    const conductas: string[] = [];
    if (pidioIdeas) conductas.push('pidio_ideas');
    if (inventos.length >= 2) conductas.push('exploro_alternativas');
    if (fallos > 0) conductas.push('reintento');
    if (ayudaRecibida) conductas.push('ayuda_automatica');
    if (inventos.length === 1 && fallos === 0) conductas.push('solucion_directa');
    const clave = pidioIdeas ? 'equipo' : inventos.length >= 2 ? 'inventor' : fallos >= 2 ? 'tenaz' : 'practico';
    onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida });
  };

  return (
    <div className="grid gap-4">
      <ul className="grid grid-cols-3 gap-2" aria-label="Objetos del cuarto de mantenimiento">
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
                className={`flex h-full min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none ${
                  elegido
                    ? 'scale-[1.03] border-cyan-200 bg-cyan-400/25 text-white shadow-[0_0_20px_-6px_rgba(34,211,238,0.9)]'
                    : sugerido
                      ? 'border-amber-300/80 bg-amber-400/10 text-amber-100 motion-safe:animate-pulse'
                      : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                }`}
              >
                <span aria-hidden="true" className="text-3xl">
                  {o.icono}
                </span>
                {o.nombre}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Boton variante="primario" onClick={combinar} disabled={seleccion.length !== 2 || terminado} silencioso>
          🔧 Combinar {seleccion.length === 2 ? `(${seleccion.map((s) => OBJETOS.find((o) => o.id === s)?.nombre).join(' + ')})` : `(${seleccion.length}/2)`}
        </Boton>
        <Boton onClick={pedirIdeas} disabled={terminado || pidioIdeas}>
          💬 Pedir ideas al equipo
        </Boton>
      </div>

      {pidioIdeas && (
        <Bocadillo personaje="irene" expresion="pensativo">
          {inventos.includes(clavePar('bidon', 'cinta'))
            ? 'Y si tensamos algo para agarrarnos… ¿la cuerda con los tubos?'
            : 'Los bidones vacíos flotan muy bien. Si los unimos con algo…'}
        </Bocadillo>
      )}
      {ayudaRecibida && (
        <Bocadillo personaje="leo" expresion="pensativo">
          ¡Espera! ¿Y si atamos las taquillas con la cuerda? Flotan bastante.
        </Bocadillo>
      )}

      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {mensaje.texto}
        </p>
      )}

      {inventos.length > 0 && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-200">
            Inventos listos: {inventos.map((p) => INVENTOS[p].nombre).join(', ')}.
            {inventos.length < Object.keys(INVENTOS).length && ' Puedes cruzar ya o seguir probando.'}
          </p>
          <Boton variante="primario" className="mt-2 w-full" onClick={cruzar} disabled={terminado}>
            🌊 Cruzar el agua
          </Boton>
        </div>
      )}
    </div>
  );
}
