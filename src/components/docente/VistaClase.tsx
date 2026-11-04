import { escenasPorId } from '../../data/guion';
import { duracionMinutos, ordenarHabilidades, porcentajes } from '../../logica/puntuacion';
import { sugerirGrupos } from '../../logica/recomendacion';
import { HABILIDADES, NOMBRE_HABILIDAD, type EstadoAlumno, type Habilidades } from '../../types/game';
import RadarHabilidades from './RadarHabilidades';

export function mediaHabilidades(partidas: EstadoAlumno[]): Habilidades | undefined {
  const completas = partidas.filter((p) => p.completada);
  if (completas.length === 0) return undefined;
  const suma = { logica: 0, creatividad: 0, comunicacion: 0, resiliencia: 0, liderazgo: 0 };
  for (const p of completas) {
    const pct = porcentajes(p);
    for (const h of HABILIDADES) suma[h] += pct[h];
  }
  for (const h of HABILIDADES) suma[h] = Math.round(suma[h] / completas.length);
  return suma;
}

/** Fondo de celda: escala secuencial de un solo tono (cian), de oscuro a claro. */
function fondoCelda(v: number) {
  return `rgba(8,145,178,${(0.08 + (v / 100) * 0.82).toFixed(2)})`;
}

function Tile({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-3xl font-semibold text-white">{valor}</p>
      <p className="mt-1 text-sm text-slate-400">{etiqueta}</p>
    </div>
  );
}

interface Props {
  partidas: EstadoAlumno[];
  onElegir: (partidaId: string) => void;
}

export default function VistaClase({ partidas, onElegir }: Props) {
  const completas = partidas.filter((p) => p.completada);
  const media = mediaHabilidades(partidas);
  const duraciones = completas.map(duracionMinutos).filter((d): d is number => d !== null);
  const mediaMin = duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null;

  // Qué camino eligió cada alumno tras el apagón (escenas esc_03_*).
  const ramas = new Map<string, number>();
  for (const p of completas) {
    const r = p.historial.find((h) => h.escenaId.startsWith('esc_03_'));
    if (r) ramas.set(r.escenaId, (ramas.get(r.escenaId) ?? 0) + 1);
  }

  // Fortaleza principal de cada alumno.
  const principales = new Map<string, number>();
  for (const p of completas) {
    const f = ordenarHabilidades(porcentajes(p))[0];
    principales.set(f, (principales.get(f) ?? 0) + 1);
  }

  const grupos = sugerirGrupos(completas);

  if (partidas.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Todavía no hay partidas en esta clase.</p>;
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile valor={String(partidas.length)} etiqueta="Partidas" />
        <Tile valor={String(completas.length)} etiqueta="Completadas" />
        <Tile valor={mediaMin !== null ? `${mediaMin} min` : '—'} etiqueta="Duración media" />
        <Tile valor={String(new Set(partidas.map((p) => p.alumnoCodigo)).size)} etiqueta="Alumnos distintos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Perfil medio de la clase</h3>
          {media ? <RadarHabilidades principal={media} nombrePrincipal="Media de la clase" /> : <p className="text-slate-500">Sin partidas completadas.</p>}
          <div className="mt-3 grid gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fortaleza principal</h4>
            {HABILIDADES.map((h) => {
              const n = principales.get(h) ?? 0;
              const pct = completas.length ? (n / completas.length) * 100 : 0;
              return (
                <div key={h} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm">
                  <span className="text-slate-300">{NOMBRE_HABILIDAD[h]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <span className="block h-full rounded-full bg-cyan-600" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-right font-mono text-slate-400">{n}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Mapa de la clase</h3>
          <p className="mt-1 text-xs text-slate-500">Porcentaje sobre el máximo alcanzable. Pulsa un código para ver su informe.</p>
          <div className="mt-3 max-h-[28rem] overflow-auto">
            <table className="w-full border-separate border-spacing-0.5 text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr>
                  <th scope="col" className="px-2 py-1 text-left font-medium text-slate-400">Código</th>
                  {HABILIDADES.map((h) => (
                    <th key={h} scope="col" className="px-1 py-1 text-center text-xs font-medium text-slate-400">
                      <abbr title={NOMBRE_HABILIDAD[h]} className="no-underline">
                        {NOMBRE_HABILIDAD[h].slice(0, 4)}.
                      </abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completas.map((p) => {
                  const pct = porcentajes(p);
                  return (
                    <tr key={p.partidaId}>
                      <th scope="row" className="text-left">
                        <button
                          type="button"
                          onClick={() => onElegir(p.partidaId)}
                          className="rounded px-2 py-1 font-mono text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        >
                          {p.alumnoCodigo}
                        </button>
                      </th>
                      {HABILIDADES.map((h) => (
                        <td key={h} className="rounded px-1 py-1 text-center font-mono text-xs text-white" style={{ background: fondoCelda(pct[h]) }} title={`${NOMBRE_HABILIDAD[h]}: ${pct[h]} %`}>
                          {pct[h]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Frente elegido tras el apagón</h3>
          <ul className="mt-3 grid gap-2">
            {[...ramas.entries()].map(([id, n]) => (
              <li key={id} className="grid grid-cols-[1fr_auto] gap-2 text-sm">
                <span className="text-slate-300">{escenasPorId.get(id)?.titulo ?? id}</span>
                <span className="font-mono text-slate-400">
                  {n} ({Math.round((n / completas.length) * 100)} %)
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Agrupamientos sugeridos</h3>
          <p className="mt-1 text-xs text-slate-500">Grupos que mezclan fortalezas distintas para que se complementen. Ajústalos con tu conocimiento del aula.</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {grupos.map((g, i) => (
              <li key={i} className="rounded-xl border border-slate-700 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Grupo {i + 1}</p>
                <p className="mt-1 font-mono text-cyan-200">{g.miembros.map((m) => m.alumnoCodigo).join(' · ')}</p>
                <p className="mt-1 text-xs text-slate-400">{g.fortalezas.map((f) => NOMBRE_HABILIDAD[f]).join(', ')}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
