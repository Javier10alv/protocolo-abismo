# Protocolo Abismo — contexto para Claude Code

MVP para el hackathon **hack4edu**. Juego narrativo tipo "elige tu propia aventura" que evalúa de forma **invisible** las habilidades blandas de estudiantes de 10 a 18 años de contextos vulnerables, sin exámenes. El alumno juega; el docente ve un radar de fortalezas y una recomendación pedagógica.

Premisa: una estación de investigación submarina a 3.000 m sufre un sismo. El alumno es un investigador que debe restaurar la energía y cooperar con los supervivientes (Irene, ingeniera jefa; Leo, técnico en prácticas).

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # tsc -b && vite build — debe pasar sin errores antes de cada commit
```

## Stack

- Vite + React 19 + TypeScript (modo estricto)
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, sin `tailwind.config`)
- Zustand 5 con middleware `persist` (localStorage)
- Pendiente: React Router, Recharts (radar del docente), Supabase (Postgres + Auth + Edge Functions), API de Anthropic desde una Edge Function

## Estructura

```
src/
├── types/game.ts             Tipos compartidos: Habilidad, Scene, Opcion, EstadoAlumno, FIN
├── data/escenas.json         Guion del juego (contenido, sin lógica)
├── data/guion.ts             Importa el JSON, VERSION_GUION, ESCENA_INICIAL, escenasPorId
├── store/useGameStore.ts     Estado del alumno + seleccionarOpcion + reiniciarPartida
├── components/GameEngine.tsx Motor visual: escena, opciones y pantalla FIN
└── App.tsx                   Punto de entrada; recibe onPartidaFinalizada
docs/estado-alumno.schema.json  JSON Schema del estado que se envía al backend
public/img/                     Fondos de las escenas (provisionales)
```

## Modelo de datos

- **Habilidades** (siempre estas 5, en este orden): `logica`, `creatividad`, `comunicacion`, `resiliencia`, `liderazgo`. Empiezan en 0 y solo suben.
- **Scene**: `id`, `titulo`, `imagen`, `altImagen`, `textoNarrativo` (máx. 3 líneas), `opciones` (3).
- **Opcion**: `id`, `textoBoton`, `modificadores` (parcial de habilidades), `siguienteEscena` (id o `'FIN'`).
- **EstadoAlumno** debe validar contra `docs/estado-alumno.schema.json` (`additionalProperties: false`). Si añades un campo al estado, actualiza a la vez el esquema, `types/game.ts` y `seleccionarEstadoAlumno` del store.
- Campos internos del store que no son del esquema (p. ej. `escenaMostradaEn`) no se persisten ni se envían: `seleccionarEstadoAlumno` filtra lo que sale.

## Reglas del guion

- Cada opción suma **exactamente 3 puntos**: 2 a una habilidad principal y 1 a una secundaria. Ninguna opción es "la buena" ni moralmente superior.
- Ids: escenas `esc_NN_nombre`, opciones `esc_NN_a|b|c`.
- Cada vez que cambies `escenas.json`, **sube `VERSION_GUION`** en `src/data/guion.ts`. Las partidas guardadas con otra versión se descartan al cargar.
- Toda escena debe ser alcanzable y todo camino debe llegar a `FIN`.
- Narrativa sin violencia gráfica ni muertes; el peligro es ambiental y siempre hay salida colaborativa. Lenguaje claro para 10–18 años.

## Reglas de evaluación (no negociables)

- **El alumno nunca ve puntuaciones**: ni en la UI, ni en mensajes, ni en respuestas de red que pueda inspeccionar.
- **El radar se normaliza** como porcentaje del máximo alcanzable de cada habilidad (los máximos difieren: hoy lógica, resiliencia y liderazgo = 4; creatividad y comunicación = 6). El máximo se calcula desde el guion, no se escribe a mano. Con ramas, se normaliza sobre las escenas que el alumno visitó.
- `tiempoRespuestaMs` es telemetría: **no puntúa**.
- Mecánicas nuevas (clicar, arrastrar, secuencias): se puntúan **comportamientos** (reintentar, pedir pista, explorar antes de actuar), nunca velocidad ni precisión motora. Fallar no penaliza: tras 3 intentos, un personaje ayuda y la historia sigue.

## Privacidad (usuarios menores)

- Solo códigos seudónimos (`alumnoCodigo`, p. ej. `A7K2`), nunca nombres reales.
- Al LLM se le envían porcentajes y textos de las decisiones; nunca `alumnoCodigo`, `claseId` ni `partidaId`.
- La API key del LLM vive solo en la Edge Function, jamás en el frontend.
- En Supabase: RLS activado; el alumno (`anon`) solo inserta, el docente solo lee las partidas de sus clases.
- El envío de la partida debe ser idempotente (upsert por `partidaId`): si el alumno recarga en la pantalla FIN, se vuelve a llamar.
- La recomendación habla de "indicios" y "oportunidades", nunca de diagnósticos.

## UI y accesibilidad

- Estética sci-fi submarina: tonos `slate`, navy y `cyan`; caja de diálogo con glassmorphism (`bg-black/55`, `backdrop-blur-md`, borde `cyan-400/25`).
- Todo debe funcionar con ratón, táctil y teclado. Botones reales (`<button>`), anillo `focus-visible` visible.
- El fondo de la escena lleva `role="img"` y `aria-label={altImagen}`.
- Al cambiar de escena, el foco pasa al título.
- Animaciones con `motion-safe:` o con `motion-reduce:transition-none`.
- Diseño mobile-first: muchos alumnos jugarán en móvil o tablet.

## Convenciones de código

- Código, nombres y comentarios en español, como el resto del proyecto.
- TypeScript estricto; sin `any`. Tipos compartidos en `src/types/`.
- La lógica de juego va en el store (o en funciones puras que el store usa), no en los componentes.
- Componentes como funciones con nombre; un componente principal por archivo.

## Próximos pasos

1. Panel del docente en `/docente` (React Router): lista de partidas, radar con Recharts normalizado, historial de decisiones y párrafo de recomendación (primero con plantilla local leyendo de localStorage, después Supabase + LLM).
2. Pantalla de entrada para el alumno con código de clase y código seudónimo.
3. Script de validación del guion (esquema, 3 puntos por opción, alcanzabilidad, máximos por habilidad) ejecutable con `npm run validar`.
4. Integración con Supabase (tabla `partidas`, RLS, Edge Function `informe-docente`).
5. Más escenas y una mecánica interactiva de demostración.
