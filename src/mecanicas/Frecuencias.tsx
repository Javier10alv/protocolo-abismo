import { useRef, useState, type FormEvent } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import BarraInventario from './Inventario';
import type { PropsMecanica } from './tipos';

// «Frecuencias enlazadas»: Test de Asociados Remotos (Mednick, 1962) en cadena,
// con autoinforme de insight (Bowden y Jung-Beeman, 2003). La respuesta de cada
// acertijo forma parte del siguiente.

interface Acertijo {
  palabras: [string, string, string];
  /** Respuestas aceptadas, sin tildes y en minúscula. */
  respuestas: string[];
  /** Opciones que se muestran como ayuda tras 2 fallos (incluye la correcta). */
  opciones: string[];
  /** El último es el sensor óptico de la compuerta: la linterna también lo activa. */
  sensor?: boolean;
}

const CADENA: Acertijo[] = [
  { palabras: ['espada', 'globo', 'martillo'], respuestas: ['pez', 'peces'], opciones: ['pez', 'herramienta', 'arma', 'fiesta', 'acero', 'aire'] },
  { palabras: ['pez', 'dulce', 'salada'], respuestas: ['agua', 'aguas'], opciones: ['mar', 'agua', 'sal', 'comida', 'azucar', 'rio'] },
  { palabras: ['agua', 'oxigeno', 'combustible'], respuestas: ['tanque', 'deposito', 'tanques', 'depositos'], opciones: ['botella', 'motor', 'tanque', 'gas', 'aire', 'bomba'] },
  { palabras: ['año', 'luna', 'faro'], respuestas: ['luz', 'luces'], opciones: ['noche', 'luz', 'mar', 'tiempo', 'cielo', 'sol'], sensor: true },
];

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

type Nivel = 'libre' | 'opciones' | 'inicial' | 'revelada';
const PUNTOS: Record<Nivel, number> = { libre: 1, opciones: 0.6, inicial: 0.3, revelada: 0 };

export default function Frecuencias({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [paso, setPaso] = useState(0);
  const [texto, setTexto] = useState('');
  const [fallosPaso, setFallosPaso] = useState(0);
  const [fallos, setFallos] = useState(0);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [preguntaInsight, setPreguntaInsight] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const resultados = useRef<{ nivel: Nivel; insight?: 'golpe' | 'pasos'; objeto?: boolean }[]>([]);
  const respuestasDadas = useRef<string[]>([]);
  const acertijo = CADENA[paso];
  const nivel: Nivel = fallosPaso >= 4 ? 'revelada' : fallosPaso >= 3 ? 'inicial' : fallosPaso >= 2 ? 'opciones' : 'libre';

  const resolver = (como: Nivel, porObjeto = false) => {
    sonido.exito();
    resultados.current.push({ nivel: como, objeto: porObjeto });
    respuestasDadas.current.push(acertijo.respuestas[0]);
    setTexto('');
    setMensaje({ ok: true, texto: porObjeto ? 'La luz de la linterna activa el sensor óptico.' : `¡Frecuencia enlazada: ${acertijo.respuestas[0].toUpperCase()}!` });
    // Autoinforme de insight solo si lo ha resuelto con su cabeza.
    if (como !== 'revelada' && !porObjeto) setPreguntaInsight(true);
    else avanzar();
  };

  const avanzar = () => {
    setPreguntaInsight(false);
    setFallosPaso(0);
    if (paso + 1 >= CADENA.length) {
      cerrar();
      return;
    }
    setPaso((p) => p + 1);
  };

  const probar = (respuesta: string) => {
    if (terminado || preguntaInsight) return;
    const r = normalizar(respuesta);
    if (!r) return;
    registrar('accion', { que: 'respuesta', paso });
    if (acertijo.respuestas.includes(r)) {
      resolver(nivel);
      return;
    }
    sonido.aviso();
    const n = fallosPaso + 1;
    setFallosPaso(n);
    setFallos((f) => f + 1);
    registrar('fallo', { firma: `${paso}:${r}` });
    if (n === 2) registrar('ayuda', { tipo: 'pista' });
    if (n === 4) {
      registrar('ayuda', { tipo: 'automatica' });
      setMensaje({ ok: false, texto: `Lisa te lo dice: era «${acertijo.respuestas[0]}». Sigamos.` });
      resultados.current.push({ nivel: 'revelada' });
      respuestasDadas.current.push(acertijo.respuestas[0]);
      window.setTimeout(avanzar, 1600);
      return;
    }
    setMensaje({ ok: false, texto: `«${respuesta}» no enlaza las tres frecuencias. Busca una palabra que vaya con las tres.` });
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    probar(texto);
  };

  const insight = (tipo: 'golpe' | 'pasos') => {
    const ultimo = resultados.current[resultados.current.length - 1];
    if (ultimo) ultimo.insight = tipo;
    registrar('insight', { tipo, paso });
    avanzar();
  };

  const cerrar = () => {
    setTerminado(true);
    const rs = resultados.current;
    const pensados = rs.filter((r) => !r.objeto);
    const golpe = rs.filter((r) => r.insight === 'golpe').length;
    const pasos = rs.filter((r) => r.insight === 'pasos').length;
    const conPista = rs.filter((r) => r.nivel !== 'libre' && !r.objeto).length;
    const porObjeto = rs.some((r) => r.objeto);
    const conductas: string[] = [];
    if (porObjeto) conductas.push('uso_objeto_alternativo');
    if (golpe > pasos) conductas.push('insight_subito');
    else if (pasos > 0) conductas.push('insight_analitico');
    if (conPista > 0) conductas.push('pidio_ayuda');
    if (fallos > 0) conductas.push('reintento');
    const clave = porObjeto ? 'ingenioso' : conPista >= 2 ? 'apoyado' : golpe > pasos ? 'intuitivo' : 'analitico';
    const indicadores: Record<string, number> = {
      fre_asociacion: pensados.length ? pensados.reduce((a, r) => a + PUNTOS[r.nivel], 0) / pensados.length : 0,
    };
    if (inventario.includes('linterna')) indicadores.fre_objeto = porObjeto ? 1 : 0.3;
    window.setTimeout(
      () =>
        onCompletar({
          clave,
          conductas,
          intentos: fallos,
          ayudaRecibida: rs.some((r) => r.nivel === 'revelada'),
          precision: Math.round(indicadores.fre_asociacion * 100),
          indicadores,
        }),
      1200,
    );
  };

  const usarObjeto = (id: string): string | null => {
    if (id === 'linterna' && acertijo.sensor && !preguntaInsight && !terminado) {
      registrar('accion', { que: 'linterna_sensor' });
      resolver('libre', true);
      return 'Enfocas la linterna al sensor óptico de la compuerta…';
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <ol className="flex flex-wrap gap-2" aria-label="Cadena de frecuencias">
        {CADENA.map((_, i) => (
          <li key={i} className={`rounded-full border px-3 py-1 font-mono text-xs ${i < paso || terminado ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100' : i === paso ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100' : 'border-slate-700 text-slate-500'}`}>
            {i < paso || terminado ? respuestasDadas.current[i]?.toUpperCase() : `Frecuencia ${i + 1}`}
          </li>
        ))}
      </ol>

      {!terminado && (
        <>
          <div className="grid grid-cols-3 gap-2" aria-label="Las tres palabras que hay que enlazar">
            {acertijo.palabras.map((p, i) => {
              const enlazada = paso > 0 && normalizar(p) === normalizar(respuestasDadas.current[paso - 1] ?? '');
              return (
                <div key={p} className={`flex min-h-16 items-center justify-center rounded-xl border px-2 text-center font-mono text-lg uppercase tracking-wider ${enlazada ? 'border-emerald-300/60 bg-emerald-500/10 text-emerald-100' : 'border-cyan-400/30 bg-slate-900/70 text-cyan-100'}`}>
                  {p}
                  <span className="sr-only">{i < 2 ? ',' : ''}</span>
                </div>
              );
            })}
          </div>
          {acertijo.sensor && <p className="text-center text-xs text-slate-400">Última frecuencia: abre el sensor óptico de la compuerta.</p>}

          {preguntaInsight ? (
            <div className="grid gap-2 rounded-xl border border-cyan-400/25 bg-slate-900/60 p-3">
              <p className="text-sm text-slate-200">¿Cómo te ha llegado la respuesta?</p>
              <div className="flex flex-wrap gap-2">
                <Boton onClick={() => insight('golpe')}>💡 De golpe</Boton>
                <Boton onClick={() => insight('pasos')}>🧩 Paso a paso</Boton>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={enviar} className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="frecuencia-respuesta">
                  Palabra que enlaza las tres
                </label>
                <input
                  id="frecuencia-respuesta"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  autoComplete="off"
                  maxLength={20}
                  placeholder={nivel === 'inicial' ? `Empieza por «${acertijo.respuestas[0][0].toUpperCase()}»…` : 'Palabra que enlaza las tres…'}
                  className="min-h-11 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 font-mono text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                />
                <Boton type="submit" variante="primario" disabled={!texto.trim()} silencioso>
                  📶 Enlazar
                </Boton>
              </form>
              {nivel !== 'libre' && (
                <div className="grid gap-1.5">
                  <p className="text-xs text-slate-400">Lisa ha acotado las posibilidades:</p>
                  <ul className="flex flex-wrap gap-2">
                    {acertijo.opciones.map((o) => (
                      <li key={o}>
                        <button type="button" onClick={() => probar(o)} className="min-h-10 rounded-lg border border-slate-600 bg-slate-900/70 px-3 font-mono text-sm uppercase text-slate-200 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                          {o}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {mensaje && (
            <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
              {mensaje.texto}
            </p>
          )}
          {paso === 0 && !mensaje && (
            <Bocadillo personaje="lisa" expresion="pensativo" anunciar={false}>
              Cada frecuencia se abre con una palabra que vaya con las tres. Por ejemplo, «estrella · caballo · erizo» se enlazan con «mar»: estrella de mar, caballito de mar, erizo de mar.
            </Bocadillo>
          )}
          {!preguntaInsight && <BarraInventario key={paso} inventario={inventario} registrar={registrar} usar={usarObjeto} />}
        </>
      )}
      {terminado && (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          Las cuatro frecuencias están enlazadas. La compuerta se abre con un siseo.
        </p>
      )}
    </div>
  );
}
