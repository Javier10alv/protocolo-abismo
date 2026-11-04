import { useState } from 'react';
import { describirEleccion, escenasPorId } from '../../data/guion';
import { metricasPorArea, precisionMedia, tiempoTotalTexto } from '../../logica/metricas';
import { formatearSegundos, porcentajes } from '../../logica/puntuacion';
import { recomendacionLocal } from '../../logica/recomendacion';
import { MECANICAS_INFO, etiquetaConducta } from '../../mecanicas/registro';
import { evaluar, type AjusteDocente } from '../../logica/evaluacion';
import { OBJETOS_POR_ID } from '../../data/objetos';
import { MODO, guardarAjuste, informeIA, quitarAjuste } from '../../servicios/partidas';
import { NOMBRE_HABILIDAD, type EstadoAlumno, type Habilidades } from '../../types/game';
import { Boton } from '../ui';
import Desempeno from './Desempeno';
import RadarHabilidades from './RadarHabilidades';

interface Props {
  partida: EstadoAlumno;
  mediaClase?: Habilidades;
  /** Fila de ejemplo («Alumno de Prueba»): no es una partida real. */
  esPrueba?: boolean;
  ajustes?: AjusteDocente[];
  /** Se llama tras guardar o quitar un ajuste, para recargar. */
  onAjustesCambiados?: () => void;
}

export default function DetallePartida({ partida, mediaClase, esPrueba = false, ajustes = [], onAjustesCambiados }: Props) {
  const pct = porcentajes(partida);
  const evaluacion = evaluar(partida);
  const rec = recomendacionLocal(partida, ajustes);
  const [ia, setIa] = useState<{ estado: 'idle' | 'cargando' | 'ok' | 'error'; texto?: string }>({ estado: 'idle' });
  const metricas = metricasPorArea(partida);
  const media = precisionMedia(partida);

  const pedirIA = async () => {
    setIa({ estado: 'cargando' });
    try {
      setIa({ estado: 'ok', texto: await informeIA(partida) });
    } catch (e) {
      setIa({ estado: 'error', texto: e instanceof Error ? e.message : 'Error desconocido' });
    }
  };

  return (
    <article className="grid gap-6" aria-labelledby={`detalle-${partida.partidaId}`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400/80">Clase {partida.claseId}</p>
          <h2 id={`detalle-${partida.partidaId}`} className="text-3xl font-semibold text-white">
            {partida.alumnoNombre}
            {esPrueba && <span className="ml-3 rounded-md bg-amber-500/15 px-2 py-0.5 align-middle text-xs font-normal text-amber-200">Ejemplo</span>}
          </h2>
          <p className="text-sm text-slate-400">
            ID <span className="font-mono">{partida.alumnoCodigo}</span> ·{' '}
            {new Date(partida.iniciadaEn).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })} · Sesión: {tiempoTotalTexto(partida)}
            {media !== null && ` · Precisión media: ${media} %`}
          </p>
        </div>
        <Boton variante="fantasma" className="no-imprimir" onClick={() => window.print()}>
          🖨 Imprimir informe
        </Boton>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Desempeño por habilidad</h3>
        <p className="mb-3 mt-1 text-xs text-slate-500">Lo que hizo dentro de los retos. Pulsa «¿Por qué?» para ver cada indicador y «Ajustar» si tu observación en el aula indica otra cosa.</p>
        <Desempeno
          evaluacion={evaluacion}
          ajustes={ajustes}
          onGuardar={
            esPrueba
              ? undefined
              : async (a) => {
                  await guardarAjuste(partida.partidaId, a);
                  onAjustesCambiados?.();
                }
          }
          onQuitar={
            esPrueba
              ? undefined
              : async (h) => {
                  await quitarAjuste(partida.partidaId, h);
                  onAjustesCambiados?.();
                }
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Prioridades ante la crisis</h3>
          <RadarHabilidades principal={pct} nombrePrincipal={partida.alumnoNombre} comparacion={mediaClase} />
          <p className="text-xs text-slate-500">
            Puntos según el orden en que eligió atender cada área (1.ª = 10, 2.ª = 7, 3.ª = 5, 4.ª = 3, 5.ª = 1), en % sobre 10. Muestra prioridades naturales en esta partida, no un nivel de competencia.
          </p>
        </section>

        <section className="grid content-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recomendación pedagógica</h3>
          <div className="flex flex-wrap gap-2">
            {rec.fortalezas.map((f) => (
              <span key={f} className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm text-cyan-200">
                ↑ Indicio: {NOMBRE_HABILIDAD[f]}
              </span>
            ))}
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-200">→ Oportunidad: {NOMBRE_HABILIDAD[rec.oportunidad]}</span>
          </div>
          <p className="leading-relaxed text-slate-200">{ia.estado === 'ok' ? ia.texto : rec.texto}</p>
          <p className="text-xs text-slate-500">
            {ia.estado === 'ok' ? 'Redactado con IA a partir del desempeño y las decisiones, sin datos identificativos.' : 'Generado con plantilla local a partir del desempeño (incluidos tus ajustes).'}
          </p>
          {MODO === 'supabase' ? (
            <div className="no-imprimir">
              <Boton onClick={pedirIA} disabled={ia.estado === 'cargando'}>
                {ia.estado === 'cargando' ? 'Redactando…' : '✨ Redactar con IA'}
              </Boton>
              {ia.estado === 'error' && <p className="mt-2 text-sm text-rose-300">{ia.texto}</p>}
            </div>
          ) : (
            <p className="no-imprimir text-xs text-slate-500">Conecta Supabase para redactar la recomendación con IA (ver README).</p>
          )}
          {rec.conductasDestacadas.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comportamientos observados</h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {rec.conductasDestacadas.map((c) => (
                  <li key={c} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">
                    {etiquetaConducta(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Secuencia de elecciones y desempeño</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-3">Orden</th>
                <th scope="col" className="py-2 pr-3">Área</th>
                <th scope="col" className="py-2 pr-3">Minijuego</th>
                <th scope="col" className="py-2 pr-3 text-right">Puntos</th>
                <th scope="col" className="py-2 pr-3 text-right">Decidió en</th>
                <th scope="col" className="py-2 pr-3 text-right">Tiempo</th>
                <th scope="col" className="py-2 pr-3 text-right">Aplazado</th>
                <th scope="col" className="py-2 text-right">Precisión</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => (
                <tr key={m.area} className="border-t border-slate-800">
                  <td className="py-2 pr-3 font-mono text-cyan-200">{m.orden}.º</td>
                  <th scope="row" className="py-2 pr-3 font-medium text-white">{NOMBRE_HABILIDAD[m.area]}</th>
                  <td className="py-2 pr-3 text-slate-300">{m.minijuego}</td>
                  <td className="py-2 pr-3 text-right font-mono">+{m.puntos}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-mono text-slate-400">{m.decisionS !== null ? formatearSegundos(m.decisionS) : '—'}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-mono">{m.tiempoS !== null ? formatearSegundos(m.tiempoS) : 'en curso'}</td>
                  <td className="py-2 pr-3 text-right font-mono text-slate-400">{m.retiradas ? `${m.retiradas}×` : '—'}</td>
                  <td className="whitespace-nowrap py-2 text-right">
                    {m.precision !== null ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-800 sm:inline-block" aria-hidden="true">
                          <span className="block h-full rounded-full bg-cyan-600" style={{ width: `${m.precision}%` }} />
                        </span>
                        <span className="font-mono">{m.precision} %</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {metricas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-slate-500">Todavía no ha elegido ninguna área.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {partida.inventario.length > 0 && (
          <p className="mt-3 text-sm text-slate-300">
            Objetos recogidos:{' '}
            {partida.inventario.map((o) => `${OBJETOS_POR_ID.get(o.id)?.icono ?? ''} ${OBJETOS_POR_ID.get(o.id)?.nombre ?? o.id}`).join(' · ')}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          La precisión mide la eficiencia dentro de cada minijuego (intentos, ayuda recibida, información útil…). Tiempo y precisión son métricas descriptivas: no cambian los puntos, que dependen solo del orden.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recorrido y decisiones</h3>
        <ol className="mt-3 grid gap-2 border-l border-slate-700 pl-5">
          {partida.historial.map((r, i) => {
            const escena = escenasPorId.get(r.escenaId);
            const esMini = escena?.tipo === 'minijuego';
            const usados = (r.eventos ?? []).filter((e) => e.tipo === 'objeto' && e.datos?.util === true).map((e) => OBJETOS_POR_ID.get(String(e.datos?.id))?.nombre);
            return (
              <li key={`${r.escenaId}-${i}`} className="relative rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <span aria-hidden="true" className={`absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-slate-950 ${esMini ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-white">
                    {escena?.titulo ?? r.escenaId}
                    {esMini && escena.tipo === 'minijuego' && (
                      <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-200">{MECANICAS_INFO[escena.mecanica].nombre}</span>
                    )}
                  </p>
                  {r.tiempoRespuestaMs !== undefined && <span className="font-mono text-xs text-slate-500">{Math.round(r.tiempoRespuestaMs / 1000)} s</span>}
                </div>
                <p className="mt-1 text-sm text-slate-300">{describirEleccion(r.escenaId, r.opcionId)}</p>
                {r.retirada && <p className="mt-1 text-xs text-amber-200">Aplazado tras {r.intentos ?? 0} intento(s) fallido(s).</p>}
                {r.reanudacion && <p className="mt-1 text-xs text-amber-200">Retomó el reto aplazado.</p>}
                {usados.length > 0 && <p className="mt-1 text-xs text-amber-100">Usó: {usados.join(', ')}</p>}
                {r.precision !== undefined && <p className="mt-1 text-xs text-cyan-300/80">Precisión: {r.precision} %</p>}
                {!!(r.conductas?.length || r.intentos) && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {r.conductas?.map((c) => (
                      <li key={c} className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                        {etiquetaConducta(c)}
                      </li>
                    ))}
                    {!!r.intentos && <li className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400">{r.intentos} intento(s) fallido(s)</li>}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-slate-500">Los tiempos son telemetría: no influyen en los puntos.</p>
      </section>
    </article>
  );
}
