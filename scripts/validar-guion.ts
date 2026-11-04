// Valida el guion: estructura, regla de 3 puntos, ids, alcanzabilidad, que todo
// camino termine en FIN, coherencia con el registro de mecánicas, imágenes y
// que las partidas simuladas cumplan el JSON Schema del estado.
//
// Uso: npm run validar

import { existsSync, readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { ESCENA_INICIAL, eleccionesDe, escenas, escenasPorId } from '../src/data/guion';
import { maximoPorEscena, maximosAlcanzables } from '../src/logica/puntuacion';
import { crearAzar, simularPartida } from '../src/logica/simulacion';
import { MECANICAS_INFO } from '../src/mecanicas/registro';
import { FIN, HABILIDADES, MECANICAS, type Habilidad, type Habilidades } from '../src/types/game';

const errores: string[] = [];
const avisos: string[] = [];
const error = (m: string) => errores.push(m);

const RE_ESCENA = /^esc_\d{2}_[a-z]+$/;
const RE_OPCION = /^esc_(\d{2})_[a-z]+$/;

// --- Estructura e ids -------------------------------------------------------
const idsElecciones = new Set<string>();
for (const e of escenas) {
  if (!RE_ESCENA.test(e.id)) error(`${e.id}: el id no sigue el patrón esc_NN_nombre`);
  for (const campo of ['titulo', 'imagen', 'altImagen', 'textoNarrativo'] as const) {
    if (typeof e[campo] !== 'string' || !e[campo].trim()) error(`${e.id}: falta "${campo}"`);
  }
  if (e.textoNarrativo.length > 280) avisos.push(`${e.id}: textoNarrativo largo (${e.textoNarrativo.length} car.); máx. ~3 líneas`);
  if (!existsSync(new URL(`../public${e.imagen}`, import.meta.url))) error(`${e.id}: no existe la imagen public${e.imagen}`);
  const existe = (ruta: string) => existsSync(new URL(`../public${ruta}`, import.meta.url));
  for (const p of e.personajes ?? []) {
    if (!['lisa', 'leo', 'reyes', 'aris'].includes(p)) error(`${e.id}: personaje desconocido "${p}"`);
    else if ((p === 'lisa' || p === 'leo') && !existe(`/img/personajes/${p}.webp`)) error(`${e.id}: falta el sprite de ${p}`);
  }
  if (e.cinematica) {
    if (!existe(e.cinematica.src)) error(`${e.id}: no existe el vídeo public${e.cinematica.src}`);
    if (!e.cinematica.descripcion?.trim()) error(`${e.id}: la cinemática necesita "descripcion" (accesibilidad)`);
    let anterior = 0;
    for (const sub of e.cinematica.subtitulos ?? []) {
      if (!(sub.desde >= anterior && sub.hasta > sub.desde)) error(`${e.id}: subtítulo fuera de orden o con tiempos no válidos: "${sub.texto}"`);
      anterior = sub.hasta;
    }
  }
  if (e.fondoVideo) {
    if (!existe(e.fondoVideo.src)) error(`${e.id}: no existe el vídeo de fondo public${e.fondoVideo.src}`);
    if (!(e.fondoVideo.bucleDesde >= 0)) error(`${e.id}: fondoVideo.bucleDesde no válido`);
  }

  if (e.tipo === 'decision') {
    // 3 opciones; las bifurcaciones hacia minijuegos pueden tener hasta 5 (una por habilidad).
    if (e.opciones.length < 3 || e.opciones.length > 5) error(`${e.id}: debe tener entre 3 y 5 opciones (tiene ${e.opciones.length})`);
  } else if (e.tipo === 'minijuego') {
    if (!MECANICAS.includes(e.mecanica)) error(`${e.id}: mecánica desconocida "${e.mecanica}"`);
    else {
      const esperadas = [...MECANICAS_INFO[e.mecanica].claves].sort();
      const guion = e.resultados.map((r) => r.clave).sort();
      if (JSON.stringify(esperadas) !== JSON.stringify(guion)) {
        error(`${e.id}: las claves de resultados [${guion}] no coinciden con la mecánica "${e.mecanica}" [${esperadas}]`);
      }
    }
    if (!e.instruccion?.trim()) error(`${e.id}: falta "instruccion"`);
  } else {
    error(`${(e as { id: string }).id}: tipo desconocido`);
    continue;
  }

  const nn = e.id.slice(4, 6);
  for (const x of eleccionesDe(e)) {
    const m = RE_OPCION.exec(x.id);
    if (!m || m[1] !== nn) error(`${e.id}: id "${x.id}" no sigue el patrón esc_${nn}_xxx`);
    if (idsElecciones.has(x.id)) error(`id duplicado: ${x.id}`);
    idsElecciones.add(x.id);

    // Regla de 3 puntos: 2 a una principal y 1 a una secundaria.
    const valores = Object.entries(x.modificadores);
    for (const [h] of valores) if (!HABILIDADES.includes(h as Habilidad)) error(`${x.id}: habilidad desconocida "${h}"`);
    const puntos = valores.map(([, v]) => v).sort();
    if (JSON.stringify(puntos) !== JSON.stringify([1, 2])) {
      error(`${x.id}: debe sumar 2 a una habilidad y 1 a otra (tiene ${JSON.stringify(x.modificadores)})`);
    }
    if (x.siguienteEscena !== FIN && !escenasPorId.has(x.siguienteEscena)) {
      error(`${x.id}: siguienteEscena "${x.siguienteEscena}" no existe`);
    }
  }
}
if (escenasPorId.size !== escenas.length) error('Hay ids de escena duplicados');

// --- Alcanzabilidad y caminos -------------------------------------------------
const alcanzables = new Set<string>();
const pila = [ESCENA_INICIAL];
while (pila.length) {
  const id = pila.pop()!;
  if (alcanzables.has(id)) continue;
  alcanzables.add(id);
  const e = escenasPorId.get(id);
  if (e) for (const x of eleccionesDe(e)) if (x.siguienteEscena !== FIN) pila.push(x.siguienteEscena);
}
for (const e of escenas) if (!alcanzables.has(e.id)) error(`${e.id}: escena inalcanzable`);

// Enumera todos los caminos (el grafo debe ser acíclico) y calcula máximos por camino.
const caminos: string[][] = [];
function recorrer(id: string, camino: string[]) {
  if (camino.includes(id)) {
    error(`Ciclo detectado: ${[...camino, id].join(' → ')}`);
    return;
  }
  const e = escenasPorId.get(id);
  if (!e) return;
  const siguientes = new Set(eleccionesDe(e).map((x) => x.siguienteEscena));
  for (const s of siguientes) {
    if (s === FIN) caminos.push([...camino, id]);
    else recorrer(s, [...camino, id]);
  }
}
recorrer(ESCENA_INICIAL, []);
if (caminos.length === 0) error('Ningún camino llega a FIN');

// Cada habilidad debe poder puntuar en todos los caminos (si no, el radar no tiene sentido).
for (const c of caminos) {
  const max = maximosAlcanzables(c);
  for (const h of HABILIDADES) if (max[h] === 0) error(`Camino sin ${h}: ${c.join(' → ')}`);
}

// --- Esquema del estado con partidas simuladas --------------------------------
const esquema = JSON.parse(readFileSync(new URL('../docs/estado-alumno.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = addFormatsModule as unknown as (a: Ajv2020) => void;
addFormats(ajv);
const validarEstado = ajv.compile(esquema);
const azar = crearAzar(42);
for (let i = 0; i < 200; i++) {
  const p = simularPartida('T' + String(i).padStart(3, '0'), 'VALIDACION', azar);
  if (!p.completada) error(`Partida simulada ${i} no terminó`);
  if (!validarEstado(p)) {
    error(`Partida simulada no cumple el esquema: ${ajv.errorsText(validarEstado.errors)}`);
    break;
  }
}

// --- Informe ----------------------------------------------------------------
const fmt = (h: Habilidades) => HABILIDADES.map((k) => `${k} ${h[k]}`).join(' · ');
console.log(`\nGuion: ${escenas.length} escenas · ${caminos.length} caminos posibles · ${escenas.filter((e) => e.tipo === 'minijuego').length} minijuegos`);
console.log(`Mecánicas usadas: ${[...new Set(escenas.flatMap((e) => (e.tipo === 'minijuego' ? [e.mecanica] : [])))].join(', ')}`);
for (const c of caminos) {
  console.log(`  · ${c.map((id) => id.slice(4)).join(' → ')}\n      máx: ${fmt(maximosAlcanzables(c))}`);
}
const porEscena = escenas.map((e) => `${e.id}: ${fmt(maximoPorEscena(e.id))}`);
if (process.argv.includes('--detalle')) console.log(porEscena.join('\n'));
for (const a of avisos) console.log(`⚠  ${a}`);
if (errores.length) {
  console.error(`\n✗ ${errores.length} error(es):`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\n✓ Guion válido\n');
