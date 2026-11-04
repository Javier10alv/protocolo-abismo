import { useEffect, useRef, useState } from 'react';
import { sonido } from '../audio/sonido';
import { Bocadillo, Boton } from '../components/ui';
import type { Expresion } from '../components/Retrato';
import type { PropsMecanica } from './tipos';

type Estilo = 'escucha' | 'plan' | 'ingenio';

interface Turno {
  respuestas: Record<Estilo, string>;
  reacciones: Record<Estilo, string>;
  /** Orden en que se muestran (para que el estilo no dependa de la posición). */
  orden: Estilo[];
}

const APERTURA = 'No puedo… el agua sigue subiendo. ¿Y si se rompe otra pared?';

const TURNOS: Turno[] = [
  {
    orden: ['plan', 'ingenio', 'escucha'],
    respuestas: {
      escucha: 'Es normal tener miedo. ¿Qué es lo que más te preocupa?',
      plan: 'Te entiendo. Irene ha revisado la presión: tenemos tiempo si vamos juntos.',
      ingenio: 'Mira el lado bueno: nunca habías tenido una piscina en el pasillo.',
    },
    reacciones: {
      escucha: 'Que me quede atascado y no sepa qué hacer. Siempre me bloqueo.',
      plan: '¿De verdad hay tiempo? Vale… pero no sé qué podría hacer yo.',
      ingenio: 'Ja… una piscina. Muy gracioso. Pero sigo sin querer meterme.',
    },
  },
  {
    orden: ['escucha', 'plan', 'ingenio'],
    respuestas: {
      escucha: 'Bloquearse le pasa a todo el mundo. Voy a estar a tu lado todo el rato.',
      plan: 'Te propongo algo: tú llevas el sonar y vas detrás de mí. Paso a paso.',
      ingenio: '¿Y si inventamos una contraseña? Si te bloqueas, dices «pulpo» y paramos.',
    },
    reacciones: {
      escucha: 'Gracias… nadie me había dicho eso hoy.',
      plan: 'El sonar… sí, eso sé usarlo. Lo practiqué en la formación.',
      ingenio: '¿«Pulpo»? Es tan absurdo que me ha calmado un poco.',
    },
  },
  {
    orden: ['ingenio', 'escucha', 'plan'],
    respuestas: {
      escucha: 'Tómate un minuto. Cuando estés listo, me lo dices.',
      plan: 'Contamos hasta tres y nos levantamos. Uno, dos…',
      ingenio: 'Cuando salgamos de aquí, vas a contar esta historia en todas partes.',
    },
    reacciones: {
      escucha: 'Vale. Ya estoy. Vamos.',
      plan: '…¡Tres! Venga, vamos.',
      ingenio: 'Si salgo de esta, la cuento con efectos especiales.',
    },
  },
];

const EXPRESION_POR_TURNO: Expresion[] = ['preocupado', 'pensativo', 'contento'];

interface Linea {
  quien: 'leo' | 'tu';
  texto: string;
  expresion?: Expresion;
}

export default function Conversacion({ onCompletar }: PropsMecanica) {
  const [lineas, setLineas] = useState<Linea[]>([{ quien: 'leo', texto: APERTURA, expresion: 'preocupado' }]);
  const [turno, setTurno] = useState(0);
  const [elecciones, setElecciones] = useState<Estilo[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lineas, escribiendo]);

  const responder = (estilo: Estilo) => {
    const t = TURNOS[turno];
    sonido.seleccion();
    const nuevas = [...elecciones, estilo];
    setElecciones(nuevas);
    setLineas((l) => [...l, { quien: 'tu', texto: t.respuestas[estilo] }]);
    setEscribiendo(true);

    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        setEscribiendo(false);
        sonido.burbujas();
        setLineas((l) => [...l, { quien: 'leo', texto: t.reacciones[estilo], expresion: EXPRESION_POR_TURNO[Math.min(turno + 1, 2)] }]);
        setTurno(turno + 1);
        if (turno + 1 >= TURNOS.length) {
          // Estilo dominante; si hay empate, gana el más reciente de los empatados.
          const cuenta = (e: Estilo) => nuevas.filter((x) => x === e).length;
          const max = Math.max(cuenta('escucha'), cuenta('plan'), cuenta('ingenio'));
          const empatados = (['escucha', 'plan', 'ingenio'] as Estilo[]).filter((e) => cuenta(e) === max);
          const clave = [...nuevas].reverse().find((e) => empatados.includes(e)) ?? nuevas[nuevas.length - 1];
          const conductas = [...new Set(nuevas)].map((e) => `estilo_${e}`);
          window.setTimeout(() => onCompletar({ clave, conductas, intentos: 0, ayudaRecibida: false }), 1400);
        }
      },
      reducido ? 200 : 1100,
    );
  };

  const terminado = turno >= TURNOS.length;
  const actual = TURNOS[turno];

  return (
    <div className="grid gap-4">
      <div className="grid max-h-[42dvh] gap-3 overflow-y-auto pr-1" role="log" aria-label="Conversación con Leo">
        {lineas.map((l, i) =>
          l.quien === 'leo' ? (
            <Bocadillo key={i} personaje="leo" expresion={l.expresion}>
              {l.texto}
            </Bocadillo>
          ) : (
            <div key={i} className="flex justify-end motion-safe:animate-[aparecer_250ms_ease-out]">
              <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-cyan-500/25 px-4 py-2.5 text-white">
                <span className="sr-only">Tú: </span>
                {l.texto}
              </p>
            </div>
          ),
        )}
        {escribiendo && (
          <p className="flex items-center gap-1 pl-14 text-sm text-slate-400" aria-label="Leo está escribiendo">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-slate-400 motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </p>
        )}
        <div ref={finRef} />
      </div>

      {!terminado && !escribiendo && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm text-slate-400">¿Qué le dices?</legend>
          {actual.orden.map((estilo) => (
            <Boton key={estilo} className="justify-start text-left" onClick={() => responder(estilo)} silencioso>
              «{actual.respuestas[estilo]}»
            </Boton>
          ))}
        </fieldset>
      )}
    </div>
  );
}
