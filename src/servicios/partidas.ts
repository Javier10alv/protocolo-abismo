// Acceso a las partidas. Dos implementaciones con la misma interfaz:
//  - Local (por defecto): guarda en localStorage del dispositivo. Ideal para la demo.
//  - Supabase: si existen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
//
// El alumno solo INSERTA (idempotente por partidaId) y nunca recibe datos de vuelta.
// El docente lee (con su sesión en Supabase) las partidas de sus clases.

import { describirEleccion, escenasPorId } from '../data/guion';
import type { AjusteDocente } from '../logica/evaluacion';
import { resumenParaLLM } from '../logica/recomendacion';
import type { EstadoAlumno, Habilidad } from '../types/game';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const MODO: 'supabase' | 'local' = SUPABASE_URL && SUPABASE_ANON_KEY ? 'supabase' : 'local';

/* ------------------------------- Alumno ---------------------------------- */

const CLAVE_LOCAL = 'protocolo-abismo-servidor-local';

function leerLocal(): Record<string, EstadoAlumno> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LOCAL) ?? '{}') as Record<string, EstadoAlumno>;
  } catch {
    return {};
  }
}

function escribirLocal(datos: Record<string, EstadoAlumno>) {
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(datos));
}

/** Envía una partida terminada. Idempotente: llamarla dos veces no duplica nada. */
export async function enviarPartida(estado: EstadoAlumno): Promise<void> {
  if (MODO === 'local') {
    const datos = leerLocal();
    datos[estado.partidaId] = estado;
    escribirLocal(datos);
    return;
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/partidas?on_conflict=partida_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      // ignore-duplicates: si ya existe, no hace nada (el rol anon no puede actualizar).
      // return=minimal: el alumno no recibe datos de vuelta (tampoco puntuaciones).
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({
      partida_id: estado.partidaId,
      clase_id: estado.claseId,
      alumno_codigo: estado.alumnoCodigo,
      alumno_nombre: estado.alumnoNombre,
      version: estado.version,
      completada: estado.completada,
      estado,
    }),
  });
  if (!r.ok) throw new Error(`Error ${r.status} al enviar la partida`);
}

/* ------------------------------- Docente --------------------------------- */

const CLAVE_SESION = 'protocolo-abismo-sesion-docente';

export interface SesionDocente {
  accessToken: string;
  email: string;
}

export function sesionDocente(): SesionDocente | null {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null') as SesionDocente | null;
  } catch {
    return null;
  }
}

export async function iniciarSesion(email: string, password: string): Promise<SesionDocente> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error('Correo o contraseña incorrectos');
  const datos = (await r.json()) as { access_token: string };
  const sesion = { accessToken: datos.access_token, email };
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

export function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
}

export async function listarPartidas(): Promise<EstadoAlumno[]> {
  if (MODO === 'local') {
    return Object.values(leerLocal()).sort((a, b) => b.iniciadaEn.localeCompare(a.iniciadaEn));
  }
  const sesion = sesionDocente();
  if (!sesion) throw new Error('Sesión no iniciada');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/partidas?select=estado&order=creada_en.desc`, {
    headers: { apikey: SUPABASE_ANON_KEY!, Authorization: `Bearer ${sesion.accessToken}` },
  });
  if (r.status === 401) {
    cerrarSesion();
    throw new Error('La sesión ha caducado');
  }
  if (!r.ok) throw new Error(`Error ${r.status} al cargar las partidas`);
  return ((await r.json()) as { estado: EstadoAlumno }[]).map((f) => f.estado);
}

/** Solo modo Supabase: crea una clase del docente con sesión iniciada. */
export async function crearClase(id: string): Promise<void> {
  const sesion = sesionDocente();
  if (MODO !== 'supabase' || !sesion) throw new Error('Requiere Supabase y sesión iniciada');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/clases`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${sesion.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ id }),
  });
  if (r.status === 409) throw new Error('Ese código de clase ya existe');
  if (!r.ok) throw new Error(`Error ${r.status} al crear la clase`);
}

/**
 * Solo modo local: elimina datos simulados o de versiones anteriores al registro
 * con nombre (las antiguas clases de ejemplo). Las partidas reales se conservan.
 */
export function limpiarPartidasAntiguas() {
  const datos = leerLocal();
  let cambios = false;
  for (const [id, p] of Object.entries(datos)) {
    if (!p.alumnoNombre || p.claseId.startsWith('DEMO') || !Array.isArray(p.inventario)) {
      delete datos[id];
      cambios = true;
    }
  }
  if (cambios) escribirLocal(datos);
}

/** Solo modo local: borra todas las partidas guardadas en este dispositivo. */
export function borrarPartidasLocales() {
  localStorage.removeItem(CLAVE_LOCAL);
  localStorage.removeItem(CLAVE_AJUSTES);
}

/* --------------------------- Ajustes del docente -------------------------- */

const CLAVE_AJUSTES = 'protocolo-abismo-ajustes';

function leerAjustesLocales(): Record<string, AjusteDocente[]> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_AJUSTES) ?? '{}') as Record<string, AjusteDocente[]>;
  } catch {
    return {};
  }
}

function cabecerasDocente(extra: Record<string, string> = {}) {
  const sesion = sesionDocente();
  if (!sesion) throw new Error('Sesión no iniciada');
  return { apikey: SUPABASE_ANON_KEY!, Authorization: `Bearer ${sesion.accessToken}`, ...extra };
}

/** Ajustes manuales que el docente ha hecho en una partida. */
export async function cargarAjustes(partidaId: string): Promise<AjusteDocente[]> {
  if (MODO === 'local') return leerAjustesLocales()[partidaId] ?? [];
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ajustes_docente?partida_id=eq.${encodeURIComponent(partidaId)}&select=habilidad,banda,motivo,actualizado_en`, {
    headers: cabecerasDocente(),
  });
  if (!r.ok) throw new Error(`Error ${r.status} al cargar los ajustes`);
  return ((await r.json()) as { habilidad: Habilidad; banda: AjusteDocente['banda']; motivo: string; actualizado_en: string }[]).map((f) => ({
    habilidad: f.habilidad,
    banda: f.banda,
    motivo: f.motivo,
    fecha: f.actualizado_en,
  }));
}

/** Guarda (o sustituye) el ajuste de una habilidad. */
export async function guardarAjuste(partidaId: string, ajuste: AjusteDocente): Promise<void> {
  if (MODO === 'local') {
    const todos = leerAjustesLocales();
    todos[partidaId] = [...(todos[partidaId] ?? []).filter((a) => a.habilidad !== ajuste.habilidad), ajuste];
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(todos));
    return;
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ajustes_docente?on_conflict=partida_id,habilidad`, {
    method: 'POST',
    headers: cabecerasDocente({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ partida_id: partidaId, habilidad: ajuste.habilidad, banda: ajuste.banda, motivo: ajuste.motivo, actualizado_en: ajuste.fecha }),
  });
  if (!r.ok) throw new Error(`Error ${r.status} al guardar el ajuste`);
}

/** Quita el ajuste de una habilidad (vuelve a valer el cálculo del juego). */
export async function quitarAjuste(partidaId: string, habilidad: Habilidad): Promise<void> {
  if (MODO === 'local') {
    const todos = leerAjustesLocales();
    todos[partidaId] = (todos[partidaId] ?? []).filter((a) => a.habilidad !== habilidad);
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(todos));
    return;
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ajustes_docente?partida_id=eq.${encodeURIComponent(partidaId)}&habilidad=eq.${habilidad}`, {
    method: 'DELETE',
    headers: cabecerasDocente(),
  });
  if (!r.ok) throw new Error(`Error ${r.status} al quitar el ajuste`);
}

/** Todos los ajustes del docente, agrupados por partida (para la vista de clase y el CSV). */
export async function listarAjustes(): Promise<Record<string, AjusteDocente[]>> {
  if (MODO === 'local') return leerAjustesLocales();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ajustes_docente?select=partida_id,habilidad,banda,motivo,actualizado_en`, { headers: cabecerasDocente() });
  if (!r.ok) throw new Error(`Error ${r.status} al cargar los ajustes`);
  const todos: Record<string, AjusteDocente[]> = {};
  for (const f of (await r.json()) as { partida_id: string; habilidad: Habilidad; banda: AjusteDocente['banda']; motivo: string; actualizado_en: string }[]) {
    (todos[f.partida_id] ??= []).push({ habilidad: f.habilidad, banda: f.banda, motivo: f.motivo, fecha: f.actualizado_en });
  }
  return todos;
}

/** Pide a la Edge Function un informe redactado por IA. Solo en modo Supabase. */
export async function informeIA(estado: EstadoAlumno): Promise<string> {
  const sesion = sesionDocente();
  if (MODO !== 'supabase' || !sesion) throw new Error('El informe con IA requiere Supabase');
  // Privacidad: solo porcentajes y textos de decisiones; ni código del alumno, ni clase, ni partida.
  const cuerpo = resumenParaLLM(estado, describirEleccion, (id) => escenasPorId.get(id)?.titulo ?? id);
  const r = await fetch(`${SUPABASE_URL}/functions/v1/informe-docente`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${sesion.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Error ${r.status} al generar el informe`);
  return ((await r.json()) as { texto: string }).texto;
}
