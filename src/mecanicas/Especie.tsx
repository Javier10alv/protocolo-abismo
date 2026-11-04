import { useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import BarraInventario from './Inventario';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

// «Especie desconocida»: imaginación estructurada (Ward, 1994) y modelo Geneplore
// (Finke, Ward y Smith, 1992). El alumno diseña cómo podría ser una criatura del
// abismo. Se observa cuánto se aleja del prototipo conocido (un pez), si la
// criatura sobrevive al entorno (utilidad) y cuántas versiones distintas genera.

type Requisito = 'oscuridad' | 'presion' | 'frio' | 'comida' | 'depredadores';
type Categoria = 'cuerpo' | 'sentidos' | 'alimentacion' | 'temperatura' | 'defensa' | 'movimiento';

interface Parte {
  id: string;
  categoria: Categoria;
  nombre: string;
  descripcion: string;
  /** Rasgo propio de los animales conocidos (prototipo «pez»). */
  tipica: boolean;
  /** Energía que consume. */
  coste: number;
  cubre: Requisito[];
  /** Solo aparece al usar la linterna ultravioleta. */
  oculta?: boolean;
}

const PARTES: Parte[] = [
  { id: 'aletas', categoria: 'cuerpo', nombre: 'Cuerpo de pez con aletas', descripcion: 'Escamas, aletas y cola, como un pez normal.', tipica: true, coste: 2, cubre: [] },
  { id: 'gelatinoso', categoria: 'cuerpo', nombre: 'Cuerpo gelatinoso', descripcion: 'Blando y sin huesos, casi todo agua.', tipica: true, coste: 1, cubre: ['presion'] },
  { id: 'caparazon', categoria: 'cuerpo', nombre: 'Caparazón rígido', descripcion: 'Una coraza dura que lo protege.', tipica: true, coste: 3, cubre: ['depredadores'] },
  { id: 'colonia', categoria: 'cuerpo', nombre: 'Colonia que se separa', descripcion: 'Miles de seres diminutos que se dispersan y se vuelven a juntar.', tipica: false, coste: 2, cubre: ['presion', 'depredadores'] },

  { id: 'ojos', categoria: 'sentidos', nombre: 'Ojos enormes', descripcion: 'Captan hasta el último rayo de luz.', tipica: true, coste: 2, cubre: ['oscuridad'] },
  { id: 'eco', categoria: 'sentidos', nombre: 'Ecolocalización', descripcion: 'Emite chasquidos y «ve» con el eco.', tipica: false, coste: 2, cubre: ['oscuridad'] },
  { id: 'quimio', categoria: 'sentidos', nombre: 'Sabor a distancia', descripcion: 'Detecta sustancias disueltas en el agua desde lejos.', tipica: false, coste: 1, cubre: ['oscuridad', 'comida'] },
  { id: 'vibra', categoria: 'sentidos', nombre: 'Línea de vibraciones', descripcion: 'Nota el movimiento del agua a su alrededor.', tipica: true, coste: 1, cubre: ['oscuridad'] },

  { id: 'cazador', categoria: 'alimentacion', nombre: 'Cazador veloz', descripcion: 'Persigue y atrapa a sus presas.', tipica: true, coste: 3, cubre: ['comida'] },
  { id: 'filtrador', categoria: 'alimentacion', nombre: 'Filtrador', descripcion: 'Atrapa la «nieve marina» que cae de arriba.', tipica: true, coste: 1, cubre: ['comida'] },
  { id: 'quimiosintesis', categoria: 'alimentacion', nombre: 'Bacterias que fabrican comida', descripcion: 'Lleva dentro bacterias que comen minerales de las fumarolas.', tipica: false, coste: 0, cubre: ['comida'] },

  { id: 'grasa', categoria: 'temperatura', nombre: 'Capa de grasa', descripcion: 'Una capa gruesa que guarda el calor.', tipica: true, coste: 2, cubre: ['frio'] },
  { id: 'anticongelante', categoria: 'temperatura', nombre: 'Sangre anticongelante', descripcion: 'Su sangre no se congela aunque el agua esté a 2 °C.', tipica: false, coste: 1, cubre: ['frio'] },
  { id: 'fumarola', categoria: 'temperatura', nombre: 'Vive junto a fumarolas', descripcion: 'Se pega a las chimeneas de agua caliente del fondo.', tipica: false, coste: 0, cubre: ['frio'] },

  { id: 'pinchos', categoria: 'defensa', nombre: 'Pinchos', descripcion: 'Espinas que pinchan a quien lo muerda.', tipica: true, coste: 2, cubre: ['depredadores'] },
  { id: 'tinta', categoria: 'defensa', nombre: 'Nube de tinta', descripcion: 'Suelta tinta para escapar.', tipica: true, coste: 1, cubre: ['depredadores'] },
  { id: 'senuelo', categoria: 'defensa', nombre: 'Luz señuelo', descripcion: 'Brilla en la oscuridad para engañar a otros animales.', tipica: false, coste: 1, cubre: ['depredadores', 'comida'] },
  { id: 'transparente', categoria: 'defensa', nombre: 'Cuerpo transparente', descripcion: 'Casi invisible en el agua.', tipica: false, coste: 1, cubre: ['depredadores'] },
  { id: 'fluorescencia', categoria: 'defensa', nombre: 'Dibujos ultravioleta', descripcion: 'Marcas que solo ven algunos animales: así avisa a los suyos.', tipica: false, coste: 0, cubre: ['depredadores'], oculta: true },

  { id: 'nadar', categoria: 'movimiento', nombre: 'Nadar', descripcion: 'Se impulsa con el cuerpo.', tipica: true, coste: 2, cubre: [] },
  { id: 'reptar', categoria: 'movimiento', nombre: 'Reptar por el fondo', descripcion: 'Se arrastra despacio por el lodo.', tipica: true, coste: 1, cubre: [] },
  { id: 'deriva', categoria: 'movimiento', nombre: 'Dejarse llevar', descripcion: 'Flota y viaja con las corrientes.', tipica: false, coste: 0, cubre: [] },
  { id: 'chorro', categoria: 'movimiento', nombre: 'Propulsión a chorro', descripcion: 'Expulsa agua con fuerza para moverse.', tipica: false, coste: 2, cubre: [] },
];

const CATEGORIAS: { id: Categoria; nombre: string }[] = [
  { id: 'cuerpo', nombre: 'Cuerpo' },
  { id: 'sentidos', nombre: 'Sentidos' },
  { id: 'alimentacion', nombre: 'Cómo se alimenta' },
  { id: 'temperatura', nombre: 'Frente al frío' },
  { id: 'defensa', nombre: 'Defensa' },
  { id: 'movimiento', nombre: 'Movimiento' },
];

const REQUISITOS: { id: Requisito; texto: string }[] = [
  { id: 'oscuridad', texto: 'Oscuridad total: no llega la luz del sol' },
  { id: 'presion', texto: 'Presión enorme: 300 veces la de la superficie' },
  { id: 'frio', texto: 'Agua a 2 °C' },
  { id: 'comida', texto: 'Muy poca comida' },
  { id: 'depredadores', texto: 'Depredadores al acecho' },
];

const ENERGIA_MAX = 8;
const PARTE = new Map(PARTES.map((p) => [p.id, p]));

type Diseno = Partial<Record<Categoria, string>>;

/** Problemas del diseño: requisitos sin cubrir, exceso de energía y combinaciones incompatibles. */
function revisar(d: Diseno) {
  const partes = Object.values(d).map((id) => PARTE.get(id!)!);
  const cubiertos = new Set(partes.flatMap((p) => p.cubre));
  const faltan = REQUISITOS.filter((r) => !cubiertos.has(r.id));
  const energia = partes.reduce((a, p) => a + p.coste, 0);
  const choques: string[] = [];
  if (d.alimentacion === 'cazador' && d.movimiento === 'deriva' && d.defensa !== 'senuelo') choques.push('Un cazador que solo flota a la deriva no alcanza a sus presas.');
  if (d.alimentacion === 'quimiosintesis' && d.temperatura && d.temperatura !== 'fumarola') choques.push('Sus bacterias necesitan minerales de las fumarolas, pero no vive cerca de ellas.');
  if (d.temperatura === 'fumarola' && d.movimiento === 'deriva') choques.push('Si se deja llevar por la corriente, se aleja de las fumarolas que le dan calor.');
  return { faltan, energia, choques, completo: CATEGORIAS.every((c) => d[c.id]) };
}

const originalidadDe = (d: Diseno) => {
  const partes = Object.values(d).map((id) => PARTE.get(id!)!);
  return partes.length ? partes.filter((p) => !p.tipica).length / partes.length : 0;
};

const IDEAS_LISA = [
  'En las fumarolas hidrotermales hay bacterias que fabrican comida a partir de minerales, sin luz. ¿Y si tu criatura las llevara dentro?',
  'Muchos animales del abismo no tienen esqueleto: así la presión no los aplasta.',
  'Algunos animales de aquí abajo usan la luz para engañar, no para ver.',
];

export default function Especie({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [diseno, setDiseno] = useState<Diseno>({});
  const [disenos, setDisenos] = useState<Diseno[]>([]);
  const [fallos, setFallos] = useState(0);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ideas, setIdeas] = useState(0);
  const [ayuda, setAyuda] = useState(false);
  const [uv, setUv] = useState(false);
  const [fase, setFase] = useState<'disenar' | 'explicar' | 'otra' | 'hecho'>('disenar');
  const [explicaciones, setExplicaciones] = useState<Record<string, Requisito | ''>>({});
  // Telemetría: cumplimiento del primer diseño enviado y explicaciones correctas.
  const primerEnvio = useRef<number | null>(null);
  const aciertosExplicacion = useRef<number[]>([]);

  const rev = revisar(diseno);

  const elegir = (cat: Categoria, id: string) => {
    if (fase !== 'disenar') return;
    sonido.click();
    registrar('accion', { que: 'parte', categoria: cat, id });
    setMensaje(null);
    setDiseno((d) => ({ ...d, [cat]: d[cat] === id ? undefined : id }));
  };

  const enviar = () => {
    const cumplidos = REQUISITOS.length - rev.faltan.length;
    if (primerEnvio.current === null) primerEnvio.current = cumplidos / REQUISITOS.length;
    const valido = rev.faltan.length === 0 && rev.energia <= ENERGIA_MAX && rev.choques.length === 0;
    if (valido) {
      sonido.exito();
      registrar('accion', { que: 'validar', ok: true });
      setMensaje({ ok: true, texto: '¡Sobreviviría ahí abajo! Lisa toma nota.' });
      setFase('explicar');
      return;
    }
    sonido.aviso();
    const nuevos = fallos + 1;
    setFallos(nuevos);
    registrar('fallo', { firma: Object.values(diseno).sort().join('+'), faltan: rev.faltan.length });
    // Dificultad adaptativa: la primera vez Lisa solo dice que algo falla; después, el qué.
    if (nuevos === 1) {
      setMensaje({ ok: false, texto: 'Lisa niega con la cabeza: «Así no sobreviviría mucho aquí abajo. Revisa el entorno y la energía».' });
    } else {
      const partes = [
        ...rev.faltan.map((r) => `No resuelve: ${r.texto.toLowerCase()}.`),
        ...(rev.energia > ENERGIA_MAX ? [`Gasta demasiada energía (${rev.energia} de ${ENERGIA_MAX}): aquí abajo hay poca comida.`] : []),
        ...rev.choques,
      ];
      setMensaje({ ok: false, texto: partes.join(' ') });
      if (nuevos === 2) registrar('ayuda', { tipo: 'pista' });
    }
    if (nuevos >= INTENTOS_ANTES_DE_AYUDA + 1 && !ayuda) {
      // Lisa completa lo que falte con piezas sencillas y la historia sigue.
      setAyuda(true);
      registrar('ayuda', { tipo: 'automatica' });
      setDiseno({ cuerpo: 'gelatinoso', sentidos: 'vibra', alimentacion: 'filtrador', temperatura: 'anticongelante', defensa: 'tinta', movimiento: 'reptar' });
      setMensaje({ ok: false, texto: 'Lisa te propone una base que funciona. Puedes cambiar lo que quieras antes de enviarla.' });
    }
  };

  /** Explicar dos adaptaciones (elaboración): relacionar una parte con el problema que resuelve. */
  const aExplicar = Object.values(diseno)
    .map((id) => PARTE.get(id!)!)
    .filter((p) => p.cubre.length > 0)
    .slice(0, 2);

  const confirmarExplicacion = () => {
    const aciertos = aExplicar.filter((p) => explicaciones[p.id] && p.cubre.includes(explicaciones[p.id] as Requisito)).length;
    aciertosExplicacion.current.push(aExplicar.length ? aciertos / aExplicar.length : 0);
    registrar('accion', { que: 'explicar', aciertos });
    setDisenos((ds) => [...ds, diseno]);
    setExplicaciones({});
    setFase(disenos.length + 1 >= 3 ? 'hecho' : 'otra');
    if (disenos.length + 1 >= 3) cerrar([...disenos, diseno]);
  };

  const otraVariante = () => {
    registrar('accion', { que: 'otra_variante' });
    setMensaje({ ok: true, texto: 'Diseña otra especie que viva aquí, distinta de la anterior (cambia al menos 3 partes).' });
    setFase('disenar');
  };

  const distintaDeLasAnteriores = disenos.every((prev) => CATEGORIAS.filter((c) => prev[c.id] !== diseno[c.id]).length >= 3);

  const cerrar = (lista: Diseno[]) => {
    setFase('hecho');
    sonido.exito();
    const originalidad = Math.max(...lista.map(originalidadDe));
    const conNoTipicas = new Set(lista.flatMap((d) => CATEGORIAS.filter((c) => d[c.id] && !PARTE.get(d[c.id]!)!.tipica).map((c) => c.id)));
    const conductas: string[] = [];
    if (ideas > 0) conductas.push('pidio_ideas');
    if (lista.length >= 2) conductas.push('exploro_alternativas');
    if (originalidad >= 0.5) conductas.push('uso_original');
    if (fallos > 0) conductas.push('reintento');
    if (ayuda) conductas.push('ayuda_automatica');
    if (uv) conductas.push('uso_objeto_alternativo');
    const clave = lista.length >= 2 ? 'prolifico' : originalidad >= 0.5 ? 'innovador' : ideas > 0 ? 'consultor' : fallos >= 2 ? 'tenaz' : 'funcional';
    const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const indicadores: Record<string, number> = {
      esp_originalidad: ayuda ? Math.min(originalidad, 0.5) : originalidad,
      esp_utilidad: primerEnvio.current ?? 0,
      esp_flexibilidad: conNoTipicas.size / CATEGORIAS.length,
      esp_elaboracion: media(aciertosExplicacion.current),
      esp_fluidez: lista.length >= 3 ? 1 : lista.length === 2 ? 0.75 : 0.4,
    };
    window.setTimeout(
      () => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda, precision: Math.round(((primerEnvio.current ?? 0) * 0.6 + media(aciertosExplicacion.current) * 0.4) * 100), indicadores }),
      1300,
    );
  };

  const usarObjeto = (id: string): string | null => {
    if (id === 'linterna' && !uv) {
      setUv(true);
      return 'Con la luz ultravioleta, en las grabaciones aparecen unos dibujos brillantes en la piel de la criatura. Nueva parte disponible en «Defensa».';
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-xl border border-cyan-400/20 bg-slate-900/60 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">Entorno del abismo · debe sobrevivir a todo</p>
        <ul className="grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
          {REQUISITOS.map((r) => (
            <li key={r.id}>· {r.texto}</li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">Energía</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800" role="meter" aria-valuemin={0} aria-valuemax={ENERGIA_MAX} aria-valuenow={rev.energia} aria-label={`Energía: ${rev.energia} de ${ENERGIA_MAX}`}>
            <div className={`h-full rounded-full ${rev.energia > ENERGIA_MAX ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`} style={{ width: `${Math.min(100, (rev.energia / ENERGIA_MAX) * 100)}%` }} />
          </div>
          <span className={`font-mono text-sm ${rev.energia > ENERGIA_MAX ? 'text-rose-300' : 'text-slate-200'}`}>
            {rev.energia}/{ENERGIA_MAX}
          </span>
        </div>
      </div>

      {fase === 'disenar' && (
        <div className="grid gap-3">
          {CATEGORIAS.map((c) => (
            <fieldset key={c.id} className="grid gap-1.5">
              <legend className="text-sm font-semibold text-white">{c.nombre}</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {PARTES.filter((p) => p.categoria === c.id && (!p.oculta || uv)).map((p) => {
                  const activa = diseno[c.id] === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => elegir(c.id, p.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        activa ? 'border-cyan-200 bg-cyan-400/25 text-white' : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60'
                      } ${p.oculta ? 'ring-1 ring-violet-400/50' : ''}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{p.nombre}</span>
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">⚡{p.coste}</span>
                      </span>
                      <span className="block text-xs text-slate-400">{p.descripcion}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {fase === 'explicar' && (
        <div className="grid gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3">
          <Bocadillo personaje="lisa" expresion="contento">
            ¡Me encanta! Antes de apuntarla: explícame para qué le sirven estas dos adaptaciones.
          </Bocadillo>
          {aExplicar.map((p) => (
            <label key={p.id} className="grid gap-1 text-sm text-slate-200">
              {p.nombre} le sirve para…
              <select
                value={explicaciones[p.id] ?? ''}
                onChange={(e) => setExplicaciones((x) => ({ ...x, [p.id]: e.target.value as Requisito | '' }))}
                className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
              >
                <option value="">— Elige —</option>
                {REQUISITOS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.texto}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <Boton variante="primario" onClick={confirmarExplicacion} disabled={aExplicar.some((p) => !explicaciones[p.id])}>
            Apuntar en el cuaderno
          </Boton>
        </div>
      )}

      {fase === 'otra' && (
        <div className="grid gap-3 rounded-xl border border-cyan-400/25 bg-slate-900/60 p-3">
          <Bocadillo personaje="lisa" expresion="pensativo">
            Apuntada. Podría haber más de una especie colándose por los conductos… ¿Se te ocurre otra distinta?
          </Bocadillo>
          <div className="flex flex-wrap gap-2">
            <Boton variante="primario" onClick={otraVariante}>
              🧬 Diseñar otra especie
            </Boton>
            <Boton onClick={() => cerrar(disenos)}>Con esto basta</Boton>
          </div>
        </div>
      )}

      {mensaje && fase !== 'hecho' && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {mensaje.texto}
        </p>
      )}
      {ideas > 0 && fase === 'disenar' && (
        <Bocadillo personaje="lisa" expresion="pensativo">
          {IDEAS_LISA[Math.min(ideas, IDEAS_LISA.length) - 1]}
        </Bocadillo>
      )}

      {fase === 'disenar' && <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} />}

      {fase === 'disenar' && (
        <div className="flex flex-wrap gap-2">
          <Boton variante="primario" className="flex-1" onClick={enviar} disabled={!rev.completo || (disenos.length > 0 && !distintaDeLasAnteriores)} silencioso>
            🧬 Enviar el diseño a Lisa
          </Boton>
          <Boton
            onClick={() => {
              setIdeas((n) => n + 1);
              registrar('ayuda', { tipo: 'consejo' });
            }}
            disabled={ideas >= IDEAS_LISA.length}
          >
            💬 Pedir una idea a Lisa
          </Boton>
        </div>
      )}
      {fase === 'disenar' && disenos.length > 0 && rev.completo && !distintaDeLasAnteriores && <p className="text-xs text-amber-200">Cambia al menos 3 partes respecto a las especies anteriores.</p>}
      {fase === 'hecho' && (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          {disenos.length} especie{disenos.length === 1 ? '' : 's'} registrada{disenos.length === 1 ? '' : 's'} en el cuaderno de Lisa.
        </p>
      )}
    </div>
  );
}
