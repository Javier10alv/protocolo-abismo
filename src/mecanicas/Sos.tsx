import { useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { BarraTiempo, useCuentaAtras } from './CuentaAtras';
import BarraInventario from './Inventario';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Dato = 'donde' | 'cuantos' | 'que' | 'tiempo';
type Estilo = 'asertivo' | 'tecnico' | 'emocional' | 'vago';

interface Fragmento {
  id: string;
  texto: string;
  estilo: Estilo;
  /** Información útil para el rescate que aporta el fragmento. */
  datos: Dato[];
  /** Huecos de ancho de banda que ocupa (los fragmentos largos ocupan 2). */
  coste: 1 | 2;
}

// Orden fijo y mezclado. Hay fragmentos precisos, combinados (más eficientes),
// largos (gastan ancho de banda), vagos (parecen útiles pero no lo son), técnicos y emocionales.
const FRAGMENTOS: Fragmento[] = [
  { id: 'f1', texto: 'Estamos en la estación.', estilo: 'vago', datos: [], coste: 1 },
  { id: 'f2', texto: 'Código de error E-77/ALFA en el bus principal.', estilo: 'tecnico', datos: [], coste: 1 },
  { id: 'f3', texto: 'Sector C, nivel −3.', estilo: 'asertivo', datos: ['donde'], coste: 1 },
  { id: 'f4', texto: '¡Socorro, esto es horrible!', estilo: 'emocional', datos: [], coste: 1 },
  { id: 'f5', texto: 'Somos cinco personas: Lisa, Leo, Reyes, Aris y yo, del equipo científico de la estación.', estilo: 'asertivo', datos: ['cuantos'], coste: 2 },
  { id: 'f6', texto: 'Mandad ayuda.', estilo: 'vago', datos: [], coste: 1 },
  { id: 'f7', texto: 'Oxígeno para 6 horas.', estilo: 'asertivo', datos: ['tiempo'], coste: 1 },
  { id: 'f8', texto: 'Presión diferencial de 3,2 bar en el anillo exterior.', estilo: 'tecnico', datos: [], coste: 1 },
  { id: 'f9', texto: 'Brecha en Sector C, nivel −3: cinco personas atrapadas.', estilo: 'asertivo', datos: ['donde', 'cuantos'], coste: 2 },
  { id: 'f10', texto: 'Nos quedan unas horas, venid rápido.', estilo: 'vago', datos: [], coste: 1 },
  { id: 'f11', texto: 'Necesitamos un batiscafo de rescate.', estilo: 'asertivo', datos: ['que'], coste: 1 },
  { id: 'f12', texto: 'Tengo muchísimo miedo.', estilo: 'emocional', datos: [], coste: 1 },
  { id: 'f13', texto: 'Somos cinco.', estilo: 'asertivo', datos: ['cuantos'], coste: 1 },
  { id: 'f14', texto: 'No sabemos cuánto aguantaremos.', estilo: 'vago', datos: [], coste: 1 },
];

const DATOS: Dato[] = ['donde', 'cuantos', 'que', 'tiempo'];
const PREGUNTA: Record<Dato, string> = {
  donde: '¿Dónde estáis exactamente?',
  cuantos: '¿Cuántas personas sois?',
  que: '¿Qué necesitáis de nosotros?',
  tiempo: '¿Cuánto tiempo podéis aguantar?',
};

/** Segunda fase: la superficie hace una pregunta concreta y hay que responder solo a eso. */
const SEGUIMIENTO = [
  { id: 'r1', texto: 'Una persona con un corte en la mano, estable.', calidad: 1 },
  { id: 'r2', texto: 'Creo que no, no sé.', calidad: 0.3 },
  { id: 'r3', texto: '¡Sí, venid ya, por favor!', calidad: 0.2 },
  { id: 'r4', texto: 'Sector C, nivel −3, cinco personas.', calidad: 0.4 },
];

const ANCHO_BASE = 4;

interface Respuesta {
  texto: string;
  ok: boolean;
}

export default function Sos({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [pidioConsejo, setPidioConsejo] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [fase, setFase] = useState<'mensaje' | 'seguimiento' | 'hecho'>('mensaje');
  const [reservas, setReservas] = useState(0);
  const [extra, setExtra] = useState(0);
  const [fallos, setFallos] = useState(0);
  // Telemetría para los indicadores.
  const envios = useRef<{ datos: Set<Dato>; huecos: number; utiles: number }[]>([]);
  const usados = useRef(new Set<Estilo>());
  const presionAvisada = useRef(false);
  const usoObjeto = useRef(false);

  const ancho = ANCHO_BASE + extra;
  const terminado = fase === 'hecho';

  // Bajo presión de tiempo: si la batería se agota, Reyes conecta la reserva (+30 s). Nunca se pierde.
  const { restante, total } = useCuentaAtras(75, !terminado, () => {
    setReservas((n) => n + 1);
    registrar('tiempo_agotado');
    return 30;
  });
  if (!presionAvisada.current && !terminado && restante <= total * 0.2) {
    presionAvisada.current = true;
    registrar('presion');
  }

  const elegidos = seleccion.map((id) => FRAGMENTOS.find((f) => f.id === id)!);
  const ocupado = elegidos.reduce((a, f) => a + f.coste, 0);

  const alternar = (id: string) => {
    if (fase !== 'mensaje') return;
    const f = FRAGMENTOS.find((x) => x.id === id)!;
    sonido.click();
    registrar('accion', { que: 'fragmento', id });
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : ocupado + f.coste > ancho ? s : [...s, id]));
  };

  const transmitir = () => {
    const datos = new Set(elegidos.flatMap((f) => f.datos));
    const faltan = DATOS.filter((d) => !datos.has(d));
    for (const f of elegidos) usados.current.add(f.estilo);
    envios.current.push({ datos, huecos: ocupado, utiles: elegidos.filter((f) => f.datos.length > 0).reduce((a, f) => a + f.coste, 0) });
    registrar('accion', { que: 'transmitir', huecos: ocupado, datos: datos.size });

    if (faltan.length === 0) {
      sonido.exito();
      setRespuestas((r) => [...r, { ok: true, texto: 'Recibido: Sector C, cinco personas, batiscafo, seis horas de oxígeno. Una última pregunta: ¿alguien necesita atención médica?' }]);
      setFase('seguimiento');
      return;
    }

    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    registrar('fallo', { firma: [...datos].sort().join('+') || 'nada', faltan: faltan.length });
    const partes: string[] = [];
    if (elegidos.some((f) => f.estilo === 'tecnico')) partes.push('No tenemos vuestros planos internos: esos códigos no nos sirven.');
    if (elegidos.some((f) => f.estilo === 'emocional')) partes.push('Os entendemos, mantened la calma.');
    if (elegidos.some((f) => f.estilo === 'vago')) partes.push('Necesitamos datos concretos, no generales.');
    // Dificultad adaptativa: la primera respuesta solo dice cuánto falta; desde la segunda, el qué.
    partes.push(nuevos === 1 ? `Mensaje incompleto: nos faltan ${faltan.length} dato${faltan.length === 1 ? '' : 's'} esencial${faltan.length === 1 ? '' : 'es'}.` : faltan.map((d) => PREGUNTA[d]).join(' '));
    setRespuestas((r) => [...r, { ok: false, texto: partes.join(' ') }]);
    setSeleccion([]);

    if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
      // Reyes dicta el mensaje y la historia sigue.
      setAyuda(true);
      registrar('ayuda', { tipo: 'automatica' });
      setSeleccion(['f9', 'f11', 'f7']);
    }
  };

  const responder = (id: string) => {
    const r = SEGUIMIENTO.find((x) => x.id === id)!;
    registrar('accion', { que: 'seguimiento', id });
    setFase('hecho');
    sonido.exito();
    setRespuestas((rs) => [...rs, { ok: true, texto: r.calidad === 1 ? 'Entendido: llevamos material de curas. Aguantad, vamos para allá.' : 'Recibido. Iremos preparados por si acaso. Vamos para allá.' }]);

    const lista = envios.current;
    const primero = lista[0];
    // Adaptación: tras una respuesta negativa, ¿el siguiente mensaje añadió algún dato que faltaba?
    let mejoras = 0;
    for (let i = 1; i < lista.length; i++) if ([...lista[i].datos].some((d) => !lista[i - 1].datos.has(d))) mejoras++;
    const huecos = lista.reduce((a, e) => a + e.huecos, 0);
    const utiles = lista.reduce((a, e) => a + e.utiles, 0);
    const conductas: string[] = [];
    if (pidioConsejo) conductas.push('pidio_consejo');
    if (fallos === 0) conductas.push('mensaje_completo');
    else conductas.push('reformulo_mensaje');
    if (usados.current.has('emocional')) conductas.push('incluyo_emocional');
    if (usados.current.has('tecnico')) conductas.push('incluyo_tecnico');
    if (usados.current.has('vago')) conductas.push('incluyo_vago');
    if (ayuda) conductas.push('ayuda_automatica');
    if (reservas > 0) conductas.push('tiempo_agotado');
    if (usoObjeto.current) conductas.push('uso_objeto_alternativo');
    if (r.calidad === 1) conductas.push('respondio_lo_preguntado');
    const clave = pidioConsejo ? 'asesorado' : fallos === 0 ? 'directo' : 'ajustado';
    const indicadores: Record<string, number> = {
      sos_completitud: primero ? primero.datos.size / DATOS.length : 0,
      sos_concision: huecos > 0 ? utiles / huecos : 0,
      sos_escucha: r.calidad,
    };
    if (lista.length > 1) indicadores.sos_adaptacion = ayuda ? Math.min(0.5, mejoras / (lista.length - 1)) : mejoras / (lista.length - 1);
    window.setTimeout(
      () => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda, precision: Math.round((utiles / Math.max(1, huecos)) * 100), indicadores }),
      1500,
    );
  };

  const usarObjeto = (id: string): string | null => {
    if (id === 'cinta' || id === 'walkie') {
      setExtra((n) => n + 1);
      usoObjeto.current = true;
      return id === 'cinta' ? 'Reparas con cinta el cable suelto de la antena: un hueco más de ancho de banda.' : 'Reyes coge el walkie y retransmite por otra frecuencia: un hueco más de ancho de banda.';
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <BarraTiempo etiqueta="Batería de la antena" restante={restante} total={total} />
      {reservas > 0 && !terminado && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          He conectado la batería de reserva: tenemos algo más de tiempo. Piensa qué necesitan saber de verdad.
        </Bocadillo>
      )}
      <div className="flex items-center justify-between rounded-xl border border-cyan-400/25 bg-slate-900/70 px-4 py-2">
        <span className="text-sm text-slate-300">Ancho de banda</span>
        <span className="flex gap-1" aria-label={`${ocupado} de ${ancho} huecos ocupados`}>
          {Array.from({ length: ancho }, (_, i) => (
            <span key={i} aria-hidden="true" className={`h-4 w-7 rounded-sm ${i < ocupado ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]' : 'bg-slate-700'}`} />
          ))}
        </span>
      </div>

      {fase === 'mensaje' && (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Fragmentos de mensaje">
          {FRAGMENTOS.map((f) => {
            const elegido = seleccion.includes(f.id);
            const noCabe = !elegido && ocupado + f.coste > ancho;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => alternar(f.id)}
                  disabled={noCabe}
                  className={`flex h-full min-h-12 w-full items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left font-mono text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed motion-reduce:transition-none ${
                    elegido ? 'border-cyan-200 bg-cyan-400/25 text-white' : noCabe ? 'border-slate-800 text-slate-600' : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                  }`}
                >
                  <span>{f.texto}</span>
                  {f.coste === 2 && <span className="shrink-0 rounded bg-slate-700/70 px-1 text-[10px] text-slate-300" title="Ocupa 2 huecos">×2</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-slate-700 bg-black/40 p-3 font-mono text-sm">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">Mensaje</p>
        <p className="mt-1 min-h-6 text-cyan-100" aria-live="polite">
          {elegidos.length ? elegidos.map((f) => f.texto).join(' ') : '—'}
        </p>
      </div>

      {respuestas.length > 0 && (
        <ol className="grid gap-2" aria-label="Respuestas de la superficie">
          {respuestas.map((r, i) => (
            <li key={i} className={`rounded-lg px-3 py-2 text-sm ${r.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`} role="status">
              <span className="font-mono text-[11px] uppercase tracking-widest opacity-70">Superficie · </span>
              {r.texto}
            </li>
          ))}
        </ol>
      )}

      {fase === 'seguimiento' && (
        <div className="grid gap-2">
          <p className="text-sm text-slate-300">Elige qué contestas (solo cabe un fragmento):</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SEGUIMIENTO.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => responder(r.id)} className="min-h-12 w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-left font-mono text-sm text-slate-200 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  {r.texto}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pidioConsejo && fase === 'mensaje' && (
        <Bocadillo personaje="reyes" expresion="pensativo">
          En un rescate importan cuatro cosas: dónde, cuántos, qué necesitáis y cuánto aguantáis. Y el ancho de banda es oro: nada de relleno.
        </Bocadillo>
      )}
      {ayuda && fase === 'mensaje' && (
        <Bocadillo personaje="reyes" expresion="neutral">
          Te lo dicto yo: brecha en el Sector C con cinco personas, batiscafo, seis horas de oxígeno. Transmítelo.
        </Bocadillo>
      )}

      {fase === 'mensaje' && <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} />}

      {fase === 'mensaje' && (
        <div className="flex flex-wrap gap-2">
          <Boton variante="primario" className="flex-1" onClick={transmitir} disabled={ocupado === 0} silencioso>
            📡 Transmitir ({ocupado}/{ancho})
          </Boton>
          <Boton
            onClick={() => {
              setPidioConsejo(true);
              registrar('ayuda', { tipo: 'consejo' });
            }}
            disabled={pidioConsejo}
          >
            💬 Consejo de Reyes
          </Boton>
        </div>
      )}
    </div>
  );
}
