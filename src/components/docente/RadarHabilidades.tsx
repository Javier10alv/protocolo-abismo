import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { HABILIDADES, NOMBRE_HABILIDAD, type Habilidades } from '../../types/game';

// Paleta validada (dataviz/validate_palette, modo oscuro sobre #0f172a):
// alumno #0891b2 · media de la clase #d97706 (además, línea discontinua).
export const COLOR_ALUMNO = '#0891b2';
export const COLOR_CLASE = '#d97706';

interface Props {
  principal: Habilidades;
  nombrePrincipal: string;
  comparacion?: Habilidades;
  nombreComparacion?: string;
  alto?: number;
}

/** Radar normalizado (0–100 % del máximo alcanzable). Incluye una tabla accesible equivalente. */
export default function RadarHabilidades({ principal, nombrePrincipal, comparacion, nombreComparacion = 'Media de la clase', alto = 340 }: Props) {
  const datos = HABILIDADES.map((h) => ({
    habilidad: NOMBRE_HABILIDAD[h],
    principal: principal[h],
    comparacion: comparacion?.[h],
  }));

  return (
    <figure className="grid gap-2">
      <div style={{ height: alto }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={datos} outerRadius="70%" margin={{ top: 12, right: 48, bottom: 12, left: 48 }}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            {comparacion && (
              <Radar
                name={nombreComparacion}
                dataKey="comparacion"
                stroke={COLOR_CLASE}
                strokeWidth={2}
                strokeDasharray="6 4"
                fill={COLOR_CLASE}
                fillOpacity={0.08}
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Radar
              name={nombrePrincipal}
              dataKey="principal"
              stroke={COLOR_ALUMNO}
              strokeWidth={2}
              fill={COLOR_ALUMNO}
              fillOpacity={0.3}
              dot={{ r: 4, fill: COLOR_ALUMNO, stroke: '#0f172a', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(v) => `${v} %`}
            />
            {comparacion && <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer text-cyan-300/80">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">Porcentaje de cada habilidad respecto al máximo alcanzable</caption>
          <thead>
            <tr className="text-slate-300">
              <th scope="col" className="py-1">Habilidad</th>
              <th scope="col" className="py-1">{nombrePrincipal}</th>
              {comparacion && <th scope="col" className="py-1">{nombreComparacion}</th>}
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.habilidad} className="border-t border-slate-800">
                <th scope="row" className="py-1 font-normal">{d.habilidad}</th>
                <td className="py-1 font-mono">{d.principal} %</td>
                {comparacion && <td className="py-1 font-mono">{d.comparacion} %</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
