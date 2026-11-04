// Genera las ilustraciones vectoriales de las escenas en public/img/*.svg.
// Son fondos estilizados (flat, sci-fi submarino) pensados para quedar por detrás
// de la caja de diálogo: el contenido importante va en la mitad superior.
//
// Uso: npx tsx scripts/generar-fondos.ts

import { writeFileSync } from 'node:fs';
import { crearAzar } from '../src/logica/simulacion';

const W = 1600;
const H = 1000;

function base(id: string, arriba: string, abajo: string, cuerpo: string, semilla: number, acento = '#22d3ee'): string {
  const azar = crearAzar(semilla);
  const particulas = Array.from({ length: 60 }, () => {
    const x = (azar() * W).toFixed(0);
    const y = (azar() * H).toFixed(0);
    const r = (0.8 + azar() * 2.4).toFixed(1);
    const o = (0.15 + azar() * 0.45).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#a5f3fc" opacity="${o}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${arriba}"/><stop offset="1" stop-color="${abajo}"/></linearGradient>
<radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${acento}" stop-opacity="0.55"/><stop offset="1" stop-color="${acento}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-red" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#f87171" stop-opacity="0.7"/><stop offset="1" stop-color="#f87171" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
<linearGradient id="${id}-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9" stop-opacity="0.18"/><stop offset="1" stop-color="#67e8f9" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
${cuerpo}
<g>${particulas}</g>
<rect width="${W}" height="${H}" fill="url(#${id}-bg)" opacity="0.15"/>
</svg>
`;
}

/** Paredes de un pasillo/sala en perspectiva con remaches. */
function sala(id: string, puntoFuga = 800): string {
  const remaches = Array.from({ length: 10 }, (_, i) => {
    const y = 120 + i * 70;
    return `<circle cx="70" cy="${y}" r="5" fill="#475569"/><circle cx="${W - 70}" cy="${y}" r="5" fill="#475569"/>`;
  }).join('');
  return `<polygon points="0,0 ${puntoFuga - 260},280 ${puntoFuga - 260},640 0,${H}" fill="url(#${id}-metal)" opacity="0.9"/>
<polygon points="${W},0 ${puntoFuga + 260},280 ${puntoFuga + 260},640 ${W},${H}" fill="url(#${id}-metal)" opacity="0.9"/>
<polygon points="0,0 ${W},0 ${puntoFuga + 260},280 ${puntoFuga - 260},280" fill="#0b1324"/>
<rect x="${puntoFuga - 260}" y="280" width="520" height="360" fill="#0a1222"/>
${Array.from({ length: 6 }, (_, i) => `<line x1="${puntoFuga - 260}" y1="${300 + i * 60}" x2="0" y2="${60 + i * 190}" stroke="#1e293b" stroke-width="4"/><line x1="${puntoFuga + 260}" y1="${300 + i * 60}" x2="${W}" y2="${60 + i * 190}" stroke="#1e293b" stroke-width="4"/>`).join('')}
${remaches}`;
}

function luzEmergencia(id: string, x: number, y: number, r = 180): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}-red)"/><rect x="${x - 22}" y="${y - 10}" width="44" height="20" rx="6" fill="#ef4444"/>`;
}

function silueta(x: number, y: number, escala: number, color: string, casco = '#22d3ee'): string {
  return `<g transform="translate(${x} ${y}) scale(${escala})">
<ellipse cx="0" cy="-150" rx="38" ry="42" fill="${color}"/>
<path d="M-38 -165 a38 38 0 0 1 76 0" fill="none" stroke="${casco}" stroke-width="6" opacity="0.8"/>
<path d="M-60 -100 q60 -30 120 0 l10 130 h-140 z" fill="${color}"/>
<rect x="-50" y="30" width="38" height="120" rx="12" fill="${color}"/>
<rect x="12" y="30" width="38" height="120" rx="12" fill="${color}"/>
</g>`;
}

const fondos: Record<string, string> = {
  esc_01_despertar: base('a', '#0b1530', '#020617', `
${sala('a')}
<circle cx="800" cy="440" r="150" fill="#06243a" stroke="#64748b" stroke-width="18"/>
<circle cx="800" cy="440" r="150" fill="url(#a-glow)" opacity="0.6"/>
<path d="M690 520 q40 -50 90 -10 q50 -60 120 10" fill="none" stroke="#155e75" stroke-width="10"/>
<g transform="translate(250 330)"><rect width="200" height="260" rx="14" fill="#111c33" stroke="#334155" stroke-width="6"/>
${Array.from({ length: 6 }, (_, i) => `<rect x="30" y="${30 + i * 36}" width="${60 + ((i * 37) % 80)}" height="14" rx="4" fill="${i % 3 === 0 ? '#f87171' : '#22d3ee'}" opacity="0.8"/>`).join('')}
<circle cx="160" cy="220" r="14" fill="#facc15"/></g>
<g transform="translate(1150 380)"><rect width="260" height="70" rx="10" fill="#1e293b"/><rect x="20" y="70" width="18" height="160" fill="#1e293b"/><rect x="222" y="70" width="18" height="160" fill="#1e293b"/>
<rect x="40" y="-60" width="50" height="60" rx="6" fill="#0e7490" opacity="0.8"/><rect x="120" y="-40" width="30" height="40" rx="6" fill="#a5f3fc" opacity="0.5"/></g>
${luzEmergencia('a', 800, 70, 260)}${luzEmergencia('a', 180, 120)}${luzEmergencia('a', 1420, 120)}`, 1),

  esc_02_puerta: base('b', '#0b1530', '#020617', `
${sala('b')}
<rect x="600" y="250" width="400" height="420" rx="20" fill="#1e293b" stroke="#475569" stroke-width="10"/>
<rect x="790" y="250" width="20" height="420" fill="#0f172a"/>
<path d="M600 460 h400" stroke="#facc15" stroke-width="12" stroke-dasharray="40 30" opacity="0.6"/>
<g transform="translate(1080 300)"><rect width="230" height="300" rx="14" fill="#0f172a" stroke="#22d3ee" stroke-width="4" opacity="0.95"/>
${['#ef4444', '#3b82f6', '#22c55e', '#eab308'].map((c, i) => `<path d="M40 ${60 + i * 60} q60 ${i % 2 ? 50 : -30} 80 ${80 - i * 10}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/><circle cx="190" cy="${60 + i * 60}" r="12" fill="#334155" stroke="#94a3b8" stroke-width="3"/>`).join('')}
</g>
<circle cx="1200" cy="300" r="160" fill="url(#b-glow)" opacity="0.5"/>
${luzEmergencia('b', 800, 200, 220)}`, 2),

  esc_03_pasillo: base('c', '#0a1a33', '#03101f', `
${sala('c')}
<rect x="0" y="640" width="${W}" height="360" fill="#0c4a6e" opacity="0.55"/>
${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 220 - 40} ${680 + (i % 3) * 30} q55 -18 110 0 t110 0" fill="none" stroke="#67e8f9" stroke-width="4" opacity="0.35"/>`).join('')}
<g transform="rotate(-12 420 640)"><rect x="330" y="580" width="180" height="90" rx="8" fill="#475569"/><rect x="345" y="595" width="70" height="12" fill="#1e293b"/></g>
<g transform="rotate(9 1180 660)"><rect x="1090" y="610" width="200" height="90" rx="8" fill="#475569"/><rect x="1105" y="625" width="70" height="12" fill="#1e293b"/></g>
${silueta(650, 520, 1.15, '#1e3a5f', '#f59e0b')}${silueta(930, 540, 1, '#1f3b4d')}
${luzEmergencia('c', 800, 60, 240)}
<polygon points="700,0 900,0 1100,700 500,700" fill="url(#c-ray)"/>`, 3),

  esc_04_taller: base('d', '#0b1a2e', '#020617', `
${sala('d')}
${[0, 1, 2].map((f) => `<rect x="120" y="${260 + f * 150}" width="460" height="16" fill="#475569"/><rect x="1020" y="${260 + f * 150}" width="460" height="16" fill="#475569"/>`).join('')}
<g fill="#b45309"><circle cx="220" cy="225" r="34" fill="none" stroke="#d97706" stroke-width="12"/><circle cx="220" cy="225" r="18" fill="none" stroke="#d97706" stroke-width="8"/></g>
<rect x="320" y="190" width="60" height="70" rx="10" fill="#64748b"/>
<rect x="430" y="200" width="110" height="60" rx="8" fill="#0e7490"/>
<rect x="160" y="350" width="80" height="60" rx="30" fill="#94a3b8"/>
<rect x="1060" y="200" width="200" height="22" rx="11" fill="#64748b"/>
<rect x="1300" y="180" width="70" height="80" rx="8" fill="#1d4ed8" opacity="0.8"/>
<rect x="1080" y="340" width="90" height="70" rx="12" fill="#f59e0b" opacity="0.7"/>
<rect x="1220" y="350" width="160" height="60" rx="8" fill="#334155"/>
<rect x="640" y="520" width="320" height="140" rx="12" fill="#1e293b" stroke="#22d3ee" stroke-width="3" opacity="0.9"/>
<circle cx="800" cy="440" r="220" fill="url(#d-glow)" opacity="0.35"/>
<rect x="760" y="60" width="80" height="24" rx="6" fill="#fde68a"/><polygon points="760,84 840,84 1000,700 600,700" fill="#fde68a" opacity="0.06"/>`, 4),

  esc_05_hangar: base('e', '#030b18', '#01040b', `
<rect x="0" y="700" width="${W}" height="300" fill="#06121f"/>
${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 140}" y1="0" x2="${i * 140 + 80}" y2="700" stroke="#0f1d33" stroke-width="10"/>`).join('')}
${[[200, 560, 160, 140], [420, 600, 120, 100], [1180, 540, 200, 160], [1400, 610, 120, 90], [880, 620, 140, 80]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f1b2d" stroke="#1e3a5f" stroke-width="4"/><line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" stroke="#1e3a5f" stroke-width="3"/>`).join('')}
${[1, 2, 3, 4, 5].map((i) => `<circle cx="760" cy="520" r="${i * 110}" fill="none" stroke="#22c55e" stroke-width="${5 - i * 0.7}" opacity="${0.55 - i * 0.09}"/>`).join('')}
<path d="M760 520 L1300 260 A600 600 0 0 1 1340 420 Z" fill="#22c55e" opacity="0.12"/>
<ellipse cx="1050" cy="430" rx="60" ry="26" fill="#facc15" opacity="0.25"/>`, 5, '#22c55e'),

  esc_06_radio: base('f', '#05172a', '#020617', `
${sala('f')}
${[0, 1, 2].map((i) => `<g transform="translate(${470 + i * 230} 300)"><rect width="200" height="140" rx="10" fill="#052e2b" stroke="#14b8a6" stroke-width="5"/>
<path d="M15 ${70 + (i - 1) * 10} ${Array.from({ length: 17 }, (_, k) => `L${15 + k * 10.6} ${70 + Math.sin(k * (1.3 + i)) * (18 + i * 10)}`).join(' ')}" fill="none" stroke="#5eead4" stroke-width="4"/></g>`).join('')}
<rect x="420" y="480" width="760" height="40" rx="8" fill="#1e293b"/>
<rect x="770" y="420" width="16" height="60" fill="#64748b"/><circle cx="778" cy="410" r="22" fill="#334155" stroke="#94a3b8" stroke-width="4"/>
<path d="M560 520 v-50 q0 -40 50 -40 q50 0 50 40 v50" fill="none" stroke="#475569" stroke-width="12"/>
<circle cx="800" cy="370" r="320" fill="url(#f-glow)" opacity="0.35"/>`, 6, '#14b8a6'),

  esc_07_generador: base('g', '#0a1530', '#020617', `
${sala('g')}
<rect x="590" y="240" width="420" height="440" rx="40" fill="#1e293b" stroke="#475569" stroke-width="10"/>
<circle cx="800" cy="440" r="140" fill="#0f172a" stroke="#22d3ee" stroke-width="10"/>
<circle cx="800" cy="440" r="60" fill="#0e7490" opacity="0.7"/>
${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<line x1="${800 + Math.cos(a) * 70}" y1="${440 + Math.sin(a) * 70}" x2="${800 + Math.cos(a) * 130}" y2="${440 + Math.sin(a) * 130}" stroke="#22d3ee" stroke-width="8" opacity="0.6"/>`; }).join('')}
<circle cx="800" cy="440" r="300" fill="url(#g-glow)" opacity="0.5"/>
<path d="M1010 330 l60 -20 l-25 40 l55 -10" fill="none" stroke="#fde047" stroke-width="6"/>
<g transform="translate(160 560)"><rect width="320" height="20" fill="#475569"/><rect x="40" y="-60" width="110" height="70" rx="4" fill="#e2e8f0" transform="rotate(-8 95 -25)"/><rect x="170" y="-55" width="110" height="70" rx="4" fill="#cbd5e1" transform="rotate(6 225 -20)"/></g>
<rect x="1150" y="260" width="300" height="200" rx="10" fill="#1f2937" stroke="#64748b" stroke-width="6"/>
${[0, 1, 2, 3].map((i) => `<line x1="1180" y1="${300 + i * 40}" x2="${1300 + (i % 2) * 100}" y2="${300 + i * 40}" stroke="#f8fafc" stroke-width="6" opacity="0.55" stroke-linecap="round"/>`).join('')}`, 7),

  esc_09_energia: base('h', '#071433', '#020617', `
${sala('h')}
<rect x="430" y="270" width="740" height="360" rx="24" fill="#0f172a" stroke="#334155" stroke-width="8"/>
${['#38bdf8', '#facc15', '#a78bfa', '#f97316'].map((c, i) => `<rect x="${500 + i * 165}" y="320" width="90" height="260" rx="12" fill="#1e293b"/><rect x="${500 + i * 165}" y="${560 - (80 + i * 40)}" width="90" height="${100 + i * 40}" rx="12" fill="${c}" opacity="0.75"/>`).join('')}
<circle cx="800" cy="450" r="380" fill="url(#h-glow)" opacity="0.3"/>
<circle cx="1400" cy="420" r="110" fill="#0b1324" stroke="#64748b" stroke-width="16"/><circle cx="1400" cy="420" r="70" fill="none" stroke="#475569" stroke-width="6"/>`, 9),

  esc_10_capsula: base('i', '#0e3a5c', '#01060f', `
<rect width="${W}" height="${H}" fill="#04111f"/>
<circle cx="800" cy="440" r="330" fill="#0b4a6f"/>
<circle cx="800" cy="440" r="330" fill="none" stroke="#475569" stroke-width="40"/>
${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<circle cx="${800 + Math.cos(a) * 330}" cy="${440 + Math.sin(a) * 330}" r="9" fill="#94a3b8"/>`; }).join('')}
<polygon points="620,120 980,120 1060,760 540,760" fill="url(#i-ray)" opacity="0.9"/>
${[[700, 610, 10], [780, 650, 7], [860, 620, 12], [820, 700, 5], [740, 690, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fbbf24"/><circle cx="${x}" cy="${y}" r="${r * 4}" fill="#fbbf24" opacity="0.12"/>`).join('')}
${Array.from({ length: 14 }, (_, i) => `<circle cx="${620 + ((i * 97) % 360)}" cy="${560 - i * 30}" r="${4 + (i % 4) * 2}" fill="none" stroke="#a5f3fc" stroke-width="2" opacity="0.6"/>`).join('')}
<rect x="0" y="0" width="${W}" height="${H}" fill="none"/>`, 10, '#38bdf8'),
};

for (const [nombre, svg] of Object.entries(fondos)) {
  const ruta = new URL(`../public/img/${nombre}.svg`, import.meta.url);
  writeFileSync(ruta, svg.replace(/\n\s*/g, '\n'));
  console.log(`✓ public/img/${nombre}.svg`);
}
