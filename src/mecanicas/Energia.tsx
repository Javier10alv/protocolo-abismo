import { useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { INTENTOS_ANTES_DE_AYUDA, precisionPorIntentos, type PropsMecanica } from './tipos';

type Sistema = 'oxigeno' | 'motores' | 'luces' | 'comunicaciones';

const SISTEMAS: { id: Sistema; nombre: string; icono: string; color: string; minimo: number; para: string }[] = [
  { id: 'oxigeno', nombre: 'Oxígeno', icono: '🫧', color: '#38bdf8', minimo: 2, para: 'Aire para los tres durante el ascenso' },
  { id: 'motores', nombre: 'Motores', icono: '🚀', color: '#f97316', minimo: 3, para: 'Empuje para subir a la superficie' },
  { id: 'luces', nombre: 'Luces', icono: '💡', color: '#facc15', minimo: 0, para: 'Ver dentro de la cápsula' },
  { id: 'comunicaciones', nombre: 'Radio', icono: '📡', color: '#a78bfa', minimo: 0, para: 'Hablar con la superficie' },
];

const MAX_POR_SISTEMA = 5;

type Reparto = Record<Sistema, number>;
const VACIO: Reparto = { oxigeno: 0, motores: 0, luces: 0, comunicaciones: 0 };

export default function Energia({ onCompletar }: PropsMecanica) {
  const [total, setTotal] = useState(8);
  const [reparto, setReparto] = useState<Reparto>(VACIO);
  const [fase, setFase] = useState<'inicial' | 'imprevisto' | 'listo'>('inicial');
  const [fallos, setFallos] = useState(0);
  const [ayuda, setAyuda] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'aviso' } | null>(null);

  const usado = Object.values(reparto).reduce((a, b) => a + b, 0);
  const libre = total - usado;

  const cambiar = (s: Sistema, d: number) => {
    if (fase === 'listo') return;
    const nuevo = reparto[s] + d;
    if (nuevo < 0 || nuevo > MAX_POR_SISTEMA || (d > 0 && libre <= 0)) return;
    sonido.click();
    setReparto({ ...reparto, [s]: nuevo });
    setMensaje(null);
  };

  const finalizar = (final: Reparto, fallosTotales: number, ayudaRecibida: boolean) => {
    setFase('listo');
    sonido.exito();
    const conductas: string[] = [];
    if (fallosTotales > 0) conductas.push('reintento');
    if (ayudaRecibida) conductas.push('ayuda_automatica');
    let clave: string;
    if (fallosTotales >= 2) clave = 'adaptable';
    else if (final.comunicaciones > final.luces) clave = 'conectado';
    else if (final.luces > final.comunicaciones) clave = 'equipo';
    else clave = 'prudente';
    if (final.comunicaciones > final.luces) conductas.push('priorizo_comunicaciones');
    else if (final.luces > final.comunicaciones) conductas.push('priorizo_iluminacion');
    else conductas.push('priorizo_margen');
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallosTotales, ayudaRecibida, precision: precisionPorIntentos(fallosTotales, ayudaRecibida) }), 1300);
  };

  const aplicar = () => {
    const problemas: string[] = [];
    if (libre > 0) problemas.push(`quedan ${libre} unidad${libre > 1 ? 'es' : ''} sin asignar`);
    for (const s of SISTEMAS) if (reparto[s.id] < s.minimo) problemas.push(`${s.nombre.toLowerCase()} necesita al menos ${s.minimo}`);

    if (problemas.length) {
      sonido.aviso();
      const nuevos = fallos + 1;
      setFallos(nuevos);
      if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
        // Lisa propone un reparto válido y la historia sigue.
        const propuesta: Reparto = { oxigeno: 2, motores: 3, luces: Math.ceil((total - 5) / 2), comunicaciones: Math.floor((total - 5) / 2) };
        setReparto(propuesta);
        setAyuda(true);
        setMensaje({ tipo: 'ok', texto: 'Lisa ajusta los mandos contigo y el sistema da luz verde.' });
        finalizar(propuesta, nuevos, true);
        return;
      }
      setMensaje({ tipo: 'aviso', texto: `El sistema no arranca: ${problemas.join(', ')}.` });
      return;
    }

    if (fase === 'inicial') {
      // Imprevisto: una línea se sobrecarga y se pierde 1 unidad. Hay que reajustar.
      sonido.aviso();
      setTotal(7);
      setFase('imprevisto');
      setMensaje({ tipo: 'aviso', texto: '¡Sobrecarga! Una línea se ha fundido y perdéis 1 unidad. Quita una de donde creas mejor.' });
      return;
    }
    setMensaje({ tipo: 'ok', texto: 'Todos los sistemas en verde. ¡La cápsula está lista!' });
    finalizar(reparto, fallos, false);
  };

  const sobra = libre < 0;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between rounded-xl border border-cyan-400/25 bg-slate-900/70 px-4 py-3">
        <span className="text-sm text-slate-300">Energía disponible</span>
        <span className="flex items-center gap-1" aria-label={`${libre} de ${total} unidades libres`}>
          {Array.from({ length: Math.max(total, usado) }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-5 w-3 rounded-sm transition-colors ${i < libre ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]' : i >= total ? 'bg-rose-500/70' : 'bg-slate-700'}`}
            />
          ))}
          <span className="ml-2 font-mono text-cyan-200">{Math.max(libre, 0)}</span>
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SISTEMAS.map((s) => {
          const v = reparto[s.id];
          const bajoMinimo = v < s.minimo;
          return (
            <li key={s.id} className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
              <span aria-hidden="true" className="text-2xl">
                {s.icono}
              </span>
              <p className="text-sm font-semibold text-white">{s.nombre}</p>
              <div className="relative flex h-28 w-10 flex-col-reverse gap-0.5 rounded-md bg-slate-800 p-1" aria-hidden="true">
                {Array.from({ length: MAX_POR_SISTEMA }, (_, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm transition-all duration-300 motion-reduce:transition-none"
                    style={{ background: i < v ? s.color : 'transparent', boxShadow: i < v ? `0 0 8px ${s.color}` : 'none' }}
                  />
                ))}
                {s.minimo > 0 && (
                  <span
                    className="absolute left-0 right-0 border-t-2 border-dashed border-white/50"
                    style={{ bottom: `calc(${(s.minimo / MAX_POR_SISTEMA) * 100}% )` }}
                  />
                )}
              </div>
              <p className={`text-xs ${bajoMinimo ? 'text-amber-300' : 'text-slate-400'}`}>
                {v} {s.minimo > 0 ? `(mín. ${s.minimo})` : ''}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => cambiar(s.id, -1)}
                  disabled={v === 0 || fase === 'listo'}
                  aria-label={`Quitar energía a ${s.nombre} (ahora ${v})`}
                  className="h-10 w-10 rounded-lg border border-slate-600 text-lg text-slate-200 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-25"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => cambiar(s.id, 1)}
                  disabled={libre <= 0 || v >= MAX_POR_SISTEMA || fase === 'listo'}
                  aria-label={`Dar energía a ${s.nombre} (ahora ${v})`}
                  className="h-10 w-10 rounded-lg border border-slate-600 text-lg text-slate-200 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-25"
                >
                  +
                </button>
              </div>
              <p className="text-center text-[11px] leading-tight text-slate-500">{s.para}</p>
            </li>
          );
        })}
      </ul>

      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.tipo === 'ok' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {mensaje.texto}
        </p>
      )}
      {fase === 'imprevisto' && (
        <Bocadillo personaje="lisa" expresion="preocupado">
          Tranquilidad: los planes cambian. Decide qué es lo que menos falta nos hace.
        </Bocadillo>
      )}
      {ayuda && (
        <Bocadillo personaje="lisa" expresion="contento">
          Lo hemos ajustado juntos. Así funcionan los equipos de verdad.
        </Bocadillo>
      )}

      <Boton variante="primario" onClick={aplicar} disabled={fase === 'listo' || sobra} silencioso>
        ⚡ Aplicar reparto
      </Boton>
    </div>
  );
}
