import { useEffect, useRef, useState } from 'react';

/**
 * Cuenta atrás de un minijuego. Al llegar a 0 llama a `onAgotado`, que debe dar
 * más tiempo (un personaje ayuda): agotar el tiempo nunca hace perder la partida.
 * Se pausa cuando `activo` es false.
 */
export function useCuentaAtras(segundos: number, activo: boolean, onAgotado: () => number) {
  const [restante, setRestante] = useState(segundos);
  const [total, setTotal] = useState(segundos);
  const alAgotar = useRef(onAgotado);
  alAgotar.current = onAgotado;

  useEffect(() => {
    if (!activo) return;
    const id = window.setInterval(() => {
      setRestante((r) => {
        if (r > 1) return r - 1;
        const extra = alAgotar.current();
        setTotal(extra);
        return extra;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activo]);

  return { restante, total };
}

/** Barra de tiempo restante con texto accesible. */
export function BarraTiempo({ etiqueta, restante, total }: { etiqueta: string; restante: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (restante / total) * 100));
  const urgente = restante <= 15;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
      <span className="text-sm text-slate-300">{etiqueta}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800" role="timer" aria-label={`${etiqueta}: ${restante} segundos`}>
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none ${urgente ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-400 to-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-12 text-right font-mono text-sm ${urgente ? 'text-rose-300' : 'text-slate-200'}`}>{restante} s</span>
    </div>
  );
}
