import { useId, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import Retrato, { ESPECIALIDAD_PERSONAJE, NOMBRE_PERSONAJE, ROL_PERSONAJE } from '../components/Retrato';
import { Bocadillo, Boton } from '../components/ui';
import type { Personaje } from '../types/game';
import BarraInventario from './Inventario';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Persona = Personaje | 'tu';
type Tarea = 'invernadero' | 'presion' | 'batiscafo' | 'datos' | 'valvula' | 'guiar';

const EQUIPO: Personaje[] = ['lisa', 'leo', 'reyes', 'aris'];
const PERSONAS: Persona[] = [...EQUIPO, 'tu'];
const nombre = (p: Persona) => (p === 'tu' ? 'Tú' : NOMBRE_PERSONAJE[p]);
const MAX_TAREAS = 2;

const TAREAS: { id: Tarea; titulo: string; detalle: string; icono: string; especialista: Persona | null }[] = [
  { id: 'invernadero', titulo: 'Aislar el invernadero hidropónico', detalle: 'Sellar los cultivos para no perder la generación de oxígeno.', icono: '🌱', especialista: 'lisa' },
  { id: 'presion', titulo: 'Recalibrar los reguladores de presión', detalle: 'Ajustar las válvulas de los pasillos para que los mamparos aguanten.', icono: '🧭', especialista: 'leo' },
  { id: 'batiscafo', titulo: 'Encender y probar el batiscafo', detalle: 'Arrancar los motores de la cápsula de escape y revisar la telemetría.', icono: '🚀', especialista: 'reyes' },
  { id: 'datos', titulo: 'Extraer el núcleo de datos', detalle: 'Descifrar seis meses de investigación y copiarla en discos físicos.', icono: '💾', especialista: 'aris' },
  { id: 'guiar', titulo: 'Guiar a los tres becarios del Sector C', detalle: 'Llevarlos con calma hasta la zona segura, explicándoles qué pasa.', icono: '🧑‍🤝‍🧑', especialista: null },
  { id: 'valvula', titulo: 'Cerrar la válvula de refrigerante inundada', detalle: 'Subnivel a oscuras, agua por la cintura y cables sueltos. Fuerza y riesgo físico: no es la especialidad de nadie.', icono: '⚠️', especialista: null },
];

/** Lo que dice cada persona si se le pregunta: su especialidad y una limitación que no se ve a simple vista. */
const OPINIONES: Record<Personaje, string> = {
  lisa: 'El invernadero lo conozco al dedillo. Y si hace falta, puedo encargarme de algo más.',
  leo: 'Las válvulas de presión son lo mío… pero, por favor, el agua no. Me bloqueo.',
  reyes: 'Mi sitio es el batiscafo: no puedo alejarme de él por si hay que salir. Solo esa tarea.',
  aris: 'Puedo salvar los datos, pero me he hecho un corte en la mano: nada que exija fuerza.',
};

/** Limitaciones que hacen fallar el plan (se descubren preguntando o al ejecutarlo). */
function conflictos(plan: Plan): { persona: Persona; texto: string }[] {
  const lista: { persona: Persona; texto: string }[] = [];
  if (plan.valvula === 'leo') lista.push({ persona: 'leo', texto: 'Lo siento… no puedo meterme en el agua. Me quedo bloqueado.' });
  if (plan.valvula === 'aris') lista.push({ persona: 'aris', texto: 'Con la mano herida no puedo girar esa rueda. Necesitamos a otra persona.' });
  const deReyes = TAREAS.filter((t) => plan[t.id] === 'reyes').map((t) => t.id);
  if (deReyes.some((t) => t !== 'batiscafo')) lista.push({ persona: 'reyes', texto: 'No puedo alejarme del batiscafo: si me voy, nadie lo tendrá listo.' });
  return lista;
}

type Plan = Partial<Record<Tarea, Persona>>;

export default function Evacuacion({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [plan, setPlan] = useState<Plan>({});
  const [pregunto, setPregunto] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [ayuda, setAyuda] = useState(false);
  const [segura, setSegura] = useState(false);
  const [aviso, setAviso] = useState<{ persona: Persona; texto: string } | null>(null);
  const [pistaReyes, setPistaReyes] = useState<string | null>(null);
  const [ejecutado, setEjecutado] = useState(false);
  const id = useId();
  // Telemetría para los indicadores.
  const preguntoAntes = useRef<boolean | null>(null);
  const primeraEjecucion = useRef<{ sobrecarga: boolean; conflicto: boolean } | null>(null);
  const objetoSeguridad = useRef<string | null>(null);

  const asignar = (tarea: Tarea, persona: Persona | '') => {
    if (ejecutado) return;
    sonido.click();
    registrar('accion', { que: 'asignar', tarea, persona });
    setAviso(null);
    setPlan((p) => {
      const nuevo = { ...p };
      if (persona) nuevo[tarea] = persona;
      else delete nuevo[tarea];
      return nuevo;
    });
  };

  const preguntar = () => {
    setPregunto(true);
    registrar('accion', { que: 'preguntar' });
    if (preguntoAntes.current === null) preguntoAntes.current = fallos === 0;
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
    const sobrecargado = [...cargas(plan).entries()].find(([, n]) => n > MAX_TAREAS);
    const choques = conflictos(plan);
    if (!primeraEjecucion.current) primeraEjecucion.current = { sobrecarga: !!sobrecargado, conflicto: choques.length > 0 };
    if (preguntoAntes.current === null && !pregunto) preguntoAntes.current = false;

    if (sobrecargado || choques.length) {
      // Un plan inviable no resta puntos: no funciona y hay que rehacerlo.
      sonido.aviso();
      const nuevos = fallos + 1;
      setFallos(nuevos);
      registrar('fallo', { firma: TAREAS.map((t) => plan[t.id] ?? '-').join(','), motivo: sobrecargado ? 'sobrecarga' : 'limitacion' });
      if (sobrecargado) {
        const [quien, n] = sobrecargado;
        setAviso({ persona: quien, texto: quien === 'tu' ? `No te da la vida para ${n} tareas a la vez: el plan se atasca. Reparte mejor.` : `Son ${n} tareas para una sola persona… no llego a todo. ¿Podemos repartir mejor?` });
      } else {
        setAviso(choques[0]);
      }
      if (nuevos === 2) {
        // Dificultad adaptativa: Reyes señala qué tipo de problema tiene el plan.
        setPistaReyes(sobrecargado ? 'Nadie puede con más de dos tareas. Mira bien las cargas.' : 'Cada persona tiene sus límites. Preguntar al equipo te ahorraría sorpresas.');
        registrar('ayuda', { tipo: 'pista' });
      }
      if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
        setAyuda(true);
        registrar('ayuda', { tipo: 'automatica' });
        // Reyes propone el reparto por especialidades; la tarea crítica la sigue decidiendo el alumno.
        setPlan((p) => ({ invernadero: 'lisa', presion: 'leo', batiscafo: 'reyes', datos: 'aris', guiar: 'lisa', ...(p.valvula && !['leo', 'aris', 'reyes'].includes(p.valvula) ? { valvula: p.valvula } : {}) }));
      }
      return;
    }

    setEjecutado(true);
    sonido.exito();
    registrar('accion', { que: 'ejecutar', ok: true });
    const especialistas = TAREAS.filter((t) => t.especialista);
    const optimos = especialistas.filter((t) => plan[t.id] === t.especialista).length;
    const critica = plan.valvula;
    const conductas: string[] = [];
    if (pregunto) conductas.push('pregunto_equipo');
    if (critica === 'tu') conductas.push('asumio_tarea_dificil');
    else if (segura) conductas.push('delego_con_seguridad');
    else conductas.push('delego_riesgo');
    if (optimos >= 3) conductas.push('reparto_por_perfiles');
    if (primeraEjecucion.current?.sobrecarga) conductas.push('sobrecargo_equipo');
    if (primeraEjecucion.current?.conflicto) conductas.push('ignoro_limitaciones');
    if (fallos > 0) conductas.push('reintento');
    if (ayuda) conductas.push('ayuda_automatica');
    if (objetoSeguridad.current) conductas.push('uso_objeto_alternativo');
    const clave = critica === 'tu' ? 'ejemplo' : optimos >= 3 ? 'situacional' : pregunto ? 'consenso' : 'improvisado';
    if (clave === 'improvisado') conductas.push('reparto_no_convencional');
    const indicadores: Record<string, number> = {
      eva_encaje: optimos / especialistas.length,
      eva_restricciones: primeraEjecucion.current?.conflicto ? 0.35 : 1,
      eva_carga: primeraEjecucion.current?.sobrecarga ? 0.5 : 1,
      eva_responsabilidad: critica === 'tu' ? 1 : segura ? 0.9 : 0.4,
      eva_consulta: preguntoAntes.current ? 1 : pregunto ? 0.7 : 0.3,
    };
    // Precisión: especialistas en su tarea (hasta 80) + tarea crítica asumida o asegurada (20), menos 10 por plan rehecho.
    const precision = Math.max(0, Math.round((optimos / especialistas.length) * 80 + (critica === 'tu' || segura ? 20 : 0) - fallos * 10));
    if (critica && critica !== 'tu') {
      setAviso({ persona: critica, texto: segura ? 'Con esto voy mucho más segura/o. Me encargo de la válvula.' : 'Vale… me meto en el agua a oscuras. Ojalá no tarde mucho.' });
    }
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda, precision, indicadores }), critica && critica !== 'tu' ? 2600 : 900);
  };

  const usarObjeto = (oid: string): string | null => {
    if ((oid === 'linterna' || oid === 'cuerda') && !segura) {
      setSegura(true);
      objetoSeguridad.current = oid;
      return oid === 'linterna' ? 'Con la linterna, el subnivel deja de estar a oscuras: quien baje verá los cables sueltos.' : 'Con la cuerda y el mosquetón, quien baje irá asegurado. La válvula ya no es tan peligrosa.';
    }
    return null;
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
                <p className={`mt-1 text-[11px] ${(carga.get(p) ?? 0) > MAX_TAREAS ? 'text-amber-300' : 'text-slate-500'}`}>
                  {carga.get(p)} tarea{carga.get(p) === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">Seis tareas y cinco personas (contándote a ti). Nadie puede con más de {MAX_TAREAS}.</p>

      {!pregunto ? (
        <Boton onClick={preguntar} disabled={ejecutado}>
          💬 Preguntar al equipo cómo está cada uno
        </Boton>
      ) : (
        <div className="grid gap-2">
          {EQUIPO.map((p) => (
            <Bocadillo key={p} personaje={p} expresion={p === 'leo' || p === 'aris' ? 'preocupado' : 'neutral'} anunciar={false}>
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
              <p className="text-sm text-slate-400">
                {t.detalle}
                {t.id === 'valvula' && segura && <span className="ml-1 text-emerald-300">(ahora con medios de seguridad)</span>}
              </p>
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
      {pistaReyes && !ayuda && !ejecutado && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          {pistaReyes}
        </Bocadillo>
      )}
      {ayuda && !ejecutado && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          Propongo esto: cada uno a su especialidad y Lisa guía a los becarios. La válvula inundada… esa la decides tú.
        </Bocadillo>
      )}

      <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} desactivado={ejecutado} />

      <Boton variante="primario" onClick={ejecutar} disabled={!completo || ejecutado} silencioso>
        ▶ Ejecutar el plan
      </Boton>
    </div>
  );
}
