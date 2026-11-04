import { useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { BarraTiempo, useCuentaAtras } from './CuentaAtras';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Dato = 'donde' | 'cuantos' | 'que';
type Estilo = 'asertivo' | 'tecnico' | 'emocional';

interface Fragmento {
  id: string;
  texto: string;
  estilo: Estilo;
  /** Información útil para el rescate que aporta el fragmento. */
  datos: Dato[];
}

// Orden fijo y mezclado, para que el estilo no dependa de la posición.
const FRAGMENTOS: Fragmento[] = [
  { id: 'f1', texto: 'Fallo en el subnodo 4B del cuadrante X.', estilo: 'tecnico', datos: [] },
  { id: 'f2', texto: '¡Socorro, esto es horrible!', estilo: 'emocional', datos: [] },
  { id: 'f3', texto: 'Brecha de agua en el Sector C.', estilo: 'asertivo', datos: ['donde'] },
  { id: 'f4', texto: 'Presión diferencial de 3,2 bar en el anillo exterior.', estilo: 'tecnico', datos: [] },
  { id: 'f5', texto: 'Somos 5 personas, todas estables.', estilo: 'asertivo', datos: ['cuantos'] },
  { id: 'f6', texto: '¡No aguantamos más, daos prisa!', estilo: 'emocional', datos: [] },
  { id: 'f7', texto: 'Código de error E-77/ALFA en el bus principal.', estilo: 'tecnico', datos: [] },
  { id: 'f8', texto: 'Urge rescate con batiscafo.', estilo: 'asertivo', datos: ['que'] },
  { id: 'f9', texto: 'Tengo muchísimo miedo.', estilo: 'emocional', datos: [] },
];

const PREGUNTA: Record<Dato, string> = {
  donde: '¿Dónde estáis exactamente?',
  cuantos: '¿Cuántas personas sois?',
  que: '¿Qué necesitáis de nosotros?',
};

const MAX = 3;

interface Respuesta {
  texto: string;
  ok: boolean;
}

export default function Sos({ onCompletar }: PropsMecanica) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [envios, setEnvios] = useState(0);
  const [respuestas, setRespuestas] = useState<{ mensaje: string; respuesta: Respuesta }[]>([]);
  const [pidioConsejo, setPidioConsejo] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [estilosUsados, setEstilosUsados] = useState<Set<Estilo>>(new Set());
  const [terminado, setTerminado] = useState(false);
  const [reservas, setReservas] = useState(0);
  // Fragmentos enviados en total y cuántos aportaban información útil (para la precisión).
  const [enviados, setEnviados] = useState({ total: 0, utiles: 0 });

  // Bajo presión de tiempo: si la batería se agota, Reyes conecta la reserva (+30 s). Nunca se pierde.
  const { restante, total } = useCuentaAtras(60, !terminado, () => {
    setReservas((n) => n + 1);
    return 30;
  });

  const alternar = (id: string) => {
    if (terminado) return;
    sonido.click();
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX ? s : [...s, id]));
  };

  const elegidos = seleccion.map((id) => FRAGMENTOS.find((f) => f.id === id)!);

  const transmitir = () => {
    const datos = new Set(elegidos.flatMap((f) => f.datos));
    const faltan = (['donde', 'cuantos', 'que'] as Dato[]).filter((d) => !datos.has(d));
    const usados = new Set(estilosUsados);
    for (const f of elegidos) usados.add(f.estilo);
    setEstilosUsados(usados);
    const mensaje = elegidos.map((f) => f.texto).join(' ');
    const acumulado = { total: enviados.total + elegidos.length, utiles: enviados.utiles + elegidos.filter((f) => f.datos.length > 0).length };
    setEnviados(acumulado);
    const n = envios + 1;
    setEnvios(n);

    if (faltan.length === 0) {
      sonido.exito();
      setRespuestas((r) => [...r, { mensaje, respuesta: { ok: true, texto: 'Recibido: Sector C, cinco personas, rescate en camino. Aguantad.' } }]);
      terminar(n - 1, usados, false, acumulado);
      return;
    }

    sonido.aviso();
    const partes: string[] = [];
    if (elegidos.some((f) => f.estilo === 'tecnico')) partes.push('No tenemos vuestros planos internos: esos códigos no nos sirven.');
    if (elegidos.some((f) => f.estilo === 'emocional')) partes.push('Os entendemos, mantened la calma.');
    partes.push(faltan.map((d) => PREGUNTA[d]).join(' '));
    setRespuestas((r) => [...r, { mensaje, respuesta: { ok: false, texto: partes.join(' ') } }]);
    setSeleccion([]);

    if (n >= INTENTOS_ANTES_DE_AYUDA) {
      // Reyes dicta el mensaje y la historia sigue.
      setAyuda(true);
      setSeleccion(['f3', 'f5', 'f8']);
    }
  };

  const terminar = (fallos: number, usados: Set<Estilo>, ayudaRecibida: boolean, acumulado: { total: number; utiles: number }) => {
    setTerminado(true);
    const conductas: string[] = [];
    if (pidioConsejo) conductas.push('pidio_consejo');
    if (fallos === 0) conductas.push('mensaje_completo');
    else conductas.push('reformulo_mensaje');
    if (usados.has('emocional')) conductas.push('incluyo_emocional');
    if (usados.has('tecnico')) conductas.push('incluyo_tecnico');
    if (ayudaRecibida || ayuda) conductas.push('ayuda_automatica');
    if (reservas > 0) conductas.push('tiempo_agotado');
    // Precisión: fragmentos con información útil sobre todos los enviados.
    const precision = Math.round((acumulado.utiles / Math.max(1, acumulado.total)) * 100);
    const clave = pidioConsejo ? 'asesorado' : fallos === 0 ? 'directo' : 'ajustado';
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayudaRecibida || ayuda, precision }), 1500);
  };

  return (
    <div className="grid gap-4">
      <BarraTiempo etiqueta="Batería de la antena" restante={restante} total={total} />
      {reservas > 0 && !terminado && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          He conectado la batería de reserva: tenemos algo más de tiempo. Sin prisa, piensa qué necesitan saber.
        </Bocadillo>
      )}
      <div className="flex items-center justify-between rounded-xl border border-cyan-400/25 bg-slate-900/70 px-4 py-2">
        <span className="text-sm text-slate-300">Ancho de banda</span>
        <span className="flex gap-1" aria-label={`${seleccion.length} de ${MAX} fragmentos`}>
          {Array.from({ length: MAX }, (_, i) => (
            <span key={i} aria-hidden="true" className={`h-4 w-8 rounded-sm ${i < seleccion.length ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]' : 'bg-slate-700'}`} />
          ))}
        </span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-3" aria-label="Fragmentos de mensaje">
        {FRAGMENTOS.map((f) => {
          const elegido = seleccion.includes(f.id);
          const lleno = !elegido && seleccion.length >= MAX;
          return (
            <li key={f.id}>
              <button
                type="button"
                aria-pressed={elegido}
                onClick={() => alternar(f.id)}
                disabled={terminado || lleno}
                className={`h-full min-h-14 w-full rounded-xl border px-3 py-2 text-left font-mono text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed motion-reduce:transition-none ${
                  elegido ? 'border-cyan-200 bg-cyan-400/25 text-white' : lleno ? 'border-slate-800 text-slate-600' : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                }`}
              >
                {f.texto}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl border border-slate-700 bg-black/40 p-3 font-mono text-sm">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">Mensaje</p>
        <p className="mt-1 min-h-6 text-cyan-100" aria-live="polite">
          {elegidos.length ? elegidos.map((f) => f.texto).join(' ') : '—'}
        </p>
      </div>

      {respuestas.length > 0 && (
        <ol className="grid gap-2" aria-label="Respuestas de la superficie">
          {respuestas.map((r, i) => (
            <li key={i} className={`rounded-lg px-3 py-2 text-sm ${r.respuesta.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`} role="status">
              <span className="font-mono text-[11px] uppercase tracking-widest opacity-70">Superficie · </span>
              {r.respuesta.texto}
            </li>
          ))}
        </ol>
      )}

      {pidioConsejo && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          En un rescate solo importan tres cosas: dónde estáis, cuántos sois y qué necesitáis. Nada más.
        </Bocadillo>
      )}
      {ayuda && !terminado && (
        <Bocadillo personaje="reyes" expresion="neutral">
          Te lo dicto yo: Sector C, cinco personas, rescate. Transmítelo.
        </Bocadillo>
      )}

      <div className="flex flex-wrap gap-2">
        <Boton variante="primario" className="flex-1" onClick={transmitir} disabled={seleccion.length !== MAX || terminado} silencioso>
          📡 Transmitir ({seleccion.length}/{MAX})
        </Boton>
        <Boton onClick={() => setPidioConsejo(true)} disabled={terminado || pidioConsejo}>
          💬 Pedir consejo a Reyes
        </Boton>
      </div>
    </div>
  );
}
