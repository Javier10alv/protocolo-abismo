import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HABILIDADES, NOMBRE_HABILIDAD, type Habilidades } from '../../types/game';
import { COLOR_ALUMNO, COLOR_CLASE } from './RadarHabilidades';

const ORDINAL: Record<number, string> = { 10: '1.ª', 7: '2.ª', 5: '3.ª', 3: '4.ª', 1: '5.ª' };

interface Props {
  /** Puntos de prioridad (0–10) por habilidad. */
  principal: Habilidades;
  nombrePrincipal: string;
  /** Media de la clase (0–10). */
  comparacion?: Habilidades;
  nombreComparacion?: string;
  /** Muestra «1.ª elección» junto a cada barra (para un alumno, no para medias). */
  mostrarOrden?: boolean;
}

/**
 * Prioridades: puntos según el orden en que eligió cada área en el hub
 * (1.ª = 10 … 5.ª = 1). Barras horizontales en el orden fijo de las habilidades.
 */
export default function GraficoPrioridades({ principal, nombrePrincipal, comparacion, nombreComparacion = 'Media de la clase', mostrarOrden = false }: Props) {
  const datos = HABILIDADES.map((h) => ({
    habilidad: NOMBRE_HABILIDAD[h],
    principal: principal[h],
    comparacion: comparacion?.[h],
    etiqueta: mostrarOrden ? `${ORDINAL[principal[h]] ?? '—'} elección` : String(principal[h]),
  }));

  return (
    <figure className="grid gap-2">
      <div style={{ height: comparacion ? 300 : 250 }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 88, bottom: 4, left: 8 }} barGap={2} barCategoryGap={comparacion ? 10 : 14}>
            <CartesianGrid horizontal={false} stroke="#1e293b" />
            <XAxis type="number" domain={[0, 10]} ticks={[0, 1, 3, 5, 7, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="habilidad" width={96} tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(v) => `${v} de 10 puntos`}
            />
            <Bar dataKey="principal" name={nombrePrincipal} fill={COLOR_ALUMNO} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="etiqueta" position="right" fill="#cbd5e1" fontSize={11} />
            </Bar>
            {comparacion && <Bar dataKey="comparacion" name={nombreComparacion} fill={COLOR_CLASE} radius={[0, 4, 4, 0]} isAnimationActive={false} />}
            {comparacion && <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer text-cyan-300/80">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">Puntos de prioridad de cada área según el orden de elección</caption>
          <thead>
            <tr className="text-slate-300">
              <th scope="col" className="py-1">Área</th>
              <th scope="col" className="py-1">{nombrePrincipal}</th>
              {comparacion && <th scope="col" className="py-1">{nombreComparacion}</th>}
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.habilidad} className="border-t border-slate-800">
                <th scope="row" className="py-1 font-normal">{d.habilidad}</th>
                <td className="py-1 font-mono">{d.principal}{mostrarOrden ? ` (${d.etiqueta})` : ''}</td>
                {comparacion && <td className="py-1 font-mono">{d.comparacion}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
