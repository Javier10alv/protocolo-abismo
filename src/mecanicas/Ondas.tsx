import { useEffect, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import BarraInventario from './Inventario';
import type { PropsMecanica } from './tipos';

// Parámetros discretos (no exigen precisión motora): se ajustan con botones − / +.
interface Onda {
  frecuencia: number; // 1–8
  amplitud: number; // 1–5
  fase: number; // 0–7 (× 45°)
}

const LIMITES: Record<keyof Onda, [number, number]> = { frecuencia: [1, 8], amplitud: [1, 5], fase: [0, 7] };
const NOMBRES: Record<keyof Onda, string> = { frecuencia: 'Frecuencia', amplitud: 'Amplitud', fase: 'Desfase' };
const CLAVES = Object.keys(LIMITES) as (keyof Onda)[];

/**
 * Tres objetivos sucesivos. Hay dos fallos posibles:
 *  - Previsible: si no se repara el monitor (ERR-47) antes de sincronizar, el
 *    primer intento falla. Se puede evitar: detectar la señal y actuar antes es
 *    afrontamiento proactivo (Aspinwall y Taylor, 1997).
 *  - Imprevisible: una interferencia exterior hace fallar la segunda
 *    sincronización a todo el mundo. Es el estresor estandarizado con el que se
 *    observa la reacción ante un contratiempo que no depende del alumno.
 * Los dos se explican al terminar.
 */
const OBJETIVOS: Onda[] = [
  { frecuencia: 3, amplitud: 2, fase: 2 },
  { frecuencia: 6, amplitud: 4, fase: 5 },
  { frecuencia: 2, amplitud: 5, fase: 7 },
];
/** Ajustes sin acertar tras los que Aris marca qué parámetros ya coinciden (dificultad adaptativa). */
const AJUSTES_PARA_GUIA = 22;
const SEGUNDOS_PISTA_LEO = 15;

const iguales = (a: Onda, b: Onda) => CLAVES.every((k) => a[k] === b[k]);

function trazo(o: Onda, ancho = 320, alto = 120) {
  const puntos: string[] = [];
  for (let x = 0; x <= ancho; x += 4) {
    const t = (x / ancho) * Math.PI * 2;
    const y = alto / 2 - Math.sin(t * o.frecuencia + (o.fase * Math.PI) / 4) * o.amplitud * 10;
    puntos.push(`${x},${y.toFixed(1)}`);
  }
  return puntos.join(' ');
}

type Fase = 'ajustando' | 'aviso' | 'sincronizando' | 'error' | 'hecho';
type Deteccion = 'sola' | 'leo' | 'lisa' | 'nunca';

export default function Ondas({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [onda, setOnda] = useState<Onda>({ frecuencia: 1, amplitud: 1, fase: 0 });
  const [nivel, setNivel] = useState(0);
  const [fase, setFase] = useState<Fase>('ajustando');
  const [error, setError] = useState<'previsible' | 'imprevisible' | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [pausas, setPausas] = useState(0);
  const [respirando, setRespirando] = useState(false);
  const [relevo, setRelevo] = useState(false);
  const [reparado, setReparado] = useState(false);
  const [inspecciono, setInspecciono] = useState(false);
  const [pistaLeo, setPistaLeo] = useState(false);
  const [ajustesNivel, setAjustesNivel] = useState(0);
  const temporizador = useRef<number | null>(null);
  // Telemetría: en qué momento detectó el código de error y qué hizo tras el fallo imprevisible.
  const deteccion = useRef<Deteccion>('nunca');
  const avisoLisa = useRef(false);
  const tuvoFalloPrevisible = useRef(false);
  const tras = useRef<{ accionesTras: number; pausaTras: boolean } | null>(null);
  const objetivo = OBJETIVOS[nivel];

  useEffect(() => () => {
    if (temporizador.current) window.clearInterval(temporizador.current);
  }, []);

  // Escalón 2 de pistas: si a los 15 s no ha hecho caso al código, Leo lo comenta.
  useEffect(() => {
    if (reparado || inspecciono) return;
    const t = window.setTimeout(() => {
      setPistaLeo(true);
      registrar('ayuda', { tipo: 'pista_leo' });
    }, SEGUNDOS_PISTA_LEO * 1000);
    return () => window.clearTimeout(t);
  }, [reparado, inspecciono, registrar]);

  const marcarDeteccion = () => {
    if (deteccion.current !== 'nunca') return;
    deteccion.current = avisoLisa.current ? 'lisa' : pistaLeo ? 'leo' : 'sola';
  };

  const terminar = (porRelevo: boolean) => {
    setFase('hecho');
    sonido.exito();
    const anticipo = reparado && !tuvoFalloPrevisible.current;
    const conductas: string[] = [];
    if (porRelevo) conductas.push('pidio_relevo');
    else conductas.push('persistio_tras_error');
    if (pausas > 0) conductas.push('hizo_pausa');
    if (anticipo) conductas.push('anticipo_fallo');
    else if (!reparado) conductas.push('ignoro_aviso');
    if (reparado) conductas.push('uso_objeto_alternativo');
    const clave = porRelevo ? 'relevo' : anticipo ? 'anticipado' : pausas > 0 ? 'regulado' : 'perseverante';
    const det = anticipo ? deteccion.current : 'nunca';
    const reaccion = porRelevo ? 0.5 : tras.current?.pausaTras ? 0.9 : tras.current && tras.current.accionesTras > 0 ? 1 : 0.7;
    const indicadores: Record<string, number> = {
      ond_anticipacion: { sola: 1, leo: 0.8, lisa: 0.6, nunca: 0.2 }[det],
      ond_reaccion: reaccion,
    };
    const fallosVividos = (tuvoFalloPrevisible.current ? 1 : 0) + 1;
    const notaCierre = anticipo
      ? 'Te diste cuenta del ERR-47 antes de que fuera un problema. Anticiparse también es saber gestionar la presión. La interferencia del final sí era imposible de prever: no fue culpa tuya.'
      : 'El monitor avisaba con un código de error (ERR-47) que se arreglaba con un condensador de repuesto. A veces las señales están ahí antes del fallo. La interferencia del final, en cambio, era imposible de prever: no fue culpa tuya.';
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallosVividos, ayudaRecibida: porRelevo, precision: porRelevo ? 50 : anticipo ? 100 : pausas > 0 ? 85 : 75, indicadores, notaCierre }), 1500);
  };

  const sincronizar = () => {
    setFase('sincronizando');
    setProgreso(0);
    let p = 0;
    // Nivel 0: falla si el monitor no está reparado. Nivel 1: interferencia para todos. Nivel 2: éxito.
    const fallara = (nivel === 0 && !reparado) || nivel === 1;
    temporizador.current = window.setInterval(() => {
      p += 5;
      setProgreso(p);
      if (p >= (fallara ? 75 : 100)) {
        window.clearInterval(temporizador.current!);
        temporizador.current = null;
        if (fallara) {
          sonido.aviso();
          const tipo = nivel === 0 ? 'previsible' : 'imprevisible';
          if (tipo === 'previsible') tuvoFalloPrevisible.current = true;
          else tras.current = { accionesTras: 0, pausaTras: false };
          registrar('fallo', { firma: tipo, provocado: true });
          setError(tipo);
          setFase('error');
          setNivel((n) => n + 1);
          setAjustesNivel(0);
        } else if (nivel >= OBJETIVOS.length - 1) {
          terminar(false);
        } else {
          registrar('accion', { que: 'sincronizado', nivel });
          setFase('ajustando');
          setNivel((n) => n + 1);
          setAjustesNivel(0);
        }
      }
    }, 90);
  };

  const intentarSincronizar = () => {
    // Escalón 3: al ir a sincronizar con el monitor averiado, Lisa avisa.
    if (nivel === 0 && !reparado && !avisoLisa.current) {
      avisoLisa.current = true;
      registrar('ayuda', { tipo: 'aviso_lisa' });
      setFase('aviso');
      return;
    }
    sincronizar();
  };

  const cambiar = (k: keyof Onda, d: number) => {
    if (fase === 'sincronizando' || fase === 'hecho' || fase === 'aviso' || relevo) return;
    const [min, max] = LIMITES[k];
    const v = onda[k] + d;
    if (v < min || v > max) return;
    sonido.click();
    registrar('accion', { que: 'ajustar', parametro: k });
    if (tras.current) tras.current.accionesTras++;
    const nueva = { ...onda, [k]: v };
    setOnda(nueva);
    setAjustesNivel((n) => n + 1);
    if (ajustesNivel + 1 === AJUSTES_PARA_GUIA) registrar('ayuda', { tipo: 'pista' });
    if (fase === 'error') setFase('ajustando');
    if (iguales(nueva, objetivo)) intentarSincronizar();
  };

  const pedirRelevo = () => {
    setRelevo(true);
    registrar('ayuda', { tipo: 'relevo' });
    setOnda(OBJETIVOS[OBJETIVOS.length - 1]);
    terminar(true);
  };

  const tomarAire = () => {
    setPausas((n) => n + 1);
    registrar('accion', { que: 'pausa' });
    if (tras.current) tras.current.pausaTras = true;
    setRespirando(true);
  };

  const inspeccionar = () => {
    setInspecciono(true);
    marcarDeteccion();
    registrar('accion', { que: 'inspeccionar_error' });
  };

  const usarObjeto = (id: string): string | null => {
    if (id === 'condensador' && !reparado) {
      marcarDeteccion();
      setReparado(true);
      if (fase === 'aviso') setFase('ajustando');
      return 'Abres el panel del monitor y cambias el condensador quemado por el de repuesto. El ERR-47 desaparece.';
    }
    if (id === 'manual') {
      marcarDeteccion();
      setInspecciono(true);
      return 'Según el manual, ERR-47 significa «condensador del monitor dañado: sustituir antes de sincronizar».';
    }
    return null;
  };

  const verGuia = ajustesNivel >= AJUSTES_PARA_GUIA && fase !== 'hecho';

  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-xl border border-cyan-400/25 bg-[#03121a] p-2">
        {!reparado && fase !== 'hecho' && (
          <button
            type="button"
            onClick={inspeccionar}
            className="absolute right-2 top-2 z-10 rounded border border-rose-400/40 bg-rose-950/60 px-1.5 py-0.5 font-mono text-[10px] text-rose-300 motion-safe:animate-pulse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            aria-label="Código de error en el monitor: ERR-47. Pulsa para inspeccionarlo."
          >
            ERR-47 · CONDENSADOR
          </button>
        )}
        <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={`Onda de referencia y tu onda. ${iguales(onda, objetivo) ? 'Coinciden.' : 'Aún no coinciden.'}`}>
          {[30, 60, 90].map((y) => (
            <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#0f2a33" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={trazo(objetivo)} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 5" opacity="0.9" vectorEffect="non-scaling-stroke" />
          <polyline points={trazo(onda)} fill="none" stroke="#22d3ee" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between px-1 text-[11px]">
          <span className="text-amber-300">- - Referencia {nivel + 1}/{OBJETIVOS.length}</span>
          <span className="text-cyan-300">— Tu señal</span>
        </div>
        {fase === 'error' && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center bg-rose-950/75 px-4 text-center font-mono text-sm uppercase tracking-widest text-rose-200 motion-safe:animate-[aparecer_200ms_ease-out]">
            {error === 'previsible' ? '⚠ ERR-47 · El monitor se apaga · la referencia se ha desplazado' : '⚠ Interferencia exterior · la referencia se ha desplazado'}
          </div>
        )}
      </div>

      {inspecciono && !reparado && fase !== 'hecho' && (
        <p role="status" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          ERR-47: el condensador del monitor está dañado. Sin cambiarlo, la sincronización puede fallar.
        </p>
      )}
      {pistaLeo && !reparado && !inspecciono && fase !== 'hecho' && (
        <Bocadillo personaje="leo" expresion="preocupado">
          Oye… ¿eso de la esquina del monitor es un código de error? No me da buena espina.
        </Bocadillo>
      )}

      {fase === 'aviso' && (
        <div className="grid gap-3 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
          <Bocadillo personaje="lisa" expresion="preocupado">
            ¡Espera! El monitor sigue marcando ERR-47. ¿Seguro que quieres sincronizar así?
          </Bocadillo>
          <div className="flex flex-wrap gap-2">
            <Boton
              onClick={() => {
                registrar('accion', { que: 'revisar_primero' });
                setFase('ajustando');
              }}
            >
              Revisar primero
            </Boton>
            <Boton
              variante="primario"
              onClick={() => {
                registrar('accion', { que: 'sincronizar_igualmente' });
                sincronizar();
              }}
            >
              Sincronizar igualmente
            </Boton>
          </div>
          <p className="text-xs text-slate-400">Si te falta algo, puedes volver a la sala de control y regresar después.</p>
        </div>
      )}

      {fase === 'sincronizando' && (
        <div className="grid gap-1" role="status">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-200">Sincronizando…</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-cyan-300 transition-[width] duration-100" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {CLAVES.map((k) => (
          <div key={k} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${verGuia && onda[k] === objetivo[k] ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/70'}`}>
            <span className="text-sm text-slate-300">
              {NOMBRES[k]}
              {verGuia && onda[k] === objetivo[k] && <span className="ml-1 text-emerald-300" aria-label="coincide">✓</span>}
            </span>
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
      {verGuia && (
        <Bocadillo personaje="aris" expresion="pensativo" anunciar={false}>
          Te marco en verde lo que ya coincide. Fíjate en cuántas crestas tiene la referencia y en su altura.
        </Bocadillo>
      )}

      {error && fase !== 'hecho' && (
        <Bocadillo personaje="aris" expresion="preocupado">
          {error === 'previsible'
            ? 'El monitor se ha apagado un instante… algo en ese panel no iba bien. Tú decides: seguimos, paramos un momento o lo cojo yo.'
            : 'Una interferencia de fuera: eso no lo podía prever nadie. Seguimos, paramos un momento o lo cojo yo, como prefieras.'}
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

      {fase !== 'hecho' && fase !== 'aviso' && <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} />}

      {fase !== 'hecho' && fase !== 'aviso' && !respirando && (
        <div className="flex flex-wrap gap-2">
          {fase === 'ajustando' && iguales(onda, objetivo) && (
            <Boton variante="primario" onClick={intentarSincronizar}>
              📶 Sincronizar
            </Boton>
          )}
          <Boton onClick={tomarAire} disabled={fase === 'sincronizando'}>
            🌬️ Tomar aire
          </Boton>
          {error && (
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
