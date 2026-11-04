import { useState } from 'react';
import { describirEleccion, escenasPorId } from '../../data/guion';
import { duracionMinutos, porcentajes } from '../../logica/puntuacion';
import { recomendacionLocal } from '../../logica/recomendacion';
import { MECANICAS_INFO, etiquetaConducta } from '../../mecanicas/registro';
import { MODO, informeIA } from '../../servicios/partidas';
import { NOMBRE_HABILIDAD, type EstadoAlumno, type Habilidades } from '../../types/game';
import { Boton } from '../ui';
import RadarHabilidades from './RadarHabilidades';

interface Props {
  partida: EstadoAlumno;
  mediaClase?: Habilidades;
}

export default function DetallePartida({ partida, mediaClase }: Props) {
  const pct = porcentajes(partida);
  const rec = recomendacionLocal(partida);
  const [ia, setIa] = useState<{ estado: 'idle' | 'cargando' | 'ok' | 'error'; texto?: string }>({ estado: 'idle' });
  const minutos = duracionMinutos(partida);

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
          <h2 id={`detalle-${partida.partidaId}`} className="font-mono text-3xl font-semibold text-white">
            {partida.alumnoCodigo}
          </h2>
          <p className="text-sm text-slate-400">
            {new Date(partida.iniciadaEn).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
            {minutos !== null && ` · ${minutos} min`}
            {!partida.completada && ' · en curso'}
          </p>
        </div>
        <Boton variante="fantasma" className="no-imprimir" onClick={() => window.print()}>
          🖨 Imprimir informe
        </Boton>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Perfil de fortalezas</h3>
          <RadarHabilidades principal={pct} nombrePrincipal={partida.alumnoCodigo} comparacion={mediaClase} />
          <p className="text-xs text-slate-500">
            Porcentaje sobre el máximo alcanzable en las escenas que visitó. Indica tendencias en esta partida, no un nivel de competencia.
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
            {ia.estado === 'ok' ? 'Redactado con IA a partir de porcentajes y decisiones, sin datos identificativos.' : 'Generado con plantilla local.'}
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

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recorrido y decisiones</h3>
        <ol className="mt-3 grid gap-2 border-l border-slate-700 pl-5">
          {partida.historial.map((r, i) => {
            const escena = escenasPorId.get(r.escenaId);
            const esMini = escena?.tipo === 'minijuego';
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
        <p className="mt-2 text-xs text-slate-500">El tiempo de respuesta es solo telemetría: no influye en el perfil.</p>
      </section>
    </article>
  );
}
