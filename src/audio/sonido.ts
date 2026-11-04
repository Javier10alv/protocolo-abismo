// Efectos de sonido sintetizados con Web Audio (sin archivos). Suaves y nunca
// punitivos: el "aviso" de error es un tono grave corto, no un zumbido.

import { useAjustesStore } from '../store/useAjustesStore';

let ctx: AudioContext | null = null;
let ambiente: { detener: () => void } | null = null;

function contexto(): AudioContext | null {
  if (!useAjustesStore.getState().sonido) return null;
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tono(frecuencia: number, duracion: number, opciones: { tipo?: OscillatorType; volumen?: number; retardo?: number; deslizarA?: number } = {}) {
  const c = contexto();
  if (!c) return;
  const { tipo = 'sine', volumen = 0.12, retardo = 0, deslizarA } = opciones;
  const t0 = c.currentTime + retardo;
  const osc = c.createOscillator();
  const gan = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, t0);
  if (deslizarA) osc.frequency.exponentialRampToValueAtTime(deslizarA, t0 + duracion);
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + 0.015);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
  osc.connect(gan).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duracion + 0.05);
}

export const sonido = {
  click: () => tono(660, 0.07, { tipo: 'triangle', volumen: 0.06 }),
  seleccion: () => tono(520, 0.1, { tipo: 'sine', volumen: 0.08, deslizarA: 780 }),
  exito: () => {
    tono(523, 0.18, { volumen: 0.1 });
    tono(659, 0.18, { volumen: 0.1, retardo: 0.1 });
    tono(784, 0.35, { volumen: 0.1, retardo: 0.2 });
  },
  aviso: () => tono(220, 0.25, { tipo: 'triangle', volumen: 0.08, deslizarA: 180 }),
  /** Ping de sonar; `intensidad` 0–1 modula el eco. */
  ping: (intensidad = 0.5) => {
    tono(1200, 0.6, { volumen: 0.09, deslizarA: 900 });
    if (intensidad > 0) tono(1200, 0.5, { volumen: 0.03 + intensidad * 0.07, retardo: 0.35 - intensidad * 0.2, deslizarA: 950 });
  },
  burbujas: () => {
    for (let i = 0; i < 4; i++) tono(300 + Math.random() * 500, 0.08, { volumen: 0.03, retardo: i * 0.06, deslizarA: 900 });
  },
  /** Zumbido ambiental grave con un filtro que respira lentamente. */
  iniciarAmbiente: () => {
    const c = contexto();
    if (!c || ambiente) return;
    const gan = c.createGain();
    gan.gain.value = 0;
    gan.gain.linearRampToValueAtTime(0.035, c.currentTime + 3);
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 220;
    const lfo = c.createOscillator();
    const lfoGan = c.createGain();
    lfo.frequency.value = 0.07;
    lfoGan.gain.value = 120;
    lfo.connect(lfoGan).connect(filtro.frequency);
    const oscs = [55, 82.4, 110.3].map((f) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(filtro);
      o.start();
      return o;
    });
    filtro.connect(gan).connect(c.destination);
    lfo.start();
    ambiente = {
      detener: () => {
        const t = c.currentTime;
        gan.gain.cancelScheduledValues(t);
        gan.gain.setValueAtTime(gan.gain.value, t);
        gan.gain.linearRampToValueAtTime(0, t + 0.6);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
          lfo.stop();
        }, 700);
      },
    };
  },
  detenerAmbiente: () => {
    ambiente?.detener();
    ambiente = null;
  },
};

// Si el alumno silencia el juego, el ambiente se detiene al momento.
useAjustesStore.subscribe((s, prev) => {
  if (prev.sonido && !s.sonido) sonido.detenerAmbiente();
});
