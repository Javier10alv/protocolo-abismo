import { useId, useState } from 'react';
import { sonido } from '../audio/sonido';
import Retrato, { ESPECIALIDAD_PERSONAJE, NOMBRE_PERSONAJE, ROL_PERSONAJE } from '../components/Retrato';
import { Bocadillo, Boton } from '../components/ui';
import type { Personaje } from '../types/game';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Persona = Personaje | 'tu';
type Tarea = 'invernadero' | 'presion' | 'batiscafo' | 'datos' | 'valvula';

const EQUIPO: Personaje[] = ['lisa', 'leo', 'reyes', 'aris'];
const PERSONAS: Persona[] = [...EQUIPO, 'tu'];
const nombre = (p: Persona) => (p === 'tu' ? 'Tú' : NOMBRE_PERSONAJE[p]);

const TAREAS: { id: Tarea; titulo: string; detalle: string; icono: string; especialista: Persona | null }[] = [
  { id: 'invernadero', titulo: 'Aislar el invernadero hidropónico', detalle: 'Sellar los cultivos para no perder la generación de oxígeno.', icono: '🌱', especialista: 'lisa' },
  { id: 'presion', titulo: 'Recalibrar los reguladores de presión', detalle: 'Ajustar las válvulas de los pasillos para que los mamparos aguanten.', icono: '🧭', especialista: 'leo' },
  { id: 'batiscafo', titulo: 'Encender y probar el batiscafo', detalle: 'Arrancar los motores de la cápsula de escape y revisar la telemetría.', icono: '🚀', especialista: 'reyes' },
  { id: 'datos', titulo: 'Extraer el núcleo de datos', detalle: 'Descifrar seis meses de investigación y copiarla en discos físicos.', icono: '💾', especialista: 'aris' },
  { id: 'valvula', titulo: 'Cerrar la válvula de refrigerante inundada', detalle: 'Subnivel con agua por la cintura y cables sueltos. Fuerza y riesgo físico: no es la especialidad de nadie.', icono: '⚠️', especialista: null },
];

/** Lo que dice cada persona del equipo si se le pregunta. */
const OPINIONES: Record<Personaje, string> = {
  lisa: 'Si el invernadero se inunda, nos quedamos sin oxígeno. Eso lo conozco al dedillo.',
  leo: 'Las válvulas de presión son lo mío… si confías en mí, puedo hacerlo.',
  reyes: 'Alguien tiene que tener el batiscafo listo por si hay que salir. Ese es mi trabajo.',
  aris: 'Si no salvamos los datos ahora, perdemos seis meses de investigación. Déjamelo a mí.',
};

type Plan = Partial<Record<Tarea, Persona>>;

export default function Evacuacion({ onCompletar }: PropsMecanica) {
  const [plan, setPlan] = useState<Plan>({});
  const [pregunto, setPregunto] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [ayuda, setAyuda] = useState(false);
  const [sobrecargoAlguna, setSobrecargoAlguna] = useState(false);
  const [aviso, setAviso] = useState<{ persona: Persona; texto: string } | null>(null);
  const [ejecutado, setEjecutado] = useState(false);
  const id = useId();

  const asignar = (tarea: Tarea, persona: Persona | '') => {
    if (ejecutado) return;
    sonido.click();
    setAviso(null);
    setPlan((p) => {
      const nuevo = { ...p };
      if (persona) nuevo[tarea] = persona;
      else delete nuevo[tarea];
      return nuevo;
    });
  };

  const cargas = (p: Plan) => {
    const c = new Map<Persona, number>();
    for (const t of TAREAS) {
      const quien = p[t.id];
      if (quien) c.set(quien, (c.get(quien) ?? 0) + 1);
    }
    return c;
  };

  const ejecutar = () => {
    const sobrecargado = [...cargas(plan).entries()].find(([, n]) => n >= 3);
    if (sobrecargado) {
      // Sobrecargar a alguien no resta puntos: el plan no funciona y hay que rehacerlo.
      sonido.aviso();
      const nuevos = fallos + 1;
      setFallos(nuevos);
      setSobrecargoAlguna(true);
      const [quien, n] = sobrecargado;
      setAviso({
        persona: quien,
        texto: quien === 'tu' ? `No te da la vida para ${n} tareas a la vez: el plan se atasca. Reparte mejor.` : `Son ${n} tareas para una sola persona… no llego a todo a la vez. ¿Podemos repartir mejor?`,
      });
      if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
        setAyuda(true);
        // Reyes propone el reparto por especialidades; la tarea crítica la sigue decidiendo el alumno.
        setPlan((p) => ({ invernadero: 'lisa', presion: 'leo', batiscafo: 'reyes', datos: 'aris', ...(p.valvula === 'tu' ? { valvula: 'tu' as const } : {}) }));
      }
      return;
    }

    setEjecutado(true);
    sonido.exito();
    const optimos = TAREAS.filter((t) => t.especialista && plan[t.id] === t.especialista).length;
    const critica = plan.valvula;
    const conductas: string[] = [];
    if (pregunto) conductas.push('pregunto_equipo');
    if (critica === 'tu') conductas.push('asumio_tarea_dificil');
    else conductas.push('delego_riesgo');
    if (optimos >= 3) conductas.push('reparto_por_perfiles');
    if (sobrecargoAlguna) conductas.push('sobrecargo_equipo');
    if (fallos > 0) conductas.push('reintento');
    if (ayuda) conductas.push('ayuda_automatica');
    const clave = critica === 'tu' ? 'ejemplo' : optimos >= 3 ? 'situacional' : pregunto ? 'consenso' : 'improvisado';
    if (clave === 'improvisado') conductas.push('reparto_no_convencional');
    if (critica && critica !== 'tu') {
      setAviso({ persona: critica, texto: 'Vale… me meto en el agua. Ojalá no tarde mucho en volver la luz.' });
    }
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda }), critica && critica !== 'tu' ? 2600 : 900);
  };

  const completo = TAREAS.every((t) => plan[t.id]);
  const carga = cargas(plan);

  return (
    <div className="grid gap-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Equipo">
        {EQUIPO.map((p) => (
          <li key={p} className="flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
            <Retrato personaje={p} tamano={40} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-white">{NOMBRE_PERSONAJE[p]}</p>
              <p className="text-[11px] leading-tight text-slate-400">{ROL_PERSONAJE[p]}</p>
              {pregunto && <p className="mt-1 text-[11px] leading-tight text-cyan-200/90">{ESPECIALIDAD_PERSONAJE[p]}</p>}
              {(carga.get(p) ?? 0) > 0 && (
                <p className={`mt-1 text-[11px] ${(carga.get(p) ?? 0) >= 3 ? 'text-amber-300' : 'text-slate-500'}`}>
                  {carga.get(p)} tarea{carga.get(p) === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!pregunto ? (
        <Boton onClick={() => setPregunto(true)} disabled={ejecutado}>
          💬 Preguntar al equipo en qué es mejor cada uno
        </Boton>
      ) : (
        <div className="grid gap-2">
          {EQUIPO.map((p) => (
            <Bocadillo key={p} personaje={p} expresion={p === 'leo' ? 'preocupado' : 'neutral'} anunciar={false}>
              {OPINIONES[p]}
            </Bocadillo>
          ))}
        </div>
      )}

      <ol className="grid gap-2">
        {TAREAS.map((t) => (
          <li key={t.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${t.id === 'valvula' ? 'border-amber-400/40 bg-amber-500/5' : 'border-cyan-400/20 bg-slate-900/60'}`}>
            <span aria-hidden="true" className="text-2xl">
              {t.icono}
            </span>
            <div className="min-w-0 flex-1 basis-56">
              <label htmlFor={`${id}-${t.id}`} className="font-semibold text-white">
                {t.titulo}
              </label>
              <p className="text-sm text-slate-400">{t.detalle}</p>
            </div>
            <select
              id={`${id}-${t.id}`}
              value={plan[t.id] ?? ''}
              onChange={(e) => asignar(t.id, e.target.value as Persona | '')}
              disabled={ejecutado}
              className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 sm:w-48"
            >
              <option value="">— ¿Quién? —</option>
              {PERSONAS.map((p) => (
                <option key={p} value={p}>
                  {nombre(p)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ol>

      {aviso &&
        (aviso.persona === 'tu' ? (
          <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {aviso.texto}
          </p>
        ) : (
          <Bocadillo personaje={aviso.persona} expresion="preocupado">
            {aviso.texto}
          </Bocadillo>
        ))}
      {ayuda && !ejecutado && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          Propongo esto: cada uno a su especialidad. La válvula inundada… esa la decides tú.
        </Bocadillo>
      )}

      <Boton variante="primario" onClick={ejecutar} disabled={!completo || ejecutado} silencioso>
        ▶ Ejecutar el plan
      </Boton>
    </div>
  );
}
