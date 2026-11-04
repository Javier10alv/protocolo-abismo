import { useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

type Cable = 'rojo' | 'azul' | 'verde' | 'amarillo';
type Terminal = 'triangulo' | 'rayo' | 'cuadrado' | 'circulo';

const CABLES: { id: Cable; nombre: string; color: string }[] = [
  { id: 'rojo', nombre: 'Rojo', color: '#ef4444' },
  { id: 'azul', nombre: 'Azul', color: '#3b82f6' },
  { id: 'verde', nombre: 'Verde', color: '#22c55e' },
  { id: 'amarillo', nombre: 'Amarillo', color: '#eab308' },
];

const TERMINALES: { id: Terminal; nombre: string; simbolo: string }[] = [
  { id: 'triangulo', nombre: 'Triángulo', simbolo: '▲' },
  { id: 'rayo', nombre: 'Rayo', simbolo: '⚡' },
  { id: 'cuadrado', nombre: 'Cuadrado', simbolo: '■' },
  { id: 'circulo', nombre: 'Círculo', simbolo: '●' },
];

const SOLUCION: Record<Cable, Terminal> = {
  rojo: 'rayo',
  azul: 'triangulo',
  verde: 'circulo',
  amarillo: 'cuadrado',
};

const PISTAS = [
  'El cable rojo lleva la energía: va al terminal del rayo.',
  'El verde va a la única forma redonda.',
  'El amarillo nunca va a una forma con punta.',
];

const AYUDAS_LISA: Record<Cable, string> = {
  rojo: 'Empieza por lo seguro: el rojo siempre va al rayo. Te lo marco.',
  verde: 'El verde, al círculo. Es la única forma redonda.',
  amarillo: 'Piensa en qué formas tienen punta… el amarillo va al cuadrado.',
  azul: 'Y el azul es el que queda: al triángulo.',
};

const FILA = 64;

export default function Cableado({ onCompletar }: PropsMecanica) {
  const [conexiones, setConexiones] = useState<Partial<Record<Cable, Terminal>>>({});
  const [cableActivo, setCableActivo] = useState<Cable | null>(null);
  const [esquemaAbierto, setEsquemaAbierto] = useState(false);
  const [consultoAntes, setConsultoAntes] = useState(false);
  const [haProbado, setHaProbado] = useState(false);
  const [pidioAyuda, setPidioAyuda] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'lisa' | 'sistema' } | null>(null);
  const [resuelto, setResuelto] = useState(false);

  const conectar = (cable: Cable, terminal: Terminal) => {
    sonido.seleccion();
    setConexiones((prev) => {
      const nuevo: Partial<Record<Cable, Terminal>> = {};
      // Un terminal solo admite un cable: si estaba ocupado, se libera.
      for (const [c, t] of Object.entries(prev) as [Cable, Terminal][]) if (t !== terminal && c !== cable) nuevo[c] = t;
      nuevo[cable] = terminal;
      return nuevo;
    });
    setCableActivo(null);
  };

  const pulsarCable = (cable: Cable) => {
    if (resuelto) return;
    if (cableActivo === cable) {
      setCableActivo(null);
      return;
    }
    if (conexiones[cable]) {
      // Volver a pulsar un cable conectado lo suelta.
      setConexiones(({ [cable]: _, ...resto }) => resto);
    }
    setCableActivo(cable);
  };

  const pulsarTerminal = (terminal: Terminal) => {
    if (resuelto || !cableActivo) return;
    conectar(cableActivo, terminal);
  };

  const abrirEsquema = () => {
    if (!haProbado) setConsultoAntes(true);
    setEsquemaAbierto((v) => !v);
  };

  const pedirAyuda = () => {
    setPidioAyuda(true);
    const pendiente = CABLES.map((c) => c.id).find((c) => conexiones[c] !== SOLUCION[c]);
    if (!pendiente) {
      setMensaje({ tipo: 'lisa', texto: '¡Parece que lo tienes todo bien! Prueba la conexión.' });
      return;
    }
    conectar(pendiente, SOLUCION[pendiente]);
    setMensaje({ tipo: 'lisa', texto: AYUDAS_LISA[pendiente] });
  };

  const terminar = (ayudaRecibida: boolean, fallosTotales: number) => {
    setResuelto(true);
    sonido.exito();
    const conductas: string[] = [];
    if (consultoAntes) conductas.push('consulto_esquema');
    if (pidioAyuda) conductas.push('pidio_ayuda');
    if (fallosTotales > 0) conductas.push('reintento');
    if (ayudaRecibida) conductas.push('ayuda_automatica');
    if (!consultoAntes && !pidioAyuda) conductas.push('probo_directamente');
    const clave = pidioAyuda ? 'colaborativo' : fallosTotales > 0 ? 'persistente' : consultoAntes ? 'metodico' : 'experimental';
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallosTotales, ayudaRecibida }), 900);
  };

  const probar = () => {
    setHaProbado(true);
    const correctos = CABLES.filter((c) => conexiones[c.id] === SOLUCION[c.id]).length;
    if (correctos === CABLES.length) {
      setMensaje({ tipo: 'sistema', texto: 'Corriente estable en los cuatro terminales.' });
      terminar(false, fallos);
      return;
    }
    const nuevosFallos = fallos + 1;
    setFallos(nuevosFallos);
    sonido.aviso();
    if (nuevosFallos >= INTENTOS_ANTES_DE_AYUDA) {
      setConexiones({ ...SOLUCION });
      setMensaje({
        tipo: 'lisa',
        texto: 'Has estado muy cerca. Mira, te lo enseño: rojo al rayo, verde al círculo, amarillo al cuadrado y azul al triángulo.',
      });
      terminar(true, nuevosFallos);
      return;
    }
    setMensaje({
      tipo: 'sistema',
      texto: `Chispazo. ${correctos} de 4 terminales tienen corriente. Revisa las conexiones y vuelve a intentarlo.`,
    });
  };

  const completas = Object.keys(conexiones).length === CABLES.length;
  const filaDeTerminal = (t: Terminal) => TERMINALES.findIndex((x) => x.id === t);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Boton onClick={abrirEsquema} aria-expanded={esquemaAbierto} aria-controls="esquema-cableado" disabled={resuelto}>
          📋 {esquemaAbierto ? 'Cerrar esquema' : 'Ver esquema'}
        </Boton>
        <Boton onClick={pedirAyuda} disabled={resuelto}>
          🎧 Pedir ayuda a Lisa
        </Boton>
      </div>

      {esquemaAbierto && (
        <div id="esquema-cableado" className="rounded-xl border border-amber-300/30 bg-amber-100/5 p-4 text-amber-100/90">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-200/80">Esquema del panel (medio roto)</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {PISTAS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative mx-auto grid w-full max-w-md grid-cols-[1fr_minmax(60px,1fr)_1fr] items-start">
        <ul aria-label="Cables" className="grid" style={{ gridAutoRows: FILA }}>
          {CABLES.map((c) => {
            const activo = cableActivo === c.id;
            const destino = conexiones[c.id];
            return (
              <li key={c.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => pulsarCable(c.id)}
                  aria-pressed={activo}
                  aria-label={`Cable ${c.nombre}${destino ? `, conectado a ${TERMINALES.find((t) => t.id === destino)?.nombre}` : ', suelto'}`}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none ${
                    activo ? 'border-cyan-200 bg-cyan-400/25 shadow-[0_0_18px_-4px_rgba(34,211,238,0.9)]' : 'border-slate-600 bg-slate-900/70 hover:border-cyan-300/60'
                  }`}
                >
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
                  {c.nombre}
                </button>
              </li>
            );
          })}
        </ul>

        <svg aria-hidden="true" className="block w-full self-start" style={{ height: FILA * CABLES.length }} viewBox={`0 0 100 ${FILA * CABLES.length}`} preserveAspectRatio="none">
          {CABLES.map((c, i) => {
            const t = conexiones[c.id];
            if (!t) return null;
            const y1 = i * FILA + FILA / 2;
            const y2 = filaDeTerminal(t) * FILA + FILA / 2;
            return (
              <path
                key={c.id}
                d={`M0 ${y1} C50 ${y1} 50 ${y2} 100 ${y2}`}
                stroke={c.color}
                strokeWidth="5"
                fill="none"
                vectorEffect="non-scaling-stroke"
                className={resuelto ? 'motion-safe:animate-pulse' : ''}
                style={{ filter: `drop-shadow(0 0 4px ${c.color})` }}
              />
            );
          })}
        </svg>

        <ul aria-label="Terminales" className="grid" style={{ gridAutoRows: FILA }}>
          {TERMINALES.map((t) => {
            const ocupado = (Object.entries(conexiones) as [Cable, Terminal][]).find(([, x]) => x === t.id)?.[0];
            return (
              <li key={t.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => pulsarTerminal(t.id)}
                  disabled={!cableActivo || resuelto}
                  aria-label={`Terminal ${t.nombre}${ocupado ? `, ocupado por el cable ${ocupado}` : ''}`}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-default motion-reduce:transition-none ${
                    cableActivo ? 'border-cyan-300/70 bg-cyan-400/10 hover:bg-cyan-400/25' : 'border-slate-600 bg-slate-900/70'
                  } ${resuelto ? 'text-emerald-300' : 'text-slate-100'}`}
                >
                  <span aria-hidden="true">{t.simbolo}</span>
                  <span className="text-xs text-slate-400">{t.nombre}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-center text-sm text-slate-400" aria-live="polite">
        {resuelto
          ? 'Panel reparado.'
          : cableActivo
            ? `Cable ${cableActivo} seleccionado: elige un terminal.`
            : 'Elige un cable y después un terminal.'}
      </p>

      {mensaje &&
        (mensaje.tipo === 'lisa' ? (
          <Bocadillo personaje="lisa" expresion={resuelto ? 'contento' : 'pensativo'}>
            {mensaje.texto}
          </Bocadillo>
        ) : (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${resuelto ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
            {mensaje.texto}
          </p>
        ))}

      <Boton variante="primario" onClick={probar} disabled={!completas || resuelto} silencioso>
        ⚡ Probar conexión
      </Boton>
    </div>
  );
}
