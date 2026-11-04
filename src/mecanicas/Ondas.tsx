import { useEffect, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import type { PropsMecanica } from './tipos';

// Parámetros discretos (no exigen precisión motora): se ajustan con botones − / +.
interface Onda {
  frecuencia: number; // 1–6
  amplitud: number; // 1–4
  fase: number; // 0–7 (× 45°)
}

const LIMITES: Record<keyof Onda, [number, number]> = { frecuencia: [1, 6], amplitud: [1, 4], fase: [0, 7] };
const NOMBRES: Record<keyof Onda, string> = { frecuencia: 'Frecuencia', amplitud: 'Amplitud', fase: 'Desfase' };

/**
 * Objetivos sucesivos. Los dos primeros "fallan" a propósito al sincronizar
 * (error del sistema): la mecánica observa cómo reacciona el alumno ante
 * contratiempos que no dependen de él. Se le explica al terminar.
 */
const OBJETIVOS: Onda[] = [
  { frecuencia: 3, amplitud: 2, fase: 2 },
  { frecuencia: 5, amplitud: 3, fase: 6 },
  { frecuencia: 2, amplitud: 4, fase: 4 },
];
const ERRORES_DEL_SISTEMA = OBJETIVOS.length - 1;

const iguales = (a: Onda, b: Onda) => a.frecuencia === b.frecuencia && a.amplitud === b.amplitud && a.fase === b.fase;

function trazo(o: Onda, ancho = 320, alto = 120) {
  const puntos: string[] = [];
  for (let x = 0; x <= ancho; x += 4) {
    const t = (x / ancho) * Math.PI * 2;
    const y = alto / 2 - Math.sin(t * o.frecuencia + (o.fase * Math.PI) / 4) * o.amplitud * 12;
    puntos.push(`${x},${y.toFixed(1)}`);
  }
  return puntos.join(' ');
}

type Fase = 'ajustando' | 'sincronizando' | 'error' | 'hecho';

export default function Ondas({ onCompletar }: PropsMecanica) {
  const [onda, setOnda] = useState<Onda>({ frecuencia: 1, amplitud: 4, fase: 0 });
  const [nivel, setNivel] = useState(0); // índice del objetivo actual
  const [fase, setFase] = useState<Fase>('ajustando');
  const [progreso, setProgreso] = useState(0);
  const [pausas, setPausas] = useState(0);
  const [respirando, setRespirando] = useState(false);
  const [relevo, setRelevo] = useState(false);
  const temporizador = useRef<number | null>(null);
  const objetivo = OBJETIVOS[nivel];

  useEffect(() => () => {
    if (temporizador.current) window.clearInterval(temporizador.current);
  }, []);

  const terminar = (porRelevo: boolean) => {
    setFase('hecho');
    sonido.exito();
    const conductas: string[] = [];
    if (porRelevo) conductas.push('pidio_relevo');
    else conductas.push('persistio_tras_error');
    if (pausas > 0) conductas.push('hizo_pausa');
    const clave = porRelevo ? 'relevo' : pausas > 0 ? 'regulado' : 'perseverante';
    // `intentos` = errores del sistema vividos (no son fallos del alumno).
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: nivel, ayudaRecibida: porRelevo, precision: porRelevo ? 50 : pausas > 0 ? 90 : 100 }), 1500);
  };

  const sincronizar = () => {
    setFase('sincronizando');
    setProgreso(0);
    let p = 0;
    temporizador.current = window.setInterval(() => {
      p += 5;
      setProgreso(p);
      const tope = nivel < ERRORES_DEL_SISTEMA ? 80 : 100;
      if (p >= tope) {
        window.clearInterval(temporizador.current!);
        temporizador.current = null;
        if (nivel < ERRORES_DEL_SISTEMA) {
          sonido.aviso();
          setFase('error');
          setNivel((n) => n + 1);
        } else {
          terminar(false);
        }
      }
    }, 90);
  };

  const cambiar = (k: keyof Onda, d: number) => {
    if (fase === 'sincronizando' || fase === 'hecho' || relevo) return;
    const [min, max] = LIMITES[k];
    const v = onda[k] + d;
    if (v < min || v > max) return;
    sonido.click();
    const nueva = { ...onda, [k]: v };
    setOnda(nueva);
    if (fase === 'error') setFase('ajustando');
    if (iguales(nueva, objetivo)) sincronizar();
  };

  const pedirRelevo = () => {
    setRelevo(true);
    setOnda(OBJETIVOS[OBJETIVOS.length - 1]);
    terminar(true);
  };

  const tomarAire = () => {
    setPausas((n) => n + 1);
    setRespirando(true);
  };

  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-xl border border-cyan-400/25 bg-[#03121a] p-2">
        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={`Onda de referencia y tu onda. ${iguales(onda, objetivo) ? 'Coinciden.' : 'Aún no coinciden.'}`}>
          {[30, 60, 90].map((y) => (
            <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#0f2a33" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={trazo(objetivo)} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 5" opacity="0.9" vectorEffect="non-scaling-stroke" />
          <polyline points={trazo(onda)} fill="none" stroke="#22d3ee" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between px-1 text-[11px]">
          <span className="text-amber-300">- - Referencia</span>
          <span className="text-cyan-300">— Tu señal</span>
        </div>
        {fase === 'error' && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center bg-rose-950/70 font-mono text-sm uppercase tracking-widest text-rose-200 motion-safe:animate-[aparecer_200ms_ease-out]">
            ⚠ Error del sistema · la referencia se ha desplazado
          </div>
        )}
      </div>

      {fase === 'sincronizando' && (
        <div className="grid gap-1" role="status">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-200">Sincronizando…</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-cyan-300 transition-[width] duration-100" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(LIMITES) as (keyof Onda)[]).map((k) => (
          <div key={k} className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
            <span className="text-sm text-slate-300">{NOMBRES[k]}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => cambiar(k, -1)} aria-label={`Bajar ${NOMBRES[k].toLowerCase()} (ahora ${onda[k]})`} className="h-10 w-10 rounded-lg border border-slate-600 text-lg text-slate-200 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-25" disabled={onda[k] <= LIMITES[k][0] || fase === 'hecho'}>
                −
              </button>
              <span className="w-6 text-center font-mono text-cyan-100">{onda[k]}</span>
              <button type="button" onClick={() => cambiar(k, 1)} aria-label={`Subir ${NOMBRES[k].toLowerCase()} (ahora ${onda[k]})`} className="h-10 w-10 rounded-lg border border-slate-600 text-lg text-slate-200 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-25" disabled={onda[k] >= LIMITES[k][1] || fase === 'hecho'}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {nivel > 0 && fase !== 'hecho' && (
        <Bocadillo personaje="aris" expresion="preocupado">
          {nivel === 1 ? 'Ese error no es tuyo: el sistema está muy inestable. Si quieres, puedo tomar el relevo.' : 'Otra vez… el sistema no deja de moverse. Tú decides: seguimos, paramos un momento o lo cojo yo.'}
        </Bocadillo>
      )}

      {respirando && (
        <div className="grid justify-items-center gap-3 rounded-xl border border-cyan-400/25 bg-cyan-950/40 p-4 text-center" role="dialog" aria-label="Pausa para respirar">
          <span aria-hidden="true" className="h-16 w-16 rounded-full bg-cyan-300/30 motion-safe:animate-[respirar_8s_ease-in-out_infinite]" />
          <p className="text-sm text-cyan-100">Inspira mientras el círculo crece… y suelta el aire mientras se encoge.</p>
          <Boton variante="primario" onClick={() => setRespirando(false)}>
            Ya estoy, sigo
          </Boton>
        </div>
      )}

      {fase !== 'hecho' && !respirando && (
        <div className="flex flex-wrap gap-2">
          <Boton onClick={tomarAire} disabled={fase === 'sincronizando'}>
            🌬️ Tomar aire
          </Boton>
          {nivel > 0 && (
            <Boton variante="fantasma" onClick={pedirRelevo} disabled={fase === 'sincronizando'}>
              🤝 Pedir relevo a Aris
            </Boton>
          )}
        </div>
      )}
      {fase === 'hecho' && (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          Señal estabilizada. Sistema central reconectado.
        </p>
      )}
    </div>
  );
}
