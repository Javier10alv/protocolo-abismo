import { useState, type DragEvent } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { INTENTOS_ANTES_DE_AYUDA, precisionPorIntentos, type PropsMecanica } from './tipos';

interface Paso {
  id: string;
  texto: string;
  /** Pista impresa en la propia página (se lee sin pedir ayuda). */
  margen?: string;
}

const PASOS_CORRECTOS: Paso[] = [
  { id: 'valvula', texto: 'Cerrar la válvula de entrada de agua', margen: 'Página 1 · «Antes de nada…»' },
  { id: 'purgar', texto: 'Purgar la presión del circuito' },
  { id: 'bateria', texto: 'Conectar la batería auxiliar' },
  { id: 'bombas', texto: 'Activar las bombas de refrigeración' },
  { id: 'reinicio', texto: 'Pulsar el botón de reinicio', margen: '«…y por último»' },
];

// Orden inicial desordenado (fijo, para que todos partan de lo mismo).
const ORDEN_INICIAL = ['bombas', 'reinicio', 'purgar', 'valvula', 'bateria'];

const NOTAS = [
  'Sin presión en el circuito, la batería es segura.',
  'Las bombas necesitan corriente para arrancar.',
  'Nunca purgar con la válvula abierta: entra agua.',
];

const porId = new Map(PASOS_CORRECTOS.map((p) => [p.id, p]));

export default function Secuencia({ onCompletar }: PropsMecanica) {
  const [orden, setOrden] = useState<string[]>(ORDEN_INICIAL);
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const [leyoNotas, setLeyoNotas] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [aciertosUltimo, setAciertosUltimo] = useState<number | null>(null);
  const [resuelto, setResuelto] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [anuncio, setAnuncio] = useState('');

  const mover = (desde: number, hasta: number) => {
    if (resuelto || hasta < 0 || hasta >= orden.length || desde === hasta) return;
    sonido.click();
    const n = [...orden];
    const [x] = n.splice(desde, 1);
    n.splice(hasta, 0, x);
    setOrden(n);
    setAnuncio(`«${porId.get(x)?.texto}» ahora es el paso ${hasta + 1}.`);
    setAciertosUltimo(null);
  };

  const terminar = (ayudaRecibida: boolean, fallosTotales: number) => {
    setResuelto(true);
    sonido.exito();
    const conductas: string[] = [];
    if (leyoNotas) conductas.push('leyo_notas');
    if (fallosTotales > 0) conductas.push('reintento');
    if (ayudaRecibida) conductas.push('ayuda_automatica');
    if (!leyoNotas && fallosTotales === 0) conductas.push('dedujo_sin_ayuda');
    const clave = leyoNotas ? 'consulta' : fallosTotales > 0 ? 'persistente' : 'analitico';
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallosTotales, ayudaRecibida, precision: precisionPorIntentos(fallosTotales, ayudaRecibida) }), 1200);
  };

  const probar = () => {
    const aciertos = orden.filter((id, i) => PASOS_CORRECTOS[i].id === id).length;
    if (aciertos === PASOS_CORRECTOS.length) {
      setAciertosUltimo(aciertos);
      terminar(false, fallos);
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    setAciertosUltimo(aciertos);
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
      setAyuda(true);
      setOrden(PASOS_CORRECTOS.map((p) => p.id));
      terminar(true, nuevos);
    }
  };

  const soltar = (e: DragEvent, destino: number) => {
    e.preventDefault();
    if (arrastrando !== null) mover(arrastrando, destino);
    setArrastrando(null);
  };

  return (
    <div className="grid gap-4">
      <Boton
        onClick={() => {
          setNotasAbiertas((v) => !v);
          setLeyoNotas(true);
        }}
        aria-expanded={notasAbiertas}
        disabled={resuelto}
      >
        📝 {notasAbiertas ? 'Ocultar notas de Leo' : 'Leer las notas de Leo en la pizarra'}
      </Boton>

      {notasAbiertas && (
        <div className="rounded-xl border border-slate-500/40 bg-slate-100/5 p-4 font-[cursive] text-slate-100">
          <ul className="grid gap-1">
            {NOTAS.map((n) => (
              <li key={n}>✎ {n}</li>
            ))}
          </ul>
        </div>
      )}

      <ol className="grid gap-2" aria-label="Pasos del reinicio, en orden">
        {orden.map((id, i) => {
          const paso = porId.get(id)!;
          const correcto = resuelto;
          return (
            <li
              key={id}
              draggable={!resuelto}
              onDragStart={() => setArrastrando(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => soltar(e, i)}
              onDragEnd={() => setArrastrando(null)}
              className={`flex items-center gap-2 rounded-xl border p-2 transition-all motion-reduce:transition-none ${
                correcto
                  ? 'border-emerald-400/60 bg-emerald-500/15'
                  : arrastrando === i
                    ? 'border-cyan-200 bg-cyan-400/20 opacity-60'
                    : 'border-slate-600 bg-slate-900/70'
              } ${resuelto ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/40 font-mono text-sm text-cyan-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-slate-100">{paso.texto}</p>
                {paso.margen && <p className="text-xs italic text-amber-200/70">{paso.margen}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => mover(i, i - 1)}
                  disabled={i === 0 || resuelto}
                  aria-label={`Subir «${paso.texto}»`}
                  className="h-7 w-9 rounded-md border border-slate-600 text-slate-300 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-20"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i + 1)}
                  disabled={i === orden.length - 1 || resuelto}
                  aria-label={`Bajar «${paso.texto}»`}
                  className="h-7 w-9 rounded-md border border-slate-600 text-slate-300 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-20"
                >
                  ▼
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>

      {aciertosUltimo !== null && !resuelto && (
        <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          El generador tose y se apaga. {aciertosUltimo} de 5 pasos estaban en su sitio. ¿Qué crees que va antes?
        </p>
      )}
      {resuelto && !ayuda && (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          Los indicadores se encienden uno tras otro. ¡Secuencia correcta!
        </p>
      )}
      {ayuda && (
        <Bocadillo personaje="lisa" expresion="contento">
          ¡He encontrado la página que faltaba debajo de la mesa! Mira, el orden es este.
        </Bocadillo>
      )}

      <Boton variante="primario" onClick={probar} disabled={resuelto} silencioso>
        ▶ Probar secuencia
      </Boton>
    </div>
  );
}
