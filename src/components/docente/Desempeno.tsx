import { useState, type FormEvent } from 'react';
import { BANDAS, NOMBRE_BANDA, bandaFinal, type AjusteDocente, type Banda, type Evaluacion } from '../../logica/evaluacion';
import { HABILIDADES, NOMBRE_HABILIDAD, type Habilidad } from '../../types/game';
import { Boton } from '../ui';
import { COLOR_ALUMNO } from './RadarHabilidades';

const ESTILO_BANDA: Record<Banda, string> = {
  emergente: 'border-slate-500/50 bg-slate-500/15 text-slate-200',
  desarrollo: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100',
  consolidado: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
};

const TEXTO_CONFIANZA = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' } as const;

interface Props {
  evaluacion: Evaluacion;
  ajustes: AjusteDocente[];
  /** Si se pasa, el docente puede ajustar las bandas. */
  onGuardar?: (ajuste: AjusteDocente) => Promise<void>;
  onQuitar?: (habilidad: Habilidad) => Promise<void>;
}

/**
 * Desempeño por habilidad en bandas, con su confianza, el porqué (las evidencias
 * de la matriz de especificación) y el ajuste manual del docente.
 */
export default function Desempeno({ evaluacion, ajustes, onGuardar, onQuitar }: Props) {
  const [abierta, setAbierta] = useState<Habilidad | null>(null);
  const [editando, setEditando] = useState<Habilidad | null>(null);

  return (
    <div className="grid gap-3">
      {evaluacion.sospechosa && (
        <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Patrón de juego muy rápido y sin pausas en varios retos: puede que haya jugado al azar. Toma estos resultados con cautela.
        </p>
      )}
      <ul className="grid gap-3">
        {HABILIDADES.map((h) => {
          const ev = evaluacion.habilidades[h];
          const { banda, ajuste } = bandaFinal(ev, ajustes);
          return (
            <li key={h} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="w-28 font-medium text-white">{NOMBRE_HABILIDAD[h]}</span>
                {banda ? (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILO_BANDA[banda]}`}>
                    {NOMBRE_BANDA[banda]}
                    {ajuste && ' ✎'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Sin evidencia</span>
                )}
                <span className="text-xs text-slate-500">{TEXTO_CONFIANZA[ev.confianza]}</span>
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    aria-expanded={abierta === h}
                    onClick={() => setAbierta((x) => (x === h ? null : h))}
                    className="no-imprimir rounded-md px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    ¿Por qué?
                  </button>
                  {onGuardar && (
                    <button
                      type="button"
                      onClick={() => setEditando((x) => (x === h ? null : h))}
                      className="no-imprimir rounded-md px-2 py-1 text-xs text-amber-200 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      ✎ Ajustar
                    </button>
                  )}
                </span>
              </div>

              {ev.valor !== null && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-2 flex-1 rounded-full bg-slate-800" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${ev.valor}%`, background: COLOR_ALUMNO }} />
                    {[40, 70].map((u) => (
                      <span key={u} className="absolute top-[-3px] h-[14px] w-px bg-slate-500" style={{ left: `${u}%` }} />
                    ))}
                  </div>
                  <span className="w-20 text-right font-mono text-xs text-slate-300">{ev.valor} / 100</span>
                </div>
              )}

              {ajuste && (
                <p className="mt-2 text-xs text-amber-200/90">
                  Ajustado por el docente ({new Date(ajuste.fecha).toLocaleDateString('es-ES')}). El juego calculó: {ev.banda ? `${NOMBRE_BANDA[ev.banda]} (${ev.valor})` : 'sin evidencia'}. Motivo: «{ajuste.motivo}»
                </p>
              )}

              {editando === h && onGuardar && (
                <FormAjuste
                  habilidad={h}
                  inicial={ajuste}
                  onCancelar={() => setEditando(null)}
                  onGuardar={async (a) => {
                    await onGuardar(a);
                    setEditando(null);
                  }}
                  onQuitar={
                    ajuste && onQuitar
                      ? async () => {
                          await onQuitar(h);
                          setEditando(null);
                        }
                      : undefined
                  }
                />
              )}

              {abierta === h && (
                <div className="mt-3 overflow-x-auto">
                  {ev.evidencias.length === 0 ? (
                    <p className="text-sm text-slate-500">Todavía no hay evidencia de esta habilidad.</p>
                  ) : (
                    <table className="w-full min-w-[34rem] text-left text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          <th scope="col" className="py-1 pr-2 font-medium">Indicador</th>
                          <th scope="col" className="py-1 pr-2 font-medium">Dónde</th>
                          <th scope="col" className="py-1 pr-2 text-right font-medium">Valor</th>
                          <th scope="col" className="py-1 text-right font-medium">Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ev.evidencias.map((e, i) => (
                          <tr key={`${e.def.id}-${i}`} className="border-t border-slate-800 align-top">
                            <th scope="row" className="py-1.5 pr-2 font-normal text-slate-200">
                              {e.def.nombre}
                              <span className="block text-[11px] text-slate-500">
                                {e.def.descripcion} <em>({e.def.referencia})</em>
                              </span>
                            </th>
                            <td className="py-1.5 pr-2 text-slate-400">{e.origen}</td>
                            <td className="whitespace-nowrap py-1.5 pr-2 text-right font-mono text-slate-200">{Math.round(e.valor * 100)} %</td>
                            <td className="py-1.5 text-right font-mono text-slate-400">×{e.def.pesos[h]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500">
        Cada habilidad se calcula con una media ponderada de indicadores observados en el juego (de 0 a 100). Bandas: menos de 40, Emergente; de 40 a 69, En desarrollo; 70 o más, Consolidado. La confianza depende de cuánta evidencia hay. Son indicios para contrastar con la observación en el aula, no un diagnóstico.
      </p>
    </div>
  );
}

function FormAjuste({
  habilidad,
  inicial,
  onGuardar,
  onCancelar,
  onQuitar,
}: {
  habilidad: Habilidad;
  inicial?: AjusteDocente;
  onGuardar: (a: AjusteDocente) => Promise<void>;
  onCancelar: () => void;
  onQuitar?: () => Promise<void>;
}) {
  const [banda, setBanda] = useState<Banda>(inicial?.banda ?? 'desarrollo');
  const [motivo, setMotivo] = useState(inicial?.motivo ?? '');
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'error'>('idle');
  const [error, setError] = useState('');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEstado('guardando');
    try {
      await onGuardar({ habilidad, banda, motivo: motivo.trim(), fecha: new Date().toISOString() });
    } catch (err) {
      setEstado('error');
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  return (
    <form onSubmit={enviar} className="no-imprimir mt-3 grid gap-2 rounded-lg border border-amber-300/25 bg-amber-500/5 p-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 text-xs text-slate-400">Banda según tu observación en el aula</legend>
        {BANDAS.map((b) => (
          <label key={b} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${banda === b ? ESTILO_BANDA[b] : 'border-slate-700 text-slate-300'}`}>
            <input type="radio" name={`banda-${habilidad}`} value={b} checked={banda === b} onChange={() => setBanda(b)} className="accent-cyan-400" />
            {NOMBRE_BANDA[b]}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-xs text-slate-400">
        Motivo (obligatorio): qué has observado
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          minLength={3}
          maxLength={500}
          rows={2}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"
          placeholder="Ej.: en los trabajos en grupo organiza al equipo con naturalidad."
        />
      </label>
      {estado === 'error' && <p className="text-sm text-rose-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" variante="primario" disabled={motivo.trim().length < 3 || estado === 'guardando'} silencioso>
          Guardar ajuste
        </Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
        {onQuitar && (
          <Boton variante="peligro" onClick={() => void onQuitar()}>
            Quitar ajuste
          </Boton>
        )}
      </div>
    </form>
  );
}
