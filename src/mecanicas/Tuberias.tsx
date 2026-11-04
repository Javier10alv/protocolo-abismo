import { useMemo, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { BarraTiempo, useCuentaAtras } from './CuentaAtras';
import { INTENTOS_ANTES_DE_AYUDA, precisionPorIntentos, type PropsMecanica } from './tipos';

// Conexiones de cada pieza como máscara de bits: N=1, E=2, S=4, O=8.
const N = 1;
const E = 2;
const S = 4;
const O = 8;
const COLS = 5;
const FILAS = 4;
const FILA_ENTRADA = 1; // el depósito está a la izquierda de esta fila
const FILA_SALIDA = 2; // el motor está a la derecha de esta fila

type Tipo = 'recta' | 'codo' | 'te';
const BASE: Record<Tipo, number> = { recta: O | E, codo: N | E, te: O | N | E };

/** Gira una máscara 90° en sentido horario `veces` veces. */
function girar(mascara: number, veces: number) {
  let m = mascara;
  for (let i = 0; i < ((veces % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

interface Pieza {
  tipo: Tipo;
  giro: number; // número de giros acumulados (para animar la rotación)
}

// Recorrido de la solución: [fila, columna, tipo, máscara correcta].
const SOLUCION: [number, number, Tipo, number][] = [
  [1, 0, 'recta', O | E],
  [1, 1, 'codo', O | S],
  [2, 1, 'codo', N | E],
  [2, 2, 'recta', O | E],
  [2, 3, 'codo', O | N],
  [1, 3, 'codo', S | E],
  [1, 4, 'codo', O | S],
  [2, 4, 'codo', N | E],
];

const idx = (f: number, c: number) => f * COLS + c;

function crearTablero(): Pieza[] {
  const tablero: Pieza[] = [];
  const tipos: Tipo[] = ['recta', 'codo', 'te'];
  for (let i = 0; i < COLS * FILAS; i++) tablero.push({ tipo: tipos[Math.floor(Math.random() * 3)], giro: Math.floor(Math.random() * 4) });
  for (const [f, c, tipo, correcta] of SOLUCION) {
    // Desordena cada pieza del recorrido para que no empiece colocada.
    let giro = Math.floor(Math.random() * 4);
    while (girar(BASE[tipo], giro) === correcta) giro++;
    tablero[idx(f, c)] = { tipo, giro };
  }
  return tablero;
}

const mascara = (p: Pieza) => girar(BASE[p.tipo], p.giro);

/** Celdas a las que llega el agua desde el depósito, y si alcanza el motor. */
function flujo(tablero: Pieza[]): { llenas: Set<number>; llega: boolean } {
  const llenas = new Set<number>();
  const inicio = idx(FILA_ENTRADA, 0);
  if (!(mascara(tablero[inicio]) & O)) return { llenas, llega: false };
  const cola = [inicio];
  llenas.add(inicio);
  const vecinos: [number, number, number, number][] = [
    [N, -1, 0, S],
    [E, 0, 1, O],
    [S, 1, 0, N],
    [O, 0, -1, E],
  ];
  while (cola.length) {
    const actual = cola.shift()!;
    const f = Math.floor(actual / COLS);
    const c = actual % COLS;
    const m = mascara(tablero[actual]);
    for (const [dir, df, dc, opuesto] of vecinos) {
      if (!(m & dir)) continue;
      const nf = f + df;
      const nc = c + dc;
      if (nf < 0 || nf >= FILAS || nc < 0 || nc >= COLS) continue;
      const j = idx(nf, nc);
      if (llenas.has(j) || !(mascara(tablero[j]) & opuesto)) continue;
      llenas.add(j);
      cola.push(j);
    }
  }
  const salida = idx(FILA_SALIDA, COLS - 1);
  return { llenas, llega: llenas.has(salida) && !!(mascara(tablero[salida]) & E) };
}

const NOMBRE_TIPO: Record<Tipo, string> = { recta: 'tubo recto', codo: 'codo', te: 'pieza en T' };

function describir(m: number) {
  const lados = [
    [N, 'arriba'],
    [E, 'derecha'],
    [S, 'abajo'],
    [O, 'izquierda'],
  ] as const;
  return lados.filter(([b]) => m & b).map(([, n]) => n).join(' y ');
}

function DibujoPieza({ pieza, llena }: { pieza: Pieza; llena: boolean }) {
  const base = BASE[pieza.tipo];
  const color = llena ? '#22d3ee' : '#64748b';
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `rotate(${pieza.giro * 90}deg)` }} aria-hidden="true">
      {base & N && <rect x="15" y="0" width="10" height="22" rx="2" fill={color} />}
      {base & E && <rect x="18" y="15" width="22" height="10" rx="2" fill={color} />}
      {base & S && <rect x="15" y="18" width="10" height="22" rx="2" fill={color} />}
      {base & O && <rect x="0" y="15" width="22" height="10" rx="2" fill={color} />}
      <circle cx="20" cy="20" r="7" fill={llena ? '#67e8f9' : '#94a3b8'} />
    </svg>
  );
}

export default function Tuberias({ onCompletar }: PropsMecanica) {
  const [tablero, setTablero] = useState<Pieza[]>(crearTablero);
  const [fallos, setFallos] = useState(0);
  const [pidioConsejo, setPidioConsejo] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [resuelto, setResuelto] = useState(false);
  const [mostrarAgua, setMostrarAgua] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [consejo, setConsejo] = useState<string | null>(null);
  const [purgas, setPurgas] = useState(0);

  const { llenas, llega } = useMemo(() => flujo(tablero), [tablero]);

  // Contrarreloj: si se agota, Leo abre la purga de emergencia y da 45 s más. Nunca se pierde.
  const { restante, total } = useCuentaAtras(90, !resuelto, () => {
    setPurgas((n) => n + 1);
    return 45;
  });

  const girarPieza = (i: number) => {
    if (resuelto) return;
    sonido.click();
    setMostrarAgua(false);
    setMensaje(null);
    setTablero((t) => t.map((p, j) => (j === i ? { ...p, giro: p.giro + 1 } : p)));
  };

  const terminar = (fallosTotales: number, ayudaRecibida: boolean) => {
    setResuelto(true);
    sonido.exito();
    const conductas: string[] = [];
    if (pidioConsejo) conductas.push('pidio_ayuda');
    if (fallosTotales > 0) conductas.push('reintento');
    if (ayudaRecibida) conductas.push('ayuda_automatica');
    if (purgas > 0) conductas.push('tiempo_agotado');
    if (!pidioConsejo && fallosTotales === 0) conductas.push('anticipo_recorrido');
    const clave = pidioConsejo ? 'guiado' : fallosTotales > 0 ? 'insistente' : 'planificador';
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallosTotales, ayudaRecibida, precision: Math.max(0, precisionPorIntentos(fallosTotales, ayudaRecibida) - (pidioConsejo ? 15 : 0)) }), 1300);
  };

  const abrirValvula = () => {
    setMostrarAgua(true);
    if (llega) {
      setMensaje({ ok: true, texto: 'El refrigerante recorre el circuito y llega al motor.' });
      terminar(fallos, false);
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
      const corregido = [...tablero];
      for (const [f, c, tipo, correcta] of SOLUCION) {
        let giro = tablero[idx(f, c)].giro;
        while (girar(BASE[tipo], giro) !== correcta) giro++;
        corregido[idx(f, c)] = { tipo, giro };
      }
      setTablero(corregido);
      setAyuda(true);
      setMensaje({ ok: true, texto: 'Leo gira las últimas piezas contigo y el refrigerante llega al motor.' });
      terminar(nuevos, true);
      return;
    }
    setMensaje({ ok: false, texto: `Fuga: el agua avanza ${llenas.size} tramo${llenas.size === 1 ? '' : 's'} y se escapa. Mira dónde se corta y vuelve a intentarlo.` });
  };

  const pedirConsejo = () => {
    setPidioConsejo(true);
    const pendiente = SOLUCION.find(([f, c, , correcta]) => mascara(tablero[idx(f, c)]) !== correcta);
    if (!pendiente) {
      setConsejo('¡Así está perfecto! Abre la válvula.');
      return;
    }
    const [f, c, tipo, correcta] = pendiente;
    setTablero((t) => {
      const copia = [...t];
      let giro = copia[idx(f, c)].giro;
      while (girar(BASE[tipo], giro) !== correcta) giro++;
      copia[idx(f, c)] = { tipo, giro };
      return copia;
    });
    setConsejo(`Empieza por la fila ${f + 1}, columna ${c + 1}: tiene que conectar ${describir(correcta)}. Te la giro.`);
  };

  return (
    <div className="grid gap-4">
      <BarraTiempo etiqueta="Sobrecalentamiento en" restante={restante} total={total} />
      {purgas > 0 && !resuelto && (
        <Bocadillo personaje="leo" expresion="pensativo">
          ¡He abierto la purga de emergencia! Ganamos tiempo, sin prisa: piensa bien el recorrido.
        </Bocadillo>
      )}

      <div className="mx-auto grid w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-2">
        <div className="grid gap-1.5" style={{ gridTemplateRows: `repeat(${FILAS}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: FILAS }, (_, f) => (
            <span key={f} className={`flex aspect-square w-9 items-center justify-center rounded-md text-xl ${f === FILA_ENTRADA ? 'bg-cyan-500/20' : ''}`}>
              {f === FILA_ENTRADA ? '🛢️' : ''}
            </span>
          ))}
        </div>
        <div role="grid" aria-label="Tuberías. Pulsa una pieza para girarla." className="grid gap-1.5 rounded-xl border border-slate-700 bg-slate-950/80 p-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {tablero.map((p, i) => {
            const llena = mostrarAgua && llenas.has(i);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                onClick={() => girarPieza(i)}
                disabled={resuelto}
                aria-label={`Fila ${Math.floor(i / COLS) + 1}, columna ${(i % COLS) + 1}: ${NOMBRE_TIPO[p.tipo]} que conecta ${describir(mascara(p))}. Pulsa para girar.`}
                className={`aspect-square rounded-md border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  llena ? 'border-cyan-400/60 bg-cyan-500/15' : 'border-slate-700 bg-slate-900 hover:border-cyan-300/50'
                }`}
              >
                <DibujoPieza pieza={p} llena={llena || (resuelto && llenas.has(i))} />
              </button>
            );
          })}
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateRows: `repeat(${FILAS}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: FILAS }, (_, f) => (
            <span key={f} className={`flex aspect-square w-9 items-center justify-center rounded-md text-xl ${f === FILA_SALIDA ? (resuelto ? 'bg-emerald-500/25' : 'bg-rose-500/20') : ''}`}>
              {f === FILA_SALIDA ? '⚙️' : ''}
            </span>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-slate-400">🛢️ Depósito (fila {FILA_ENTRADA + 1}) → ⚙️ Motor (fila {FILA_SALIDA + 1})</p>

      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {mensaje.texto}
        </p>
      )}
      {consejo && !ayuda && (
        <Bocadillo personaje="leo" expresion="contento">
          {consejo}
        </Bocadillo>
      )}

      <div className="flex flex-wrap gap-2">
        <Boton variante="primario" className="flex-1" onClick={abrirValvula} disabled={resuelto} silencioso>
          🔧 Abrir la válvula
        </Boton>
        <Boton onClick={pedirConsejo} disabled={resuelto}>
          💬 Pedir consejo a Leo
        </Boton>
      </div>
    </div>
  );
}
