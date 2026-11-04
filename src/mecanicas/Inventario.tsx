import { useState } from 'react';
import { OBJETOS_POR_ID } from '../data/objetos';
import { sonido } from '../audio/sonido';
import type { PropsMecanica } from './tipos';

interface Props {
  inventario: string[];
  registrar: PropsMecanica['registrar'];
  /**
   * Intenta usar un objeto en este reto. Devuelve el mensaje de lo que ocurre si
   * sirve, o null si aquí no tiene uso.
   */
  usar: (id: string) => string | null;
  desactivado?: boolean;
}

/**
 * Inventario dentro de un reto. Cualquier objeto se puede probar: que sirva o no
 * lo decide la mecánica. Cada objeto se usa como mucho una vez por reto.
 */
export default function BarraInventario({ inventario, registrar, usar, desactivado }: Props) {
  const [usados, setUsados] = useState<Record<string, boolean>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  if (inventario.length === 0) return null;

  const probar = (id: string) => {
    const texto = usar(id);
    registrar('objeto', { id, util: texto !== null });
    if (texto) {
      sonido.exito();
      setUsados((u) => ({ ...u, [id]: true }));
      setMensaje({ texto, ok: true });
    } else {
      sonido.aviso();
      setUsados((u) => ({ ...u, [id]: false }));
      setMensaje({ texto: `${OBJETOS_POR_ID.get(id)?.nombre ?? 'Ese objeto'}: no parece útil aquí.`, ok: false });
    }
  };

  return (
    <div className="grid gap-2 rounded-xl border border-amber-300/20 bg-amber-500/5 p-2">
      <p className="px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/80">Inventario · prueba a usar algo</p>
      <ul className="flex flex-wrap gap-2">
        {inventario.map((id) => {
          const o = OBJETOS_POR_ID.get(id);
          if (!o) return null;
          const yaUsado = usados[id] !== undefined;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => probar(id)}
                disabled={desactivado || yaUsado}
                title={o.nombre}
                className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed ${
                  usados[id] ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100' : yaUsado ? 'border-slate-800 text-slate-500' : 'border-amber-300/30 bg-slate-900/70 text-amber-50 hover:border-amber-200'
                }`}
              >
                <span aria-hidden="true">{o.icono}</span>
                {o.nombre}
              </button>
            </li>
          );
        })}
      </ul>
      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-800/80 text-slate-300'}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
