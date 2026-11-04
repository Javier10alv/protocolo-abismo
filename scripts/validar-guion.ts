// Valida el guion: estructura, ids, hub (5 áreas, una por habilidad, cuyos
// minijuegos vuelven al hub), reglas de puntuación, alcanzabilidad, que se llegue
// a FIN, coherencia con el registro de mecánicas, imágenes y vídeos, y que las
// partidas simuladas cumplan el JSON Schema del estado.
//
// Uso: npm run validar

import { existsSync, readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { ESCENA_INICIAL, eleccionesDe, escenas, escenasPorId, siguientesDe } from '../src/data/guion';
import { PESOS_ORDEN, maximosAlcanzables } from '../src/logica/puntuacion';
import { crearAzar, simularPartida } from '../src/logica/simulacion';
import { MECANICAS_INFO } from '../src/mecanicas/registro';
import { FIN, HABILIDADES, MECANICAS, type Habilidad, type Habilidades } from '../src/types/game';

const errores: string[] = [];
const avisos: string[] = [];
const error = (m: string) => errores.push(m);
const existe = (ruta: string) => existsSync(new URL(`../public${ruta}`, import.meta.url));

const RE_ESCENA = /^esc_\d{2}_[a-z]+$/;
const RE_OPCION = /^esc_(\d{2})_[a-z]+$/;
const PERSONAJES = ['lisa', 'leo', 'reyes', 'aris'];

// Minijuegos que se abren desde un hub: sus resultados deben volver a él y no suman puntos
// (los puntos los da el orden de elección en el hub).
const hubDe = new Map<string, string>();
for (const e of escenas) if (e.tipo === 'hub') for (const o of e.opciones) hubDe.set(o.escena, e.id);

// --- Estructura e ids -------------------------------------------------------
const idsElecciones = new Set<string>();
for (const e of escenas) {
  if (!RE_ESCENA.test(e.id)) error(`${e.id}: el id no sigue el patrón esc_NN_nombre`);
  for (const campo of ['titulo', 'imagen', 'altImagen', 'textoNarrativo'] as const) {
    if (typeof e[campo] !== 'string' || !e[campo].trim()) error(`${e.id}: falta "${campo}"`);
  }
  if (e.textoNarrativo.length > 280) avisos.push(`${e.id}: textoNarrativo largo (${e.textoNarrativo.length} car.); máx. ~3 líneas`);
  if (!existe(e.imagen)) error(`${e.id}: no existe la imagen public${e.imagen}`);
  for (const p of e.personajes ?? []) {
    if (!PERSONAJES.includes(p)) error(`${e.id}: personaje desconocido "${p}"`);
    else if (!existe(`/img/personajes/${p}.webp`)) error(`${e.id}: falta el sprite public/img/personajes/${p}.webp`);
  }
  for (const c of e.cinematicas ?? []) {
    if (!existe(c.src)) error(`${e.id}: no existe el vídeo public${c.src}`);
    if (!c.descripcion?.trim()) error(`${e.id}: cada cinemática necesita "descripcion" (accesibilidad)`);
    let anterior = 0;
    for (const sub of c.subtitulos ?? []) {
      if (!(sub.desde >= anterior && sub.hasta > sub.desde)) error(`${e.id}: subtítulo fuera de orden o con tiempos no válidos: "${sub.texto}"`);
      anterior = sub.hasta;
    }
  }
  if (e.fondoVideo) {
    if (!existe(e.fondoVideo.src)) error(`${e.id}: no existe el vídeo de fondo public${e.fondoVideo.src}`);
    if (!(e.fondoVideo.bucleDesde >= 0)) error(`${e.id}: fondoVideo.bucleDesde no válido`);
  }

  const nn = e.id.slice(4, 6);
  const comprobarId = (id: string) => {
    const m = RE_OPCION.exec(id);
    if (!m || m[1] !== nn) error(`${e.id}: id "${id}" no sigue el patrón esc_${nn}_xxx`);
    if (idsElecciones.has(id)) error(`id duplicado: ${id}`);
    idsElecciones.add(id);
  };

  if (e.tipo === 'hub') {
    const areas = e.opciones.map((o) => o.area);
    if (e.opciones.length !== PESOS_ORDEN.length) error(`${e.id}: el hub debe tener ${PESOS_ORDEN.length} opciones (tiene ${e.opciones.length})`);
    for (const h of HABILIDADES) if (!areas.includes(h)) error(`${e.id}: falta una opción para el área "${h}"`);
    if (new Set(areas).size !== areas.length) error(`${e.id}: hay áreas repetidas en el hub`);
    if (!e.introduccion?.length || !e.pregunta || !e.cierre) error(`${e.id}: el hub necesita introduccion, pregunta y cierre`);
    if ((e.preguntasRetorno?.length ?? 0) < e.opciones.length - 1) error(`${e.id}: faltan preguntasRetorno (una por vuelta: ${e.opciones.length - 1})`);
    for (const l of [...(e.introduccion ?? []), e.pregunta, e.cierre, ...(e.preguntasRetorno ?? [])]) {
      if (!l || !PERSONAJES.includes(l.personaje) || !l.texto?.trim()) error(`${e.id}: línea de diálogo no válida`);
    }
    for (const o of e.opciones) {
      comprobarId(o.id);
      const destino = escenasPorId.get(o.escena);
      if (destino?.tipo !== 'minijuego') error(`${o.id}: debe abrir una escena de minijuego (abre "${o.escena}")`);
    }
    if (e.siguienteEscena !== FIN && !escenasPorId.has(e.siguienteEscena)) error(`${e.id}: siguienteEscena "${e.siguienteEscena}" no existe`);
    continue;
  }

  if (e.tipo === 'decision') {
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

  const hub = hubDe.get(e.id);
  const sinPuntos = (e.tipo === 'decision' && e.sinPuntuacion) || !!hub;
  for (const x of eleccionesDe(e)) {
    comprobarId(x.id);
    const valores = Object.entries(x.modificadores);
    for (const [h] of valores) if (!HABILIDADES.includes(h as Habilidad)) error(`${x.id}: habilidad desconocida "${h}"`);
    if (sinPuntos) {
      // Escenas de reflexión y minijuegos del hub: los puntos vienen de otro sitio.
      if (valores.length) error(`${x.id}: no debe sumar puntos (${hub ? 'puntúa el orden del hub' : 'escena sin puntuación'})`);
    } else {
      // Regla de 3 puntos: 2 a una principal y 1 a una secundaria.
      const puntos = valores.map(([, v]) => v).sort();
      if (JSON.stringify(puntos) !== JSON.stringify([1, 2])) error(`${x.id}: debe sumar 2 a una habilidad y 1 a otra (tiene ${JSON.stringify(x.modificadores)})`);
    }
    if (hub && x.siguienteEscena !== hub) error(`${x.id}: un minijuego del hub debe volver a "${hub}" (va a "${x.siguienteEscena}")`);
    if (x.siguienteEscena !== FIN && !escenasPorId.has(x.siguienteEscena)) error(`${x.id}: siguienteEscena "${x.siguienteEscena}" no existe`);
  }
}
if (escenasPorId.size !== escenas.length) error('Hay ids de escena duplicados');

// --- Alcanzabilidad y ciclos --------------------------------------------------
const alcanzables = new Set<string>();
const pila = [ESCENA_INICIAL];
while (pila.length) {
  const id = pila.pop()!;
  if (alcanzables.has(id) || id === FIN) continue;
  alcanzables.add(id);
  const e = escenasPorId.get(id);
  if (e) pila.push(...siguientesDe(e));
}
for (const e of escenas) if (!alcanzables.has(e.id)) error(`${e.id}: escena inalcanzable`);

// Fuera de la vuelta minijuego → hub, el grafo debe ser acíclico y llegar a FIN.
const esVuelta = (desde: string, hasta: string) => hubDe.get(desde) === hasta;
let llegaAFin = false;
function recorrer(id: string, camino: string[]) {
  if (id === FIN) {
    llegaAFin = true;
    return;
  }
  if (camino.includes(id)) {
    error(`Ciclo detectado: ${[...camino, id].join(' → ')}`);
    return;
  }
  const e = escenasPorId.get(id);
  if (!e) return;
  for (const s of new Set(siguientesDe(e))) if (!esVuelta(id, s)) recorrer(s, [...camino, id]);
}
recorrer(ESCENA_INICIAL, []);
if (!llegaAFin) error('Ningún camino llega a FIN');

// --- Esquema del estado con partidas simuladas --------------------------------
const esquema = JSON.parse(readFileSync(new URL('../docs/estado-alumno.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = addFormatsModule as unknown as (a: Ajv2020) => void;
addFormats(ajv);
const validarEstado = ajv.compile(esquema);
const azar = crearAzar(42);
let maxRadar: Habilidades | null = null;
for (let i = 0; i < 200; i++) {
  const p = simularPartida(`Alumna Simulada ${i}`, 'VALIDACION', azar);
  if (!p.completada) error(`Partida simulada ${i} no terminó`);
  const total = HABILIDADES.reduce((a, h) => a + p.habilidades[h], 0);
  const esperado = PESOS_ORDEN.reduce((a, b) => a + b, 0);
  if (total !== esperado) error(`Partida simulada ${i}: suma ${total} puntos y debería sumar ${esperado} (orden ponderado)`);
  maxRadar ??= maximosAlcanzables(p.historial.map((h) => h.escenaId));
  if (!validarEstado(p)) {
    error(`Partida simulada no cumple el esquema: ${ajv.errorsText(validarEstado.errors)}`);
    break;
  }
}

// --- Informe ----------------------------------------------------------------
const fmt = (h: Habilidades) => HABILIDADES.map((k) => `${k} ${h[k]}`).join(' · ');
const hubs = escenas.filter((e) => e.tipo === 'hub');
console.log(`\nGuion: ${escenas.length} escenas · ${hubs.length} hub · ${escenas.filter((e) => e.tipo === 'minijuego').length} minijuegos`);
console.log(`Mecánicas usadas: ${[...new Set(escenas.flatMap((e) => (e.tipo === 'minijuego' ? [e.mecanica] : [])))].join(', ')}`);
console.log(`Puntuación por orden: ${PESOS_ORDEN.join(' / ')} (total ${PESOS_ORDEN.reduce((a, b) => a + b, 0)} por partida)`);
if (maxRadar) console.log(`Máximo del radar por habilidad: ${fmt(maxRadar)}`);
for (const a of avisos) console.log(`⚠  ${a}`);
if (errores.length) {
  console.error(`\n✗ ${errores.length} error(es):`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\n✓ Guion válido\n');
