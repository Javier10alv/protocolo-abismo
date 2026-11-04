# Protocolo Abismo — contexto para Claude Code

MVP para el hackathon **hack4edu**. Juego narrativo tipo "elige tu propia aventura" que evalúa de forma **invisible** las habilidades blandas de estudiantes de 10 a 18 años de contextos vulnerables, sin exámenes. El alumno juega; el docente ve un radar de fortalezas y una recomendación pedagógica.

Premisa: el alumno llega en submarino a la estación Abismo, a 3.000 m, en su primer día. Un sismo provoca un apagón con cinco problemas a la vez. Con Lisa (bióloga jefa), Leo (ingeniero mecánico en prácticas, inseguro), el Comandante Reyes (seguridad y piloto) y la Dra. Aris (científica de datos) los resuelve en el orden que elija. Los cuatro tienen sprite.

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run validar  # valida el guion: estructura, hub, puntuación, mecánicas, esquema
npm run build    # validar + tsc -b + vite build — debe pasar sin errores antes de cada commit
npx tsx scripts/generar-fondos.ts  # regenera las ilustraciones SVG de public/img
```

Rutas: `/` entrada (nombre completo + código del docente `ABISMO2026`, en `src/config.ts`) · `/jugar` juego · `/docente` panel (empieza vacío; sin partidas muestra una fila de «Alumno de Prueba»).

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
├── logica/puntuacion.ts        PESOS_ORDEN (10/7/5/3/1), máximos alcanzables y normalización a %
├── logica/metricas.ts          Métricas por área para el panel: orden, puntos, tiempo, precisión y retiradas
├── logica/evaluacion.ts        DESEMPEÑO: matriz de especificación (indicadores → habilidades), bandas, confianza y ajustes del docente
├── data/objetos.ts             Objetos de las salas (inventario) y sus usos alternativos en cada reto
├── data/juicio.ts              Preguntas de juicio situacional al final de cada reto del hub
├── logica/recomendacion.ts     Recomendación con plantilla, resumen para el LLM, agrupamientos
├── logica/simulacion.ts        Partidas simuladas (validador) y la fila «Alumno de Prueba» del panel
├── config.ts                   CODIGO_DOCENTE y normalización de nombres
├── mecanicas/registro.ts       Claves de desenlace de cada mecánica y etiquetas de conducta
├── mecanicas/*.tsx             En uso: Tuberias, Especie, Guiar (liderazgo situacional), Sos, Ondas, Frecuencias. Antiguas sin usar: Cableado, Conversacion, Sonar, Secuencia, Energia, Cultivo, Evacuacion
├── mecanicas/Inventario.tsx    Barra de inventario dentro de un reto (cada mecánica decide si un objeto le sirve)
├── store/                      useGameStore (partida) y useAjustesStore (sonido, texto grande…)
├── servicios/partidas.ts       Envío/lectura (local o Supabase), sesión docente, informe IA
├── components/                 GameEngine, ui (Boton, Bocadillo, TextoAnimado…), Retrato, Iconos, docente/
├── paginas/                    Entrada, Jugar, Docente
└── audio/sonido.ts             Efectos con Web Audio
scripts/                        validar-guion.ts, generar-fondos.ts
supabase/                       migrations/ (tablas + RLS) y functions/informe-docente
docs/estado-alumno.schema.json  JSON Schema del estado que se envía al backend
public/img/base.webp            Sala de control (ilustración real)
public/img/personajes/*.webp    Sprites de Leo y Lisa con fondo transparente
public/video/*.mp4              Cinemáticas: intro (llegada) y emergencia (alarma)
public/img/esc_*.svg            Resto de fondos, generados por scripts/generar-fondos.ts
```

## Modelo de datos

- **Habilidades** (siempre estas 5, en este orden): `logica`, `creatividad`, `comunicacion`, `resiliencia`, `liderazgo`. Empiezan en 0 y solo suben.
- **Scene** = `EscenaDecision | EscenaMinijuego` (campo `tipo`). Comunes: `id`, `titulo`, `imagen`, `altImagen`, `textoNarrativo` (máx. 3 líneas), `personajes?`.
  - **Hub** (`tipo: 'hub'`): `introduccion` (líneas de diálogo; los personajes entran al hablar), `pregunta`, `preguntasRetorno` (una por vuelta), `cierre`, `opciones` (`id`, `area`, `textoBoton`, `escena`) y `siguienteEscena`. Cada opción abre un minijuego cuyos resultados vuelven al hub.
  - Decisión: `opciones` (3–5). `sinPuntuacion: true` para escenas de reflexión (modificadores vacíos). **Opcion**: `id`, `textoBoton`, `modificadores`, `siguienteEscena` (id o `'FIN'`).
  - Minijuego: `mecanica`, `instruccion`, `resultados`. **Resultado**: `id`, `clave`, `descripcion` (para el docente), `textoCierre` (para el alumno), `modificadores`, `siguienteEscena`.
- Opcionales en cualquier escena: `cinematica` (`src`, `descripcion` para lectores de pantalla, `subtitulos` con `desde`/`hasta`/`texto`/`personaje?`) se ve una vez por partida antes de la escena (`useCinematicasStore`); `fondoVideo` (`src`, `bucleDesde`) sustituye la imagen por un vídeo silencioso en bucle y oculta los sprites, porque los personajes ya salen en el vídeo.
- Una mecánica devuelve `ResultadoMecanica` (`clave`, `conductas`, `intentos`, `ayudaRecibida`). Las claves posibles de cada mecánica están en `mecanicas/registro.ts` y deben coincidir con las del guion (lo comprueba `npm run validar`).
- El historial guarda, en minijuegos, `conductas`, `intentos` y `ayudaRecibida`.
- **EstadoAlumno** debe validar contra `docs/estado-alumno.schema.json` (`additionalProperties: false`). Si añades un campo al estado, actualiza a la vez el esquema, `types/game.ts` y `seleccionarEstadoAlumno` del store.
- Campos internos del store que no son del esquema (p. ej. `escenaMostradaEn`) no se persisten ni se envían: `seleccionarEstadoAlumno` filtra lo que sale.

## Reglas del guion

- **Puntuación por orden (hub):** el área elegida en 1.ª posición suma 10, la 2.ª 7, la 3.ª 5, la 4.ª 3 y la 5.ª 1 (`PESOS_ORDEN`). Ninguna prioridad es "la buena". Los minijuegos del hub no suman puntos (resultados con `modificadores: {}`).
- Las escenas de decisión fuera del hub siguen la regla de 3 puntos: 2 a una habilidad principal y 1 a una secundaria.
- Estructura (guion 5.1.0): cinemáticas → hub `esc_01_hub` ⇄ minijuegos `esc_02_*` (tuberías, especie, liderazgo, S.O.S., ondas) → `esc_03_compuerta` (Frecuencias enlazadas, `sinPuntuacion`) → `esc_04_ascenso` (reflexión, sin puntos) → FIN. Las mecánicas antiguas siguen en el código, sin usarse.
- **Retirada estratégica:** desde cualquier reto del hub se puede volver a la sala de control (`aplicarRetirada`, registro con `retirada: true`). El reto queda aplazado; al retomarlo (`reanudacion: true`) no vuelve a sumar puntos: puntúa el orden de la **primera** elección. Retirarse nunca resta.
- **Inventario:** cada sala tiene objetos (`data/objetos.ts`) que se recogen con «Explorar la sala». Todo reto del hub debe tener al menos un uso con un objeto de la sala de control (lo comprueba el validador).
- Ids: escenas `esc_NN_nombre`, opciones `esc_NN_a|b|c|d|e`, resultados `esc_NN_clave`. Las ramas comparten `NN` (p. ej. `esc_03_tuberias`, `esc_03_sos`); los ids de opción/resultado son únicos en todo el guion.
- Cada vez que cambies `escenas.json`, **sube `VERSION_GUION`** en `src/data/guion.ts`. Las partidas guardadas con otra versión se descartan al cargar.
- Toda escena debe ser alcanzable y se debe poder llegar a `FIN`. El único ciclo permitido es minijuego → hub.
- Narrativa sin violencia gráfica ni muertes; el peligro es ambiental y siempre hay salida colaborativa. Lenguaje claro para 10–18 años.

## Reglas de evaluación (no negociables)

- **Dos dimensiones separadas:** *prioridades* (orden del hub, 10/7/5/3/1, gráfico de barras) y *desempeño o rendimiento* (`logica/evaluacion.ts`, radar 0–100). El desempeño sale de indicadores 0–1 (de las mecánicas, de los eventos, de la retirada, del inventario y del juicio situacional), ponderados según la `MATRIZ`; se muestra en bandas (Emergente < 40 ≤ En desarrollo < 70 ≤ Consolidado) con confianza según el peso de evidencia observado. Todo indicador nuevo va a la `MATRIZ` con su referencia.
- Cada mecánica recibe `registrar` (eventos de telemetría), `inventario` y `reintento`, y devuelve `indicadores` propios. Vocabulario de eventos: `accion`, `fallo` (con `firma`), `ayuda` (`tipo`), `presion`, `tiempo_agotado`, `objeto`, `explorar`, `recoger`, `retirada`, `insight`, `sjt`.
- El docente puede **ajustar** la banda de una habilidad con un motivo obligatorio (`ajustes_docente` en Supabase o localStorage). El valor calculado nunca se sobrescribe.

- **El alumno nunca ve puntuaciones**: ni en la UI, ni en mensajes, ni en respuestas de red que pueda inspeccionar.
- **El radar se normaliza** como porcentaje del máximo alcanzable de cada habilidad sobre las escenas que el alumno visitó (`maximosAlcanzables` en `logica/puntuacion.ts`). El máximo se calcula desde el guion, no se escribe a mano.
- `tiempoRespuestaMs` (duración de cada minijuego) y `precision` (0–100) son **métricas para el docente**: no cambian los puntos.
- Tuberías (150 s) y S.O.S. (75 s) tienen cuenta atrás (`useCuentaAtras`). Al agotarse, un personaje da más tiempo: nunca se pierde.
- Las mecánicas inspiradas en tests con «respuesta óptima» se adaptan: lo óptimo se registra como conducta para el docente, nunca resta. Un plan inviable (p. ej. sobrecargar a una persona) se trata como intento fallido que se rehace. Si una mecánica provoca errores a propósito (Ondas), debe explicárselo al alumno en el cierre.
- Mecánicas: se puntúan **comportamientos** (reintentar, pedir pista, explorar antes de actuar), nunca velocidad ni precisión motora. Fallar no penaliza: la dificultad es adaptativa (pista tras 2 fallos) y tras 3 intentos (`INTENTOS_ANTES_DE_AYUDA`) un personaje ayuda y la historia sigue.
- Ondas tiene dos fallos provocados: uno **previsible** (ERR-47, evitable con el condensador) y uno **imprevisible** para todos. Ambos se explican en el cierre (`notaCierre`).
- Para añadir una mecánica: tipo en `MECANICAS` (types/game.ts), entrada en `MECANICAS_INFO` (registro.ts), componente en `mecanicas/` registrado en `mecanicas/index.ts`, indicadores en la `MATRIZ`, pregunta en `data/juicio.ts` si va en el hub, y escena con sus `resultados` en el guion.

## Privacidad (usuarios menores)

- El alumno entra con su **nombre completo** (`alumnoNombre`) y el código del docente. Cada partida tiene un **ID único seudónimo** (`alumnoCodigo`, p. ej. `K7Q2-M4X9`), que es el que se usa en análisis y exportaciones.
- El nombre es un dato personal de un menor: solo se muestra en el panel del docente, no va en el CSV salvo que el docente lo marque y **nunca** se envía al LLM.
- `CODIGO_DOCENTE` está en el frontend: filtra accesos casuales, no es seguridad.
- Al LLM se le envían porcentajes y textos de las decisiones; nunca `alumnoNombre`, `alumnoCodigo`, `claseId` ni `partidaId`.
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
- Personajes: `components/Escenario.tsx` dibuja fondo + sprites (decorativos, `pointer-events-none`); `Retrato` recorta la cara del sprite con `CARA`/`PROPORCION`. Leo siempre a la izquierda y Lisa a la derecha, como en los vídeos.
- Vídeos: con sonido si el ajuste lo permite; si el navegador bloquea el autoplay, se reproducen silenciados con botón «Activar sonido». El zumbido ambiente se pausa durante las cinemáticas.
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
2. Ilustraciones definitivas para el resto de escenas (sustituir los SVG generados) y más cinemáticas (p. ej. el ascenso final).
3. Comparar varias partidas del mismo alumno a lo largo del curso.
4. Traducciones (catalán, euskera, gallego, inglés) separando los textos del guion.
