# Protocolo Abismo — contexto para Claude Code

MVP para el hackathon **hack4edu**. Juego narrativo tipo "elige tu propia aventura" que evalúa de forma **invisible** las habilidades blandas de estudiantes de 10 a 18 años de contextos vulnerables, sin exámenes. El alumno juega; el docente ve un radar de fortalezas y una recomendación pedagógica.

Premisa: una estación de investigación submarina a 3.000 m sufre un sismo. El alumno es un investigador que debe restaurar la energía y cooperar con los supervivientes (Irene, ingeniera jefa; Leo, técnico en prácticas).

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run validar  # valida el guion: estructura, 3 puntos, ramas, mecánicas, esquema
npm run build    # validar + tsc -b + vite build — debe pasar sin errores antes de cada commit
npx tsx scripts/generar-fondos.ts  # regenera las ilustraciones SVG de public/img
```

Rutas: `/` entrada del alumno · `/jugar` juego · `/docente` panel (en modo demo, «Cargar clase de ejemplo»).

## Stack

- Vite + React 19 + TypeScript (modo estricto)
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, sin `tailwind.config`)
- Zustand 5 con middleware `persist` (localStorage)
- React Router 8, Recharts 3 (solo en el panel del docente, carga diferida)
- Supabase opcional (REST con `fetch`, sin SDK): si faltan `VITE_SUPABASE_*`, todo funciona en modo demo local
- Edge Function `informe-docente` (Deno) con el SDK de Anthropic, modelo `claude-opus-5-5` y fallback del lado del servidor
- `tsx` + `ajv` para los scripts de validación

## Estructura

```
src/
├── types/game.ts               Tipos: Habilidad, Scene (decision | minijuego), Resultado, EstadoAlumno…
├── data/escenas.json           Guion (contenido, sin lógica)
├── data/guion.ts               VERSION_GUION, escenasPorId, eleccionesDe, describirEleccion, etapaDe
├── logica/partida.ts           Transiciones puras: crearEstadoInicial, aplicarOpcion, aplicarMinijuego
├── logica/puntuacion.ts        Máximos alcanzables por escena/camino y normalización a %
├── logica/recomendacion.ts     Recomendación con plantilla, resumen para el LLM, agrupamientos
├── logica/simulacion.ts        Partidas simuladas (demo y validador) y generador de códigos
├── mecanicas/registro.ts       Claves de desenlace de cada mecánica y etiquetas de conducta
├── mecanicas/*.tsx             Cableado, Conversacion, Reparto, Inventario, Sonar, Secuencia, Energia
├── store/                      useGameStore (partida) y useAjustesStore (sonido, texto grande…)
├── servicios/partidas.ts       Envío/lectura (local o Supabase), sesión docente, informe IA
├── components/                 GameEngine, ui (Boton, Bocadillo, TextoAnimado…), Retrato, Iconos, docente/
├── paginas/                    Entrada, Jugar, Docente
└── audio/sonido.ts             Efectos con Web Audio
scripts/                        validar-guion.ts, generar-fondos.ts
supabase/                       migrations/ (tablas + RLS) y functions/informe-docente
docs/estado-alumno.schema.json  JSON Schema del estado que se envía al backend
public/img/*.svg                Ilustraciones generadas por scripts/generar-fondos.ts
```

## Modelo de datos

- **Habilidades** (siempre estas 5, en este orden): `logica`, `creatividad`, `comunicacion`, `resiliencia`, `liderazgo`. Empiezan en 0 y solo suben.
- **Scene** = `EscenaDecision | EscenaMinijuego` (campo `tipo`). Comunes: `id`, `titulo`, `imagen`, `altImagen`, `textoNarrativo` (máx. 3 líneas), `personajes?`.
  - Decisión: `opciones` (3). **Opcion**: `id`, `textoBoton`, `modificadores`, `siguienteEscena` (id o `'FIN'`).
  - Minijuego: `mecanica`, `instruccion`, `resultados`. **Resultado**: `id`, `clave`, `descripcion` (para el docente), `textoCierre` (para el alumno), `modificadores`, `siguienteEscena`.
- Una mecánica devuelve `ResultadoMecanica` (`clave`, `conductas`, `intentos`, `ayudaRecibida`). Las claves posibles de cada mecánica están en `mecanicas/registro.ts` y deben coincidir con las del guion (lo comprueba `npm run validar`).
- El historial guarda, en minijuegos, `conductas`, `intentos` y `ayudaRecibida`.
- **EstadoAlumno** debe validar contra `docs/estado-alumno.schema.json` (`additionalProperties: false`). Si añades un campo al estado, actualiza a la vez el esquema, `types/game.ts` y `seleccionarEstadoAlumno` del store.
- Campos internos del store que no son del esquema (p. ej. `escenaMostradaEn`) no se persisten ni se envían: `seleccionarEstadoAlumno` filtra lo que sale.

## Reglas del guion

- Cada opción suma **exactamente 3 puntos**: 2 a una habilidad principal y 1 a una secundaria. Ninguna opción es "la buena" ni moralmente superior.
- Ids: escenas `esc_NN_nombre`, opciones `esc_NN_a|b|c`, resultados `esc_NN_clave`. Las ramas comparten `NN` (p. ej. `esc_04_leo`, `esc_04_reparto`, `esc_04_taller`); los ids de opción/resultado son únicos en todo el guion.
- Los minijuegos también cumplen la regla de 3 puntos en cada `resultado`.
- Cada vez que cambies `escenas.json`, **sube `VERSION_GUION`** en `src/data/guion.ts`. Las partidas guardadas con otra versión se descartan al cargar.
- Toda escena debe ser alcanzable y todo camino debe llegar a `FIN`.
- Narrativa sin violencia gráfica ni muertes; el peligro es ambiental y siempre hay salida colaborativa. Lenguaje claro para 10–18 años.

## Reglas de evaluación (no negociables)

- **El alumno nunca ve puntuaciones**: ni en la UI, ni en mensajes, ni en respuestas de red que pueda inspeccionar.
- **El radar se normaliza** como porcentaje del máximo alcanzable de cada habilidad sobre las escenas que el alumno visitó (`maximosAlcanzables` en `logica/puntuacion.ts`). El máximo se calcula desde el guion, no se escribe a mano.
- `tiempoRespuestaMs` es telemetría: **no puntúa**.
- Mecánicas: se puntúan **comportamientos** (reintentar, pedir pista, explorar antes de actuar), nunca velocidad ni precisión motora. Fallar no penaliza: tras 3 intentos (`INTENTOS_ANTES_DE_AYUDA`), un personaje ayuda y la historia sigue.
- Para añadir una mecánica: tipo en `MECANICAS` (types/game.ts), entrada en `MECANICAS_INFO` (registro.ts), componente en `mecanicas/` registrado en `mecanicas/index.ts`, y escena con sus `resultados` en el guion.

## Privacidad (usuarios menores)

- Solo códigos seudónimos (`alumnoCodigo`, p. ej. `A7K2`), nunca nombres reales.
- Al LLM se le envían porcentajes y textos de las decisiones; nunca `alumnoCodigo`, `claseId` ni `partidaId`.
- La API key del LLM vive solo en la Edge Function, jamás en el frontend.
- En Supabase: RLS activado; el alumno (`anon`) solo inserta, el docente solo lee las partidas de sus clases.
- El envío de la partida es idempotente (`on_conflict=partida_id` + `resolution=ignore-duplicates`): si el alumno recarga en la pantalla FIN, se vuelve a llamar sin duplicar.
- La recomendación habla de "indicios" y "oportunidades", nunca de diagnósticos.

## UI y accesibilidad

- Estética sci-fi submarina: tonos `slate`, navy y `cyan`; caja de diálogo con glassmorphism (`bg-black/55`, `backdrop-blur-md`, borde `cyan-400/25`).
- Todo debe funcionar con ratón, táctil y teclado. Botones reales (`<button>`), anillo `focus-visible` visible.
- El fondo de la escena lleva `role="img"` y `aria-label={altImagen}`.
- Al cambiar de escena, el foco pasa al título.
- Ajustes del alumno (`useAjustesStore`): sonido, texto grande (clase `texto-grande` en `<html>`), texto sin animación, lectura en voz alta (`useLector`).
- Iconos de la interfaz con `components/Iconos.tsx` (SVG); los emoji se ven distintos en cada sistema.
- Colores de gráficos validados con la skill dataviz: alumno `#0891b2`, media de la clase `#d97706` (discontinua).
- Animaciones con `motion-safe:` o con `motion-reduce:transition-none`.
- Diseño mobile-first: muchos alumnos jugarán en móvil o tablet.

## Convenciones de código

- Código, nombres y comentarios en español, como el resto del proyecto.
- TypeScript estricto; sin `any`. Tipos compartidos en `src/types/`.
- La lógica de juego va en el store (o en funciones puras que el store usa), no en los componentes.
- Componentes como funciones con nombre; un componente principal por archivo.

## Próximos pasos

1. Probar el despliegue real con Supabase (migración, Auth, Edge Function) y un grupo piloto.
2. Ilustraciones definitivas (sustituir los SVG generados manteniendo los nombres de archivo).
3. Comparar varias partidas del mismo alumno a lo largo del curso.
4. Traducciones (catalán, euskera, gallego, inglés) separando los textos del guion.
