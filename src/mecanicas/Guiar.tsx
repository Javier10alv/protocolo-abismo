import { useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import Retrato, { NOMBRE_PERSONAJE } from '../components/Retrato';
import { Bocadillo, Boton } from '../components/ui';
import type { Personaje } from '../types/game';
import BarraInventario from './Inventario';
import { INTENTOS_ANTES_DE_AYUDA, type PropsMecanica } from './tipos';

// «Al frente del equipo»: liderazgo situacional (Hersey y Blanchard, 1969).
// Cada persona está en un momento distinto (¿sabe hacerlo?, ¿se siente capaz?) y
// necesita un estilo distinto: dirigir, entrenar, apoyar o delegar. En la segunda
// ronda el estado de todos cambia: se observa si el alumno adapta su estilo o
// repite el que le funcionó antes.

type Estilo = 'dirigir' | 'entrenar' | 'apoyar' | 'delegar';

interface Frase {
  estilo: Estilo;
  texto: string;
  /** Reacción de la persona. Si el estilo no encaja, explica la consecuencia sin nombrar el estilo. */
  reaccion: string;
}

interface Caso {
  personaje: Personaje;
  tarea: string;
  /** Lo que se ve a simple vista. */
  dice: string;
  /** Lo que cuenta si se le pregunta cómo está (competencia y confianza). */
  alPreguntar: string;
  /** Estilo que encaja con su momento. */
  encaja: Estilo;
  /** Las cuatro frases, en el orden en que se muestran. */
  frases: Frase[];
}

const RONDAS: { titulo: string; casos: Caso[] }[] = [
  {
    titulo: 'Primera ronda · cada uno a su puesto',
    casos: [
      {
        personaje: 'lisa',
        tarea: 'Sellar el invernadero',
        dice: '«El invernadero, ¿verdad? Voy para allá.»',
        alPreguntar: '«Conozco cada válvula de ese invernadero, lo he hecho cien veces. Estoy perfectamente.»',
        encaja: 'delegar',
        frases: [
          { estilo: 'entrenar', texto: 'Te explico cómo se sella el invernadero y por qué es tan importante, ¿vale?', reaccion: '«Gracias, pero eso ya lo sé…» Lisa sonríe, algo impaciente, mientras pasan los minutos.' },
          { estilo: 'delegar', texto: 'Es tuyo: sabes mejor que nadie cómo hacerlo. Avísame cuando esté.', reaccion: 'Lisa asiente y sale disparada. «Hecho en diez minutos.»' },
          { estilo: 'dirigir', texto: 'Cierra primero la válvula 1, luego la 2, y me avisas después de cada paso.', reaccion: 'Lisa arquea una ceja: «Sé hacerlo, de verdad. Avisarte a cada paso nos retrasa».' },
          { estilo: 'apoyar', texto: '¿Cómo lo ves? Lo decidimos juntos y te acompaño un rato.', reaccion: '«Puedo sola, de verdad. Mejor acompaña a quien lo necesite.»' },
        ],
      },
      {
        personaje: 'leo',
        tarea: 'Recalibrar las válvulas de presión',
        dice: '«Las válvulas de presión… vale. Vale.»',
        alPreguntar: '«Sé cómo se hace, de verdad. Pero antes me equivoqué con las tuberías y me tiemblan las manos.»',
        encaja: 'apoyar',
        frases: [
          { estilo: 'dirigir', texto: 'Gira primero la válvula azul, luego la roja, despacio. Te superviso cada paso.', reaccion: 'Leo obedece, pero se encoge aún más: «…Ya lo sabía. Supongo que no confías en mí».' },
          { estilo: 'delegar', texto: 'Encárgate tú de las válvulas, confío en ti. Me voy a otra cosa.', reaccion: 'Leo se queda solo frente al panel, sin moverse. Necesitaba algo más que eso.' },
          { estilo: 'apoyar', texto: 'Sabes hacerlo, lo demostraste antes. ¿Cómo lo planteas tú? Estoy aquí si me necesitas.', reaccion: 'Leo respira hondo: «Vale… empiezo por la azul». Y lo hace.' },
          { estilo: 'entrenar', texto: 'Te vuelvo a explicar cómo funcionan las válvulas, paso a paso.', reaccion: '«Ya sé cómo funcionan…», murmura Leo. Sigue igual de bloqueado.' },
        ],
      },
      {
        personaje: 'reyes',
        tarea: 'Poner en marcha la bomba de achique',
        dice: '«¡Achicar agua! Perfecto, ¿empiezo ya?»',
        alPreguntar: '«Nunca he tocado esa bomba, la verdad. Pero tengo muchísimas ganas de ayudar.»',
        encaja: 'entrenar',
        frases: [
          { estilo: 'delegar', texto: 'Es toda tuya, Comandante. Seguro que te apañas.', reaccion: 'Reyes se lanza con entusiasmo… y la bomba se atasca a los dos minutos.' },
          { estilo: 'apoyar', texto: '¿Cómo crees que se maneja? Decídelo tú y te apoyo.', reaccion: '«¿Yo? Si no la he visto nunca…» Reyes prueba botones casi al azar.' },
          { estilo: 'entrenar', texto: 'Te enseño cómo funciona y por qué importa cada paso; luego lo haces tú y te corrijo.', reaccion: 'Reyes atiende como un alumno aplicado. Diez minutos después, la bomba ruge.' },
          { estilo: 'dirigir', texto: 'Pulsa el botón verde, espera diez segundos y baja la palanca. Nada más.', reaccion: 'Reyes lo hace, pero en cuanto la bomba cambia de ruido no sabe por qué y se atasca.' },
        ],
      },
      {
        personaje: 'aris',
        tarea: 'Cerrar a mano las compuertas del Sector C',
        dice: '«¿Las compuertas? Yo… vale.»',
        alPreguntar: '«No lo he hecho nunca, con la mano así me cuesta y estoy bastante agobiada. No sé ni por dónde empezar.»',
        encaja: 'dirigir',
        frases: [
          { estilo: 'apoyar', texto: '¿Tú cómo lo harías? Seguro que se te ocurre algo.', reaccion: '«¡No lo sé, por eso estoy así!» Aris se agobia todavía más.' },
          { estilo: 'dirigir', texto: 'Primero, la compuerta de la izquierda: tira de la palanca roja hasta el tope. Luego te digo el siguiente paso.', reaccion: 'Con instrucciones claras, Aris se calma: «Vale, eso puedo hacerlo». Paso a paso, las compuertas se cierran.' },
          { estilo: 'delegar', texto: 'Confío en ti: encárgate de las compuertas.', reaccion: 'Aris se queda paralizada delante de la palanca.' },
          { estilo: 'entrenar', texto: 'Te explico todo el sistema de compuertas para que entiendas cómo funciona.', reaccion: 'Aris intenta seguirte, pero tanta información de golpe la agobia más.' },
        ],
      },
    ],
  },
  {
    titulo: 'Segunda ronda · diez minutos después, todo ha cambiado',
    casos: [
      {
        personaje: 'leo',
        tarea: 'Revisar el resto de válvulas de la estación',
        dice: '«¡Ha funcionado! ¿Qué hago ahora?»',
        alPreguntar: '«Me siento genial. Las demás válvulas son iguales que la primera: puedo con ellas.»',
        encaja: 'delegar',
        frases: [
          { estilo: 'apoyar', texto: 'Muy bien, Leo. ¿Cómo lo planteas? Lo vemos juntos con calma.', reaccion: '«Eh… vale», dice Leo. Estaba listo para ir solo y la charla le hace perder el impulso.' },
          { estilo: 'dirigir', texto: 'Ahora la válvula 3, luego la 4. Me avisas después de cada una.', reaccion: 'A Leo se le apaga la sonrisa: «Pensaba que ya confiabas en mí».' },
          { estilo: 'delegar', texto: 'Son tuyas. Ya has demostrado que sabes. Avísame si surge algo raro.', reaccion: 'Leo se yergue: «¡A la orden!». Por primera vez parece un ingeniero de verdad.' },
          { estilo: 'entrenar', texto: 'Antes de seguir, te explico las diferencias entre las válvulas.', reaccion: '«No hay diferencias…», dice Leo, desanimado. Pierde el impulso que tenía.' },
        ],
      },
      {
        personaje: 'reyes',
        tarea: 'Mantener la bomba funcionando',
        dice: '«La bomba… bien. Más o menos.»',
        alPreguntar: '«Ya sé cómo va, pero hace un momento la atasqué y ahora no me fío de mí mismo.»',
        encaja: 'apoyar',
        frases: [
          { estilo: 'entrenar', texto: 'Repasamos otra vez desde el principio cómo funciona la bomba.', reaccion: '«Eso ya lo sé», gruñe Reyes. Lo que le falta no son instrucciones.' },
          { estilo: 'apoyar', texto: 'Un atasco le pasa a cualquiera. Sabes manejarla: ¿qué crees que falló? Lo pensamos juntos.', reaccion: 'Reyes sonríe a medias: «El filtro. Era el filtro». Lo limpia y la bomba vuelve a rugir.' },
          { estilo: 'delegar', texto: 'Ya sabes cómo va: sigue tú solo.', reaccion: 'Reyes vuelve a la bomba, pero duda en cada paso y va el doble de lento.' },
          { estilo: 'dirigir', texto: 'Apágala, limpia el filtro, enciéndela y no toques nada más.', reaccion: 'Reyes obedece en silencio. Funciona, pero se le nota tocado.' },
        ],
      },
      {
        personaje: 'aris',
        tarea: 'Sellar el resto de compuertas',
        dice: '«Vale, la primera ya está. ¿Y ahora?»',
        alPreguntar: '«Le estoy cogiendo el truco y tengo ganas de seguir, pero aún no entiendo bien por qué cada compuerta va en ese orden.»',
        encaja: 'entrenar',
        frases: [
          { estilo: 'dirigir', texto: 'Ahora la segunda palanca, luego la tercera. Yo te voy diciendo.', reaccion: 'Aris lo hace, pero se aburre: «¿Por qué en ese orden?». Sigue dependiendo de ti.' },
          { estilo: 'delegar', texto: 'Ya sabes hacerlo: encárgate tú del resto.', reaccion: 'Aris se lanza… y cierra una compuerta antes de tiempo. Hay que volver a abrirla.' },
          { estilo: 'entrenar', texto: 'Te explico por qué van en este orden y tú decides la siguiente; te digo si vas bien.', reaccion: '«¡Ah, por la presión!» Aris entiende el sistema y cierra las demás casi sin ayuda.' },
          { estilo: 'apoyar', texto: '¿Cómo te sientes? Tómate tu tiempo, lo decides tú.', reaccion: '«Me siento bien, pero no sé cuál va ahora…» Aris se queda esperando una pista.' },
        ],
      },
      {
        personaje: 'lisa',
        tarea: 'Activar el oxígeno de emergencia del batiscafo',
        dice: '«¿El sistema del batiscafo? Ah… vale.»',
        alPreguntar: '«No lo he usado nunca, llevo horas sin parar y estoy agotada. Ahora mismo no sabría ni dónde está el interruptor.»',
        encaja: 'dirigir',
        frases: [
          { estilo: 'delegar', texto: 'Es tuyo, como el invernadero. Seguro que lo sacas.', reaccion: 'Lisa abre el panel del batiscafo y se queda mirándolo, en blanco.' },
          { estilo: 'entrenar', texto: 'Te explico cómo funciona todo el sistema de soporte vital del batiscafo.', reaccion: 'Lisa intenta concentrarse, pero está tan cansada que se pierde a la mitad.' },
          { estilo: 'dirigir', texto: 'Interruptor azul de la izquierda, luego la rueda hasta el verde. Te digo cuándo parar.', reaccion: 'Con pasos cortos y claros, Lisa lo activa enseguida: «Gracias. Hoy no me daba la cabeza para más».' },
          { estilo: 'apoyar', texto: '¿Cómo lo enfocarías tú? Te escucho.', reaccion: '«No tengo ni idea…» Lisa se frota los ojos, agotada.' },
        ],
      },
    ],
  },
];

const PISTA_ESTILO = 'Fíjate en dos cosas: ¿sabe hacerlo? y ¿se siente capaz? Si no lo sabes, pregúntale cómo está.';

interface Estado {
  /** Estilos elegidos en orden. */
  elecciones: Estilo[];
  pregunto: boolean;
  /** Preguntó antes de su primera elección. */
  preguntoAntes: boolean;
  resuelto: boolean;
  ayuda: boolean;
}

const vacio = (): Estado => ({ elecciones: [], pregunto: false, preguntoAntes: false, resuelto: false, ayuda: false });

export default function Guiar({ onCompletar, registrar, inventario }: PropsMecanica) {
  const [ronda, setRonda] = useState(0);
  const [estados, setEstados] = useState<Estado[][]>(() => RONDAS.map((r) => r.casos.map(vacio)));
  const [activo, setActivo] = useState<number | null>(null);
  const [reaccion, setReaccion] = useState<{ caso: number; texto: string; ok: boolean } | null>(null);
  const [terminado, setTerminado] = useState(false);
  const recurso = useRef<string | null>(null);

  const casos = RONDAS[ronda].casos;
  const actuales = estados[ronda];
  const rondaCompleta = actuales.every((e) => e.resuelto);

  const actualizar = (i: number, cambio: (e: Estado) => Estado) =>
    setEstados((todos) => todos.map((r, ri) => (ri === ronda ? r.map((e, ci) => (ci === i ? cambio(e) : e)) : r)));

  const preguntar = (i: number) => {
    registrar('accion', { que: 'preguntar', ronda, persona: casos[i].personaje });
    actualizar(i, (e) => ({ ...e, pregunto: true, preguntoAntes: e.preguntoAntes || e.elecciones.length === 0 }));
  };

  const elegir = (i: number, frase: Frase) => {
    const caso = casos[i];
    const e = actuales[i];
    if (e.resuelto) return;
    const ok = frase.estilo === caso.encaja;
    registrar('accion', { que: 'estilo', ronda, persona: caso.personaje, estilo: frase.estilo, ok });
    if (ok) {
      sonido.exito();
      actualizar(i, (x) => ({ ...x, elecciones: [...x.elecciones, frase.estilo], resuelto: true }));
      setReaccion({ caso: i, texto: frase.reaccion, ok: true });
      setActivo(null);
      return;
    }
    sonido.aviso();
    const fallos = e.elecciones.length + 1;
    registrar('fallo', { firma: `${ronda}:${caso.personaje}:${frase.estilo}` });
    if (fallos >= INTENTOS_ANTES_DE_AYUDA) {
      // Tras 3 intentos, Reyes (o Lisa) indica qué necesita esa persona y la historia sigue.
      registrar('ayuda', { tipo: 'automatica' });
      const buena = caso.frases.find((f) => f.estilo === caso.encaja)!;
      actualizar(i, (x) => ({ ...x, elecciones: [...x.elecciones, frase.estilo], resuelto: true, ayuda: true }));
      setReaccion({ caso: i, texto: `${frase.reaccion} Al final pruebas otra cosa: «${buena.texto}». ${buena.reaccion}`, ok: true });
      setActivo(null);
      return;
    }
    if (fallos === 2) registrar('ayuda', { tipo: 'pista' });
    actualizar(i, (x) => ({ ...x, elecciones: [...x.elecciones, frase.estilo] }));
    setReaccion({ caso: i, texto: frase.reaccion, ok: false });
  };

  const siguienteRonda = () => {
    registrar('accion', { que: 'ronda', ronda: ronda + 1 });
    setRonda((r) => r + 1);
    setActivo(null);
    setReaccion(null);
  };

  const cerrar = () => {
    setTerminado(true);
    sonido.exito();
    const todos = estados.flat();
    const primeras = (r: number) => estados[r].map((e, i) => e.elecciones[0] === RONDAS[r].casos[i].encaja);
    const aciertoPrimero = [...primeras(0), ...primeras(1)];
    const ajuste = aciertoPrimero.filter(Boolean).length / aciertoPrimero.length;
    const flexibilidad = primeras(1).filter(Boolean).length / primeras(1).length;
    // ¿Repitió con alguien en la 2.ª ronda el estilo que le funcionó en la 1.ª?
    const estiloR1 = new Map(RONDAS[0].casos.map((c) => [c.personaje, c.encaja]));
    const repeticiones = RONDAS[1].casos.filter((c, i) => estados[1][i].elecciones[0] === estiloR1.get(c.personaje)).length;
    const conFallo = todos.filter((e) => e.elecciones.length >= 2);
    const corregidos = conFallo.filter((e) => e.elecciones.length === 2 && !e.ayuda).length;
    const preguntados = todos.filter((e) => e.preguntoAntes).length;
    const ayuda = todos.some((e) => e.ayuda);
    const fallos = todos.reduce((a, e) => a + e.elecciones.length - 1, 0);
    const usados = todos.flatMap((e) => e.elecciones.slice(0, 1));
    const directivos = usados.filter((s) => s === 'dirigir' || s === 'entrenar').length;

    const conductas: string[] = [];
    if (preguntados > 0) conductas.push('pregunto_equipo');
    if (flexibilidad >= 0.75) conductas.push('adapto_estilo');
    if (repeticiones > 0) conductas.push('repitio_estilo');
    if (fallos > 0) conductas.push('reintento');
    if (ayuda) conductas.push('ayuda_automatica');
    if (recurso.current) conductas.push('uso_objeto_alternativo');
    const clave = ajuste >= 0.75 ? 'situacional' : corregidos > 0 && corregidos >= conFallo.length / 2 ? 'adaptativo' : directivos >= usados.length / 2 ? 'directivo' : 'delegador';
    const indicadores: Record<string, number> = {
      gui_ajuste: ajuste,
      gui_flexibilidad: flexibilidad,
      gui_diagnostico: preguntados / todos.length,
    };
    if (conFallo.length) indicadores.gui_correccion = corregidos / conFallo.length;
    window.setTimeout(() => onCompletar({ clave, conductas, intentos: fallos, ayudaRecibida: ayuda, precision: Math.round(ajuste * 100), indicadores }), 900);
  };

  const usarObjeto = (id: string): string | null => {
    if ((id === 'linterna' || id === 'cuerda') && !recurso.current) {
      recurso.current = id;
      return id === 'linterna'
        ? 'Le das la linterna a Aris: las compuertas del Sector C están a oscuras y así verá bien las palancas.'
        : 'Le das la cuerda a Aris para que vaya asegurada por el pasillo inundado. Se le nota más tranquila.';
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">{RONDAS[ronda].titulo}</p>
        <p className="font-mono text-xs text-slate-400">
          {actuales.filter((e) => e.resuelto).length}/{casos.length} en marcha
        </p>
      </div>
      <p className="text-sm text-slate-300">Cada persona está en un momento distinto. Elige qué le dices a cada una para que su tarea salga adelante.</p>

      <ul className="grid gap-3">
        {casos.map((c, i) => {
          const e = actuales[i];
          const abierto = activo === i;
          return (
            <li key={`${ronda}-${c.personaje}`} className={`rounded-xl border p-3 ${e.resuelto ? 'border-emerald-400/30 bg-emerald-500/5' : abierto ? 'border-cyan-300/50 bg-slate-900/80' : 'border-slate-700 bg-slate-900/60'}`}>
              <div className="flex items-start gap-3">
                <Retrato personaje={c.personaje} tamano={44} expresion={e.resuelto ? 'contento' : e.elecciones.length ? 'preocupado' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">
                    {NOMBRE_PERSONAJE[c.personaje]} <span className="font-normal text-slate-400">· {c.tarea}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-200">{c.dice}</p>
                  {e.pregunto && <p className="mt-1 text-sm text-cyan-100">{c.alPreguntar}</p>}
                  {reaccion?.caso === i && <p role="status" className={`mt-2 rounded-lg px-3 py-2 text-sm ${reaccion.ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>{reaccion.texto}</p>}
                </div>
                {e.resuelto && <span className="text-emerald-300" aria-label="En marcha">✓</span>}
              </div>

              {!e.resuelto && !terminado && (
                <div className="mt-3 grid gap-2">
                  {!abierto ? (
                    <div className="flex flex-wrap gap-2">
                      <Boton onClick={() => setActivo(i)}>💬 Hablar con {NOMBRE_PERSONAJE[c.personaje]}</Boton>
                      {!e.pregunto && <Boton variante="fantasma" onClick={() => preguntar(i)}>¿Cómo estás?</Boton>}
                    </div>
                  ) : (
                    <>
                      {!e.pregunto && (
                        <button type="button" onClick={() => preguntar(i)} className="justify-self-start rounded-lg px-2 py-1 text-sm text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                          Antes, preguntarle cómo está
                        </button>
                      )}
                      <ul className="grid gap-2" aria-label={`Qué le dices a ${NOMBRE_PERSONAJE[c.personaje]}`}>
                        {c.frases.map((f) => {
                          const probada = e.elecciones.includes(f.estilo);
                          return (
                            <li key={f.estilo}>
                              <button
                                type="button"
                                onClick={() => elegir(i, f)}
                                disabled={probada}
                                className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-left text-sm text-slate-100 transition-colors hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:border-slate-800 disabled:text-slate-500 disabled:line-through"
                              >
                                «{f.texto}»
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {e.elecciones.length >= 2 && (
                        <Bocadillo personaje={c.personaje === 'reyes' ? 'lisa' : 'reyes'} expresion="pensativo">
                          {PISTA_ESTILO}
                        </Bocadillo>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {ronda === 0 && !rondaCompleta && <BarraInventario inventario={inventario} registrar={registrar} usar={usarObjeto} />}

      {rondaCompleta && !terminado && (
        <Boton variante="primario" onClick={ronda < RONDAS.length - 1 ? siguienteRonda : cerrar}>
          {ronda < RONDAS.length - 1 ? 'Diez minutos después… →' : 'El equipo lo ha conseguido ✓'}
        </Boton>
      )}
      {terminado && (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          La estación aguanta y el equipo trabaja coordinado.
        </p>
      )}
    </div>
  );
}
