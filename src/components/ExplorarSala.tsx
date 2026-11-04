import { useState } from 'react';
import { sonido } from '../audio/sonido';
import { objetosDeSala } from '../data/objetos';
import { useGameStore } from '../store/useGameStore';
import type { EventoJuego } from '../types/game';

interface Props {
  escenaId: string;
  /** En un minijuego, registra la exploración en su telemetría. */
  registrar?: (tipo: string, datos?: EventoJuego['datos']) => void;
  etiqueta?: string;
}

/**
 * Explorar la sala: revela los objetos que hay en ella para guardarlos en el
 * inventario. Nadie lo menciona; explorar es decisión del alumno.
 */
export default function ExplorarSala({ escenaId, registrar, etiqueta = '🔍 Explorar la sala' }: Props) {
  const inventario = useGameStore((s) => s.inventario);
  const recoger = useGameStore((s) => s.recogerObjeto);
  const [abierta, setAbierta] = useState(false);
  const objetos = objetosDeSala(escenaId);
  const pendientes = objetos.filter((o) => !inventario.some((i) => i.id === o.id));

  if (!abierta) {
    return (
      <button
        type="button"
        onClick={() => {
          sonido.click();
          setAbierta(true);
          registrar?.('explorar');
        }}
        className="justify-self-start rounded-lg border border-amber-300/25 bg-amber-500/5 px-3 py-1.5 text-sm text-amber-100 transition-colors hover:border-amber-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {etiqueta}
      </button>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl border border-amber-300/20 bg-amber-500/5 p-3 text-sm" role="status">
      {pendientes.length === 0 ? (
        <p className="text-slate-300">{objetos.length ? 'Ya has recogido todo lo útil de esta sala.' : 'Miras alrededor, pero no ves nada que puedas llevarte.'}</p>
      ) : (
        <ul className="grid gap-2">
          {pendientes.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3">
              <span aria-hidden="true" className="text-xl">
                {o.icono}
              </span>
              <span className="min-w-0 flex-1 basis-48 text-slate-200">{o.pista}</span>
              <button
                type="button"
                onClick={() => {
                  sonido.seleccion();
                  recoger(o.id);
                  registrar?.('recoger', { id: o.id });
                }}
                className="min-h-10 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 text-amber-50 hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Coger: {o.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      {inventario.length > 0 && (
        <p className="text-xs text-amber-200/80">
          Llevas: {inventario.length} objeto{inventario.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
