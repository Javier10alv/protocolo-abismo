import { useState } from 'react';
import { sonido } from '../audio/sonido';
import Retrato from '../components/Retrato';
import { Bocadillo, Boton } from '../components/ui';
import type { PropsMecanica } from './tipos';

type Persona = 'lisa' | 'leo' | 'tu';
type Tarea = 'presion' | 'luz' | 'compuerta';

const TAREAS: { id: Tarea; titulo: string; detalle: string; icono: string; riesgo: string }[] = [
  { id: 'presion', titulo: 'Vigilar la presión', detalle: 'Atento al panel y avisar si sube la aguja.', icono: '🧭', riesgo: 'Requiere concentración' },
  { id: 'luz', titulo: 'Sujetar la luz y guiar', detalle: 'Iluminar el camino y avisar de obstáculos.', icono: '🔦', riesgo: 'Tarea tranquila' },
  { id: 'compuerta', titulo: 'Abrir la compuerta', detalle: 'Meterse en el agua y girar la manivela.', icono: '⚙️', riesgo: 'La más arriesgada' },
];

const PERSONAS: { id: Persona; nombre: string; rasgo: string }[] = [
  { id: 'lisa', nombre: 'Lisa', rasgo: 'Experta, pero cansada' },
  { id: 'leo', nombre: 'Leo', rasgo: 'Nervioso, buen ojo para los detalles' },
  { id: 'tu', nombre: 'Tú', rasgo: 'Lleno/a de energía' },
];

export default function Reparto({ onCompletar }: PropsMecanica) {
  const [asignacion, setAsignacion] = useState<Partial<Record<Tarea, Persona>>>({});
  const [pregunto, setPregunto] = useState(false);
  const [cambios, setCambios] = useState(0);
  const [confirmado, setConfirmado] = useState(false);

  const asignar = (tarea: Tarea, persona: Persona) => {
    if (confirmado) return;
    sonido.seleccion();
    if (asignacion[tarea] && asignacion[tarea] !== persona) setCambios((c) => c + 1);
    setAsignacion((prev) => {
      const nuevo = { ...prev };
      // Si la persona ya tenía otra tarea, se intercambian.
      const anterior = (Object.keys(nuevo) as Tarea[]).find((t) => nuevo[t] === persona);
      if (anterior && anterior !== tarea) {
        if (nuevo[tarea]) nuevo[anterior] = nuevo[tarea];
        else delete nuevo[anterior];
      }
      nuevo[tarea] = persona;
      return nuevo;
    });
  };

  const confirmar = () => {
    setConfirmado(true);
    sonido.exito();
    const conductas: string[] = [];
    if (pregunto) conductas.push('pregunto_equipo');
    if (asignacion.compuerta === 'tu') conductas.push('asumio_tarea_dificil');
    if (!pregunto && asignacion.compuerta !== 'tu') conductas.push('reparto_por_perfiles');
    if (cambios > 0) conductas.push('reasigno');
    const clave = pregunto ? 'consenso' : asignacion.compuerta === 'tu' ? 'ejemplo' : 'estrategia';
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: 0, ayudaRecibida: false }), 800);
  };

  const completo = TAREAS.every((t) => asignacion[t.id]);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2">
        {PERSONAS.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-2 text-center">
            {p.id === 'tu' ? (
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/30 text-lg ring-2 ring-cyan-400/40">
                🧑‍🔬
              </span>
            ) : (
              <Retrato personaje={p.id} tamano={44} expresion={p.id === 'leo' ? 'preocupado' : 'neutral'} />
            )}
            <span className="text-sm font-semibold text-white">{p.nombre}</span>
            <span className="text-xs leading-tight text-slate-400">{p.rasgo}</span>
          </div>
        ))}
      </div>

      {!pregunto ? (
        <Boton onClick={() => setPregunto(true)} disabled={confirmado}>
          💬 Preguntar al equipo qué prefiere
        </Boton>
      ) : (
        <div className="grid gap-2">
          <Bocadillo personaje="lisa" expresion="pensativo">
            Puedo con la compuerta si hace falta, pero estoy agotada. El panel de presión me lo sé de memoria.
          </Bocadillo>
          <Bocadillo personaje="leo" expresion="preocupado">
            Prefiero algo fuera del agua… Se me dan bien los detalles: podría vigilar la presión o llevar la luz.
          </Bocadillo>
        </div>
      )}

      <div className="grid gap-3">
        {TAREAS.map((t) => (
          <fieldset key={t.id} className="rounded-xl border border-cyan-400/20 bg-slate-900/60 p-3">
            <legend className="sr-only">{t.titulo}</legend>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-2xl">
                {t.icono}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{t.titulo}</p>
                <p className="text-sm text-slate-400">
                  {t.detalle} <span className="text-cyan-300/80">· {t.riesgo}</span>
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={`¿Quién se encarga de: ${t.titulo}?`}>
              {PERSONAS.map((p) => {
                const elegido = asignacion[t.id] === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    disabled={confirmado}
                    onClick={() => asignar(t.id, p.id)}
                    className={`min-h-11 rounded-lg border text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none ${
                      elegido ? 'border-cyan-200 bg-cyan-500/40 font-semibold text-white shadow-[0_0_16px_-4px_rgba(34,211,238,0.8)]' : 'border-slate-600 text-slate-300 hover:border-cyan-300/60'
                    }`}
                  >
                    {elegido && <span aria-hidden="true">✓ </span>}
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <Boton variante="primario" onClick={confirmar} disabled={!completo || confirmado} silencioso>
        ✅ Confirmar reparto
      </Boton>
    </div>
  );
}
