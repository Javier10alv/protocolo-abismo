import { HUB } from '../../data/guion';
import { metricasPorArea, precisionMedia, tiempoTotalTexto } from '../../logica/metricas';
import { duracionSegundos, formatearSegundos } from '../../logica/puntuacion';
import { NOMBRE_BANDA, bandaFinal, desempenoNumerico, evaluar, type AjusteDocente, type Banda } from '../../logica/evaluacion';
import { sugerirGrupos } from '../../logica/recomendacion';
import { HABILIDADES, NOMBRE_HABILIDAD, type EstadoAlumno, type Habilidad, type Habilidades } from '../../types/game';
import GraficoPrioridades from './GraficoPrioridades';
import RadarHabilidades from './RadarHabilidades';

/** Puntos de prioridad medios (0–10, con un decimal) de las partidas completadas. */
export function mediaHabilidades(partidas: EstadoAlumno[]): Habilidades | undefined {
  const completas = partidas.filter((p) => p.completada);
  if (completas.length === 0) return undefined;
  const suma = { logica: 0, creatividad: 0, comunicacion: 0, resiliencia: 0, liderazgo: 0 };
  for (const p of completas) for (const h of HABILIDADES) suma[h] += p.habilidades[h];
  for (const h of HABILIDADES) suma[h] = Math.round((suma[h] / completas.length) * 10) / 10;
  return suma;
}

/** Rendimiento medio (0–100) de las partidas completadas. */
export function mediaRendimiento(partidas: EstadoAlumno[]): Habilidades | undefined {
  const completas = partidas.filter((p) => p.completada);
  if (completas.length === 0) return undefined;
  const suma = { logica: 0, creatividad: 0, comunicacion: 0, resiliencia: 0, liderazgo: 0 };
  for (const p of completas) {
    const d = desempenoNumerico(evaluar(p));
    for (const h of HABILIDADES) suma[h] += d[h];
  }
  for (const h of HABILIDADES) suma[h] = Math.round(suma[h] / completas.length);
  return suma;
}

/** Fondo de celda: escala secuencial de un solo tono (cian), de oscuro a claro. */
function fondoCelda(v: number) {
  return `rgba(8,145,178,${(0.08 + (v / 100) * 0.82).toFixed(2)})`;
}

const ABREV: Record<Habilidad, string> = { logica: 'Lóg.', creatividad: 'Crea.', comunicacion: 'Com.', resiliencia: 'Resi.', liderazgo: 'Lid.' };

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
  /** Se está mostrando la fila de ejemplo porque aún no hay partidas reales. */
  esPrueba?: boolean;
  ajustes?: Record<string, AjusteDocente[]>;
}

const ESTILO_BANDA: Record<Banda, string> = {
  emergente: 'bg-slate-600/40 text-slate-100',
  desarrollo: 'bg-cyan-600/40 text-cyan-50',
  consolidado: 'bg-emerald-600/45 text-emerald-50',
};

export default function VistaClase({ partidas, onElegir, esPrueba = false, ajustes = {} }: Props) {
  const completas = partidas.filter((p) => p.completada);
  const media = mediaHabilidades(partidas);
  const rendimiento = mediaRendimiento(partidas);
  const duraciones = completas.map(duracionSegundos).filter((d): d is number => d !== null);
  const mediaS = duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null;
  const precisiones = completas.map(precisionMedia).filter((p): p is number => p !== null);
  const precisionClase = precisiones.length ? Math.round(precisiones.reduce((a, b) => a + b, 0) / precisiones.length) : null;

  // Qué área eligió cada alumno en primer lugar (su prioridad natural).
  const primeras = new Map<Habilidad, number>();
  for (const p of completas) {
    const primera = metricasPorArea(p)[0];
    if (primera) primeras.set(primera.area, (primeras.get(primera.area) ?? 0) + 1);
  }
  const grupos = sugerirGrupos(completas, 3, ajustes);
  const evaluaciones = new Map(partidas.map((p) => [p.partidaId, evaluar(p)]));
  const desempenoMedio = (h: Habilidad) => {
    const v = completas.map((p) => desempenoNumerico(evaluaciones.get(p.partidaId)!)[h]);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const areas = HUB?.opciones.map((o) => o.area) ?? [...HABILIDADES];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile valor={String(esPrueba ? 0 : partidas.length)} etiqueta="Partidas reales" />
        <Tile valor={String(esPrueba ? 0 : completas.length)} etiqueta="Completadas" />
        <Tile valor={mediaS !== null ? formatearSegundos(mediaS) : '—'} etiqueta="Tiempo medio de sesión" />
        <Tile valor={precisionClase !== null ? `${precisionClase} %` : '—'} etiqueta="Precisión media" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Registro de la clase</h3>
        <p className="mt-1 text-xs text-slate-500">
          Secuencia de elecciones, tiempo total y, por área, tiempo en el minijuego y precisión. Pulsa un nombre para ver su informe.
        </p>
        <div className="mt-3 max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-0.5 text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr>
                <th scope="col" className="min-w-[10rem] px-2 py-1 text-left font-medium text-slate-400">Alumno</th>
                <th scope="col" className="px-2 py-1 text-left font-medium text-slate-400">Secuencia de elecciones</th>
                <th scope="col" className="px-2 py-1 text-right font-medium text-slate-400">Total</th>
                {areas.map((a) => (
                  <th key={a} scope="col" className="px-1 py-1 text-center text-xs font-medium text-slate-400">
                    <abbr title={NOMBRE_HABILIDAD[a]} className="no-underline">
                      {ABREV[a]}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => {
                const metricas = metricasPorArea(p);
                return (
                  <tr key={p.partidaId}>
                    <th scope="row" className="text-left">
                      <button
                        type="button"
                        onClick={() => onElegir(p.partidaId)}
                        className="rounded px-2 py-1 text-left text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                      >
                        {p.alumnoNombre}
                        {esPrueba && <span className="ml-2 rounded bg-amber-500/15 px-1.5 text-[10px] text-amber-200">Ejemplo</span>}
                      </button>
                    </th>
                    <td className="px-2 py-1">
                      <ol className="flex flex-wrap gap-1" aria-label="Orden de elección">
                        {metricas.map((m) => (
                          <li key={m.area} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-200">
                            {m.orden}.º {NOMBRE_HABILIDAD[m.area]}
                          </li>
                        ))}
                      </ol>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right font-mono text-xs text-slate-300">{tiempoTotalTexto(p)}</td>
                    {areas.map((a) => {
                      const m = metricas.find((x) => x.area === a);
                      return (
                        <td
                          key={a}
                          className="min-w-[4.5rem] whitespace-nowrap rounded px-2 py-1 text-center font-mono text-xs leading-tight text-white"
                          style={{ background: m?.precision != null ? fondoCelda(m.precision) : 'transparent' }}
                          title={m ? `${NOMBRE_HABILIDAD[a]}: ${m.orden}.º, ${m.tiempoS !== null ? formatearSegundos(m.tiempoS) : 'en curso'}, ${m.precision ?? '—'} %` : undefined}
                        >
                          {m && m.tiempoS !== null ? (
                            <>
                              {m.precision} %
                              <span className="block text-[10px] text-slate-300">{formatearSegundos(m.tiempoS)}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Desempeño de la clase</h3>
        <p className="mt-1 text-xs text-slate-500">Banda de cada habilidad según lo que hizo en los retos (✎ = ajustada por ti). Las celdas tenues tienen confianza baja.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-separate border-spacing-0.5 text-sm">
            <thead>
              <tr>
                <th scope="col" className="min-w-[10rem] px-2 py-1 text-left font-medium text-slate-400">Alumno</th>
                {HABILIDADES.map((h) => (
                  <th key={h} scope="col" className="px-1 py-1 text-center text-xs font-medium text-slate-400">
                    {NOMBRE_HABILIDAD[h]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => {
                const ev = evaluaciones.get(p.partidaId)!;
                return (
                  <tr key={p.partidaId}>
                    <th scope="row" className="text-left">
                      <button type="button" onClick={() => onElegir(p.partidaId)} className="rounded px-2 py-1 text-left text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        {p.alumnoNombre}
                        {ev.sospechosa && <span className="ml-2 text-[10px] text-amber-300" title="Posible juego al azar">⚠</span>}
                      </button>
                    </th>
                    {HABILIDADES.map((h) => {
                      const e = ev.habilidades[h];
                      const { banda, ajuste } = bandaFinal(e, ajustes[p.partidaId] ?? []);
                      return (
                        <td
                          key={h}
                          className={`whitespace-nowrap rounded px-2 py-1 text-center text-xs ${banda ? ESTILO_BANDA[banda] : 'text-slate-600'} ${e.confianza === 'baja' && !ajuste ? 'opacity-50' : ''}`}
                          title={`${NOMBRE_HABILIDAD[h]}: ${e.valor ?? '—'} / 100 · confianza ${e.confianza}${ajuste ? ` · ajustado: ${ajuste.motivo}` : ''}`}
                        >
                          {banda ? NOMBRE_BANDA[banda] : '—'}
                          {ajuste && ' ✎'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="px-2 py-1 text-left text-xs font-medium text-slate-400">Media de la clase</th>
                {HABILIDADES.map((h) => {
                  const m = desempenoMedio(h);
                  return (
                    <td key={h} className="px-2 py-1 text-center font-mono text-xs text-slate-300">
                      {m ?? '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Prioridades medias</h3>
            <p className="mb-2 mt-1 text-xs text-slate-500">Puntos medios según el orden de elección (1.ª = 10 … 5.ª = 1): qué atiende antes la clase.</p>
            {media ? <GraficoPrioridades principal={media} nombrePrincipal="Media de la clase" /> : <p className="text-slate-500">Sin partidas completadas.</p>}
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Rendimiento medio</h3>
            <p className="mb-2 mt-1 text-xs text-slate-500">Lo bien que lo hace la clase dentro de los retos (0–100).</p>
            {rendimiento ? <RadarHabilidades principal={rendimiento} nombrePrincipal="Media de la clase" unidad=" / 100" descripcionTabla="Rendimiento medio de cada habilidad (0–100)" alto={300} /> : <p className="text-slate-500">Sin partidas completadas.</p>}
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Primera área elegida</h3>
            <div className="mt-3 grid gap-2">
              {HABILIDADES.map((h) => {
                const n = primeras.get(h) ?? 0;
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

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Agrupamientos sugeridos</h3>
            <p className="mt-1 text-xs text-slate-500">Grupos que mezclan fortalezas de desempeño distintas para que se complementen. Ajústalos con tu conocimiento del aula.</p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {grupos.map((g, i) => (
                <li key={i} className="rounded-xl border border-slate-700 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Grupo {i + 1}</p>
                  <p className="mt-1 text-cyan-200">{g.miembros.map((m) => m.alumnoNombre).join(' · ')}</p>
                  <p className="mt-1 text-xs text-slate-400">{g.fortalezas.map((f) => NOMBRE_HABILIDAD[f]).join(', ')}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
