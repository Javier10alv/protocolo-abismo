import { useMemo, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import { BarraTiempo, useCuentaAtras } from './CuentaAtras';
import BarraInventario from './Inventario';
import { INTENTOS_ANTES_DE_AYUDA, precisionPorIntentos, type PropsMecanica } from './tipos';

// Conexiones de cada pieza como máscara de bits: N=1, E=2, S=4, O=8.
const N = 1;
const E = 2;
const S = 4;
const O = 8;
const COLS = 7;
const FILAS = 5;
const FILA_ENTRADA = 2; // el depósito está a la izquierda de esta fila
const FILA_SALIDA = 2; // el motor está a la derecha de esta fila

type Tipo = 'recta' | 'codo' | 'te' | 'roca';
const BASE: Record<Tipo, number> = { recta: O | E, codo: N | E, te: O | N | E, roca: 0 };

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

const idx = (f: number, c: number) => f * COLS + c;

// Recorrido largo (la solución estándar): rodea la tubería agrietada por arriba.
const RUTA_LARGA: [number, number, Tipo, number][] = [
  [2, 0, 'te', O | N | E],
  [1, 0, 'codo', S | E],
  [1, 1, 'recta', O | E],
  [1, 2, 'codo', O | N],
  [0, 2, 'codo', S | E],
  [0, 3, 'recta', O | E],
  [0, 4, 'codo', O | S],
  [1, 4, 'codo', N | E],
  [1, 5, 'codo', O | S],
  [2, 5, 'te', N | E | O],
  [2, 6, 'recta', O | E],
];
// Recorrido corto: atraviesa la grieta. Solo funciona si se sella con un objeto.
const RUTA_CORTA: [number, number, Tipo, number][] = [
  [2, 0, 'te', O | N | E],
  [2, 1, 'recta', O | E],
  [2, 2, 'recta', O | E],
  [2, 3, 'recta', O | E],
  [2, 4, 'recta', O | E],
  [2, 5, 'te', N | E | O],
  [2, 6, 'recta', O | E],
];
const GRIETA = idx(2, 3);
const ROCAS = [idx(3, 1), idx(3, 3), idx(4, 5), idx(0, 0)];

function crearTablero(): Pieza[] {
  const tablero: Pieza[] = [];
  const tipos: Tipo[] = ['recta', 'codo', 'te', 'codo'];
  for (let i = 0; i < COLS * FILAS; i++) tablero.push({ tipo: tipos[Math.floor(Math.random() * tipos.length)], giro: Math.floor(Math.random() * 4) });
  for (const r of ROCAS) tablero[r] = { tipo: 'roca', giro: 0 };
  for (const [f, c, tipo, correcta] of [...RUTA_CORTA, ...RUTA_LARGA]) {
    // Desordena cada pieza de los recorridos para que no empiece colocada.
    let giro = Math.floor(Math.random() * 4);
    while (girar(BASE[tipo], giro) === correcta) giro++;
    tablero[idx(f, c)] = { tipo, giro };
  }
  return tablero;
}

const mascara = (p: Pieza) => girar(BASE[p.tipo], p.giro);

/** Celdas a las que llega el agua, si alcanza el motor y si se escapa por la grieta. */
function flujo(tablero: Pieza[], sellada: boolean): { llenas: Set<number>; llega: boolean; fugaGrieta: boolean } {
  const llenas = new Set<number>();
  let fugaGrieta = false;
  const inicio = idx(FILA_ENTRADA, 0);
  if (!(mascara(tablero[inicio]) & O)) return { llenas, llega: false, fugaGrieta };
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
      if (j === GRIETA && !sellada) {
        // El agua entra en la grieta y se escapa: no sigue avanzando.
        fugaGrieta = true;
        continue;
      }
      llenas.add(j);
      cola.push(j);
    }
  }
  const salida = idx(FILA_SALIDA, COLS - 1);
  return { llenas, llega: llenas.has(salida) && !!(mascara(tablero[salida]) & E), fugaGrieta };
}

/** Giros mínimos para pasar de una pieza a la máscara deseada. */
function girosNecesarios(p: Pieza, objetivo: number) {
  for (let k = 0; k < 4; k++) if (girar(BASE[p.tipo], p.giro + k) === objetivo) return k;
  return 0;
}

/** Firma de un intento: qué celdas del recorrido estaban bien. Sirve para ver si repite la misma estrategia. */
function firma(tablero: Pieza[]) {
  return RUTA_LARGA.map(([f, c, , m]) => (mascara(tablero[idx(f, c)]) === m ? '1' : '0')).join('');
}

const NOMBRE_TIPO: Record<Tipo, string> = { recta: 'tubo recto', codo: 'codo', te: 'pieza en T', roca: 'roca' };

function describir(m: number) {
  const lados = [
    [N, 'arriba'],
    [E, 'derecha'],
    [S, 'abajo'],
    [O, 'izquierda'],
  ] as const;
  return lados.filter(([b]) => m & b).map(([, n]) => n).join(' y ');
}

function DibujoPieza({ pieza, llena, grieta }: { pieza: Pieza; llena: boolean; grieta: 'abierta' | 'sellada' | null }) {
  if (pieza.tipo === 'roca') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
        <path d="M6 30 L10 12 L22 6 L34 14 L35 30 L20 35 Z" fill="#334155" stroke="#475569" />
      </svg>
    );
  }
  const base = BASE[pieza.tipo];
  const color = llena ? '#22d3ee' : grieta === 'abierta' ? '#b45309' : '#64748b';
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `rotate(${pieza.giro * 90}deg)` }} aria-hidden="true">
      {base & N && <rect x="15" y="0" width="10" height="22" rx="2" fill={color} />}
      {base & E && <rect x="18" y="15" width="22" height="10" rx="2" fill={color} />}
      {base & S && <rect x="15" y="18" width="10" height="22" rx="2" fill={color} />}
      {base & O && <rect x="0" y="15" width="22" height="10" rx="2" fill={color} />}
      <circle cx="20" cy="20" r="7" fill={llena ? '#67e8f9' : '#94a3b8'} />
      {grieta === 'abierta' && <path d="M12 12 L18 19 L14 23 L22 30" stroke="#fda4af" strokeWidth="2.5" fill="none" />}
      {grieta === 'sellada' && <rect x="10" y="13" width="20" height="14" rx="3" fill="#cbd5e1" opacity="0.85" />}
    </svg>
  );
}

const TIEMPO = 150;

export default function Tuberias({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [tablero, setTablero] = useState<Pieza[]>(crearTablero);
  const inicial = useRef(tablero);
  const [fallos, setFallos] = useState(0);
  const [pidioConsejo, setPidioConsejo] = useState(false);
  const [resuelto, setResuelto] = useState(false);
  const [mostrarAgua, setMostrarAgua] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [consejo, setConsejo] = useState<string | null>(null);
  const [purgas, setPurgas] = useState(0);
  const [sellada, setSellada] = useState(false);
  const [comprobaciones, setComprobaciones] = useState(2);
  const [pista, setPista] = useState<number | null>(null);
  // Telemetría interna para los indicadores.
  const giros = useRef(0);
  const regiros = useRef(0);
  const girosEnCelda = useRef<number[]>([]);
  const comprobo = useRef({ antesDePrimerIntento: false, trasFallo: false });
  const presionAvisada = useRef(false);
  const objetosUsados = useRef<string[]>([]);

  const { llenas, llega, fugaGrieta } = useMemo(() => flujo(tablero, sellada), [tablero, sellada]);

  // Contrarreloj: si se agota, Leo abre la purga de emergencia y da 60 s más. Nunca se pierde.
  const { restante, total } = useCuentaAtras(TIEMPO, !resuelto, () => {
    setPurgas((n) => n + 1);
    registrar('tiempo_agotado');
    return 60;
  });
  if (!presionAvisada.current && !resuelto && restante <= total * 0.2) {
    presionAvisada.current = true;
    registrar('presion');
  }

  const girarPieza = (i: number) => {
    if (resuelto || tablero[i].tipo === 'roca') return;
    sonido.click();
    // ¿La pieza ya estaba bien colocada en alguno de los recorridos? Girarla es deshacer trabajo.
    const correcta = [...RUTA_LARGA, ...RUTA_CORTA].find(([f, c]) => idx(f, c) === i);
    if (correcta && mascara(tablero[i]) === correcta[3]) regiros.current++;
    giros.current++;
    girosEnCelda.current.push(i);
    registrar('accion', { que: 'girar', celda: i });
    setMostrarAgua(false);
    setMensaje(null);
    setTablero((t) => t.map((p, j) => (j === i ? { ...p, giro: p.giro + 1 } : p)));
  };

  const terminar = (fallosTotales: number, ayudaRecibida: boolean, tableroFinal: Pieza[], selladaFinal: boolean) => {
    setResuelto(true);
    sonido.exito();
    const { llenas: finales } = flujo(tableroFinal, selladaFinal);
    const porCorta = selladaFinal && finales.has(GRIETA);
    // Giros mínimos para dejar, desde el tablero inicial, el recorrido que usó.
    const optimo = [...finales].reduce((a, i) => a + girosNecesarios(inicial.current[i], mascara(tableroFinal[i])), 0);
    const enRecorrido = girosEnCelda.current.filter((i) => finales.has(i)).length;
    const conductas: string[] = [];
    if (pidioConsejo) conductas.push('pidio_ayuda');
    if (fallosTotales > 0) conductas.push('reintento');
    if (ayudaRecibida) conductas.push('ayuda_automatica');
    if (purgas > 0) conductas.push('tiempo_agotado');
    if (!pidioConsejo && fallosTotales === 0) conductas.push('anticipo_recorrido');
    if (porCorta) conductas.push('uso_objeto_alternativo');
    if (comprobo.current.antesDePrimerIntento || comprobo.current.trasFallo) conductas.push('comprobo_hipotesis');
    const clave = porCorta ? 'ingenioso' : pidioConsejo ? 'guiado' : fallosTotales > 0 ? 'insistente' : 'planificador';
    const indicadores: Record<string, number> = {
      tub_eficiencia: giros.current > 0 ? Math.min(1, optimo / giros.current) : 1,
      tub_foco: giros.current > 0 ? enRecorrido / giros.current : 1,
      tub_hipotesis: fallosTotales === 0 && !pidioConsejo ? 1 : comprobo.current.trasFallo || comprobo.current.antesDePrimerIntento ? 0.85 : 0.4,
      tub_regiro: giros.current > 0 ? 1 - Math.min(1, regiros.current / giros.current) : 1,
    };
    window.setTimeout(
      () =>
        onCompletar({
          clave,
          conductas,
          intentos: fallosTotales,
          ayudaRecibida,
          precision: Math.max(0, precisionPorIntentos(fallosTotales, ayudaRecibida) - (pidioConsejo ? 15 : 0)),
          indicadores,
        }),
      1300,
    );
  };

  const abrirValvula = () => {
    setMostrarAgua(true);
    if (llega) {
      setMensaje({ ok: true, texto: 'El refrigerante recorre el circuito y llega al motor.' });
      registrar('accion', { que: 'valvula', ok: true });
      terminar(fallos, false, tablero, sellada);
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    registrar('fallo', { firma: firma(tablero), tramos: llenas.size, grieta: fugaGrieta });
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA) {
      const corregido = [...tablero];
      for (const [f, c, tipo, correcta] of RUTA_LARGA) {
        let giro = tablero[idx(f, c)].giro;
        while (girar(BASE[tipo], giro) !== correcta) giro++;
        corregido[idx(f, c)] = { tipo, giro };
      }
      setTablero(corregido);
      registrar('ayuda', { tipo: 'automatica' });
      setMensaje({ ok: true, texto: 'Leo gira las últimas piezas contigo y el refrigerante llega al motor.' });
      terminar(nuevos, true, corregido, sellada);
      return;
    }
    if (nuevos === 2) {
      // Dificultad adaptativa: tras dos fugas, Leo señala la primera pieza mal colocada.
      const mal = RUTA_LARGA.find(([f, c, , m]) => mascara(tablero[idx(f, c)]) !== m);
      if (mal) {
        setPista(idx(mal[0], mal[1]));
        registrar('ayuda', { tipo: 'pista' });
      }
    }
    setMensaje({
      ok: false,
      texto: fugaGrieta
        ? `El agua llega a la tubería agrietada (fila 3) y se escapa por ahí. Busca otro camino… o una forma de taparla.`
        : `Fuga: el agua avanza ${llenas.size} tramo${llenas.size === 1 ? '' : 's'} y se escapa. Mira dónde se corta y vuelve a intentarlo.`,
    });
  };

  const comprobar = () => {
    if (comprobaciones <= 0 || resuelto) return;
    sonido.click();
    setComprobaciones((n) => n - 1);
    if (fallos === 0) comprobo.current.antesDePrimerIntento = true;
    else comprobo.current.trasFallo = true;
    registrar('accion', { que: 'comprobar' });
    setMostrarAgua(true);
    setMensaje({ ok: llega, texto: llega ? 'El sensor indica que el caudal llegaría al motor.' : `El sensor marca caudal en ${llenas.size} tramo${llenas.size === 1 ? '' : 's'}${fugaGrieta ? ' y pérdida en la grieta' : ''}.` });
  };

  const pedirConsejo = () => {
    setPidioConsejo(true);
    registrar('ayuda', { tipo: 'consejo' });
    const pendiente = RUTA_LARGA.find(([f, c, , correcta]) => mascara(tablero[idx(f, c)]) !== correcta);
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
    setConsejo(`La grieta no aguanta: hay que rodearla por arriba. Empieza por la fila ${f + 1}, columna ${c + 1}: tiene que conectar ${describir(correcta)}. Te la giro.`);
  };

  const usarObjeto = (id: string): string | null => {
    if (id === 'cinta' || id === 'gel') {
      if (sellada) return null;
      setSellada(true);
      objetosUsados.current.push(id);
      setMostrarAgua(false);
      return id === 'cinta' ? 'Envuelves la grieta con varias vueltas de cinta: ya no pierde agua. El camino recto vuelve a ser posible.' : 'Untas el gel de algas sobre la grieta y se endurece con el agua fría. ¡Tapada!';
    }
    if (id === 'bateria') {
      setComprobaciones((n) => n + 1);
      objetosUsados.current.push(id);
      return 'Conectas la batería a la bomba auxiliar: el sensor de caudal tiene una carga más.';
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <BarraTiempo etiqueta="Sobrecalentamiento en" restante={restante} total={total} />
      {purgas > 0 && !resuelto && (
        <Bocadillo personaje="leo" expresion="pensativo">
          ¡He abierto la purga de emergencia! Ganamos tiempo, sin prisa: piensa bien el recorrido.
        </Bocadillo>
      )}

      <div className="mx-auto grid w-full max-w-lg grid-cols-[auto_1fr_auto] items-center gap-1.5">
        <div className="grid gap-1" style={{ gridTemplateRows: `repeat(${FILAS}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: FILAS }, (_, f) => (
            <span key={f} className={`flex aspect-square w-7 items-center justify-center rounded-md text-lg sm:w-9 ${f === FILA_ENTRADA ? 'bg-cyan-500/20' : ''}`}>
              {f === FILA_ENTRADA ? '🛢️' : ''}
            </span>
          ))}
        </div>
        <div role="grid" aria-label="Tuberías. Pulsa una pieza para girarla." className="grid gap-1 rounded-xl border border-slate-700 bg-slate-950/80 p-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {tablero.map((p, i) => {
            const llena = mostrarAgua && llenas.has(i);
            const grieta = i === GRIETA ? (sellada ? 'sellada' : 'abierta') : null;
            const esRoca = p.tipo === 'roca';
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                onClick={() => girarPieza(i)}
                disabled={resuelto || esRoca}
                aria-label={`Fila ${Math.floor(i / COLS) + 1}, columna ${(i % COLS) + 1}: ${esRoca ? 'roca, no se puede girar' : `${NOMBRE_TIPO[p.tipo]} que conecta ${describir(mascara(p))}${grieta === 'abierta' ? ', agrietada' : grieta === 'sellada' ? ', grieta sellada' : ''}. Pulsa para girar.`}`}
                className={`aspect-square rounded-md border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  pista === i && !resuelto
                    ? 'border-amber-300 bg-amber-400/20 motion-safe:animate-pulse'
                    : llena
                      ? 'border-cyan-400/60 bg-cyan-500/15'
                      : grieta === 'abierta'
                        ? 'border-rose-400/50 bg-rose-500/10'
                        : esRoca
                          ? 'border-transparent bg-transparent'
                          : 'border-slate-700 bg-slate-900 hover:border-cyan-300/50'
                }`}
              >
                <DibujoPieza pieza={p} llena={llena || (resuelto && llenas.has(i))} grieta={grieta} />
              </button>
            );
          })}
        </div>
        <div className="grid gap-1" style={{ gridTemplateRows: `repeat(${FILAS}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: FILAS }, (_, f) => (
            <span key={f} className={`flex aspect-square w-7 items-center justify-center rounded-md text-lg sm:w-9 ${f === FILA_SALIDA ? (resuelto ? 'bg-emerald-500/25' : 'bg-rose-500/20') : ''}`}>
              {f === FILA_SALIDA ? '⚙️' : ''}
            </span>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-slate-400">
        🛢️ Depósito → ⚙️ Motor (fila {FILA_ENTRADA + 1}) · La tubería roja está agrietada · Las rocas no se mueven
      </p>

      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {mensaje.texto}
        </p>
      )}
      {pista !== null && !resuelto && !consejo && (
        <Bocadillo personaje="leo" expresion="pensativo">
          Mira la pieza que parpadea: por ahí se corta el recorrido de arriba.
        </Bocadillo>
      )}
      {consejo && !resuelto && (
        <Bocadillo personaje="leo" expresion="contento">
          {consejo}
        </Bocadillo>
      )}

      <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} desactivado={resuelto} />

      <div className="flex flex-wrap gap-2">
        <Boton variante="primario" className="flex-1" onClick={abrirValvula} disabled={resuelto} silencioso>
          🔧 Abrir la válvula
        </Boton>
        <Boton onClick={comprobar} disabled={resuelto || comprobaciones <= 0}>
          👁 Comprobar caudal ({comprobaciones})
        </Boton>
        <Boton onClick={pedirConsejo} disabled={resuelto}>
          💬 Consejo de Leo
        </Boton>
      </div>
    </div>
  );
}
