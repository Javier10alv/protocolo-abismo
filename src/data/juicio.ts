// Preguntas breves de juicio situacional (SJT) que aparecen al terminar cada reto
// del hub. Cada una apunta a una habilidad distinta de la del propio reto, para
// tener una segunda fuente de evidencia. Las opciones tienen un valor de
// efectividad (0–1) fijado por criterio experto; el alumno nunca lo ve.

import type { Habilidad, Mecanica, Personaje } from '../types/game';

export interface PreguntaJuicio {
  habilidad: Habilidad;
  personaje: Personaje;
  pregunta: string;
  opciones: { texto: string; valor: number }[];
}

export const JUICIO: Partial<Record<Mecanica, PreguntaJuicio>> = {
  tuberias: {
    habilidad: 'comunicacion',
    personaje: 'lisa',
    pregunta: 'Leo se ha quedado callado después de la reparación y parece agobiado. ¿Qué haces?',
    opciones: [
      { texto: 'Le doy instrucciones de lo siguiente que hay que hacer.', valor: 0.35 },
      { texto: 'Le pregunto cómo está y le escucho.', valor: 1 },
      { texto: 'Espero a que hable él cuando quiera.', valor: 0.25 },
      { texto: 'Le digo que no pasa nada y sigo con lo mío.', valor: 0.5 },
    ],
  },
  especie: {
    habilidad: 'liderazgo',
    personaje: 'lisa',
    pregunta: 'El equipo no se pone de acuerdo sobre qué hacer con la criatura. ¿Qué propones?',
    opciones: [
      { texto: 'Decido yo rápido para no perder tiempo.', valor: 0.45 },
      { texto: 'Esperamos a ver qué pasa.', valor: 0.1 },
      { texto: 'Pongo en común lo que sabemos, acordamos un criterio y decidimos juntos.', valor: 1 },
      { texto: 'Que decida Lisa, que es la experta.', valor: 0.6 },
    ],
  },
  evacuacion: {
    habilidad: 'resiliencia',
    personaje: 'reyes',
    pregunta: 'Un compañero te dice que una parte de tu plan ha salido mal. ¿Cómo reaccionas?',
    opciones: [
      { texto: 'Me frustro, pero sigo adelante como estaba.', valor: 0.45 },
      { texto: 'Analizo qué ha fallado y ajusto el plan.', valor: 1 },
      { texto: 'Le pido a otra persona que lo rehaga.', valor: 0.4 },
      { texto: 'Le explico que la culpa fue de las circunstancias.', valor: 0.15 },
    ],
  },
  sos: {
    habilidad: 'logica',
    personaje: 'reyes',
    pregunta: 'La superficie os envía dos datos que se contradicen sobre la hora del rescate. ¿Qué haces?',
    opciones: [
      { texto: 'Me fío del más reciente.', valor: 0.4 },
      { texto: 'Hago caso al que suena más urgente.', valor: 0.25 },
      { texto: 'Compruebo de dónde viene cada uno y pido confirmación.', valor: 1 },
      { texto: 'Los ignoro los dos.', valor: 0.1 },
    ],
  },
  ondas: {
    habilidad: 'creatividad',
    personaje: 'aris',
    pregunta: 'La herramienta que necesitas para una reparación está rota. ¿Qué haces?',
    opciones: [
      { texto: 'Intento repararla una y otra vez de la misma forma.', valor: 0.3 },
      { texto: 'Pregunto al equipo qué harían ellos.', valor: 0.6 },
      { texto: 'Espero a que llegue una nueva.', valor: 0.15 },
      { texto: 'Busco otro objeto que pueda hacer la misma función.', valor: 1 },
    ],
  },
};
