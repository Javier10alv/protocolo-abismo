# Protocolo Abismo — hack4edu

Aventura narrativa submarina que **evalúa de forma invisible** cinco habilidades blandas (lógica, creatividad, comunicación, resiliencia y liderazgo) de estudiantes de 10 a 18 años. El alumno juega; el docente ve un radar de fortalezas, el recorrido de decisiones y una recomendación pedagógica.

## Arrancar

> ¿Primera vez? Sigue la guía paso a paso de **[INSTRUCCIONES.md](INSTRUCCIONES.md)** (instalar Node.js, arrancar, jugar desde móviles y publicar).

```bash
npm install
npm run dev        # http://localhost:5173
```

- `/` — entrada del alumno: **nombre completo** y **código de verificación del docente** (`ABISMO2026`, en `src/config.ts`).
- `/jugar` — el juego.
- `/docente` — panel del docente. Empieza vacío: mientras no haya partidas reales muestra una sola fila de **«Alumno de Prueba»**.

Otros comandos:

```bash
npm run validar    # valida el guion (también se ejecuta en build)
npm run build      # validar + tsc + vite build
npx tsx scripts/generar-fondos.ts   # regenera las ilustraciones SVG de public/img
```

## Qué incluye

**Juego (novela visual con bucle central, ~15 min)**

1. *Cinemáticas* `intro.mp4` (llegada) y `emergencia.mp4` (alarma), con subtítulos y botón «Saltar».
2. **Sala de control (hub)** sobre `base.png`: Leo entra por la izquierda y explica el problema; Lisa entra por la derecha y pregunta por dónde empezar; aparece el menú con las 5 áreas.
3. El alumno elige un área → fondo propio y minijuego → vuelve al hub. La opción hecha desaparece y Lisa vuelve a preguntar con una frase adaptada. Se repite hasta completar las 5.
4. **Rumbo a la superficie**: escena de reflexión final (no puntúa) y fin.

| Área | Fondo | Minijuego | Inspirado en |
|---|---|---|---|
| Lógica | `sala_tuberias` | **Tuberías**: girar piezas contrarreloj (90 s) | Funciones ejecutivas (Miyake et al., 2000) |
| Creatividad | `hibernadero` | **Cultivo**: combinar objetos inusuales para estabilizar el pH | Pensamiento divergente (Guilford, 1967; Stokes, 2005) |
| Liderazgo | `liderazgo_decision` | **Evacuación**: asignar 5 tareas entre Lisa, Leo, Reyes, Aris y tú | Liderazgo situacional y transformacional (Hersey y Blanchard, 1969; Bass, 1985) |
| Comunicación | `sala_control_pantalla` | **S.O.S.**: elegir 3 frases clave con la batería agotándose (60 s) | Máximas de cantidad y relevancia (Grice, 1975) |
| Resiliencia | `alerta_roja` | **Ondas**: alinear una señal que falla a propósito | Tolerancia a la frustración y *grit* (Rosenzweig, 1944; Duckworth, 2016) |

**Puntuación por orden de elección.** Cada área suma según la posición en la que el alumno decide atenderla: 1.ª = **10**, 2.ª = **7**, 3.ª = **5**, 4.ª = **3**, 5.ª = **1** (26 puntos por partida). Así se ven sus prioridades naturales ante una crisis. El radar las muestra en % sobre 10.

**Métricas registradas** (solo para el docente; no cambian los puntos): secuencia de elecciones, tiempo de cada minijuego y de la sesión, y **precisión** (eficiencia 0–100) en cada minijuego:

- Tuberías: 100 menos 20 por fuga (y menos 15 si pidió consejo).
- Cultivo: soluciones válidas sobre combinaciones probadas.
- Evacuación: especialistas en su tarea (hasta 80) más la tarea crítica asumida (20), menos 10 por cada plan que tuvo que rehacer.
- S.O.S.: fragmentos con información útil sobre fragmentos enviados.
- Ondas: 100 si persistió, 90 si hizo una pausa y 50 si pidió relevo.

Si se agota el tiempo o falla, nunca pierde: un personaje da más tiempo o ayuda tras 3 intentos y la historia sigue. En Ondas los errores están provocados y se le explica al alumno al terminar.

Equipo: **Lisa** (bióloga jefa), **Leo** (ingeniero mecánico en prácticas), **Comandante Reyes** (seguridad y piloto) y **Dra. Aris** (científica de datos), todos con sprite.

- Nunca se puntúa velocidad ni precisión motora. Tras 3 intentos fallidos, un personaje ayuda y la historia sigue.
- Accesibilidad: todo funciona con teclado, ratón y pantalla táctil; lectura en voz alta, texto grande, texto sin animación, `prefers-reduced-motion` y foco gestionado en cada escena.
- Sonido sintetizado con Web Audio (sin archivos), con botón para silenciarlo.
- La partida se guarda sola y se puede pausar y continuar.
- Cinemáticas con subtítulos, botón «Saltar» (o Escape) y fundidos; cada una se ve una sola vez por partida. La escena de la escotilla usa el final del vídeo de alarma como fondo en bucle, sin sonido.
- Personajes como sprites de cuerpo entero sobre los fondos (Leo a la izquierda y Lisa a la derecha); los retratos circulares se recortan del mismo sprite.

## Assets gráficos

| Archivo | Uso |
|---|---|
| `public/img/base.webp` | Sala de control (escenas 1 y 2 y fondo de la entrada) |
| `public/img/personajes/leo.webp`, `lisa.webp` | Sprites con fondo transparente (recortados de los PNG originales) |
| `public/video/intro.mp4` | Llegada del submarino, antes de la sala de control |
| `public/video/emergencia.mp4` | Alarma y escotilla bloqueada, antes del cableado; su tramo final (desde 6,2 s) es el fondo en bucle |
| `public/img/esc_*.svg` | Resto de escenas (`npx tsx scripts/generar-fondos.ts`) |

Para sustituir un sprite, se le quita el fondo blanco con ImageMagick (incluidos los huecos cerrados, como entre brazos y torso):

```bash
magick leo.png -fuzz 9% -fill black +opaque white -fill white -opaque white \
  -define connected-components:area-threshold=2500 -define connected-components:mean-color=true \
  -connected-components 8 -negate -morphology Erode Disk:1.5 -blur 0x0.7 alpha.png
magick leo.png alpha.png -alpha off -compose CopyOpacity -composite -trim +repage \
  -resize x1200 -quality 86 public/img/personajes/leo.webp
```

Si cambian las proporciones del sprite, ajusta `CARA` y `PROPORCION` en `src/components/Retrato.tsx`.

**Panel del docente**

- Vista de clase: tiempo medio, precisión media, registro por alumno (secuencia de elecciones, tiempo total y tiempo y precisión por área), prioridades medias, primera área elegida y **agrupamientos sugeridos**.
- Informe individual: nombre e ID, radar de prioridades (con la media de la clase), tabla de secuencia y desempeño, recomendación con plantilla local o **redactada con IA** (Claude), cronología y comportamientos, e impresión.
- Herramientas: código de acceso del alumnado, exportación a CSV (nombres solo si el docente lo marca) y explicación de cómo se evalúa.

## Modo demo vs. Supabase

Sin configuración, todo funciona en **modo demo local**: las partidas se guardan en el `localStorage` del navegador y el panel no pide contraseña.

Para usarlo con una clase real:

1. Crea un proyecto en Supabase y aplica `supabase/migrations/20261104000000_partidas.sql` (tablas `clases` y `partidas` con RLS: el alumnado solo inserta y cada docente solo lee sus clases).
2. Crea usuarios docentes en Supabase Auth (correo y contraseña).
3. Copia `.env.example` a `.env.local` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Informe con IA:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy informe-docente
   ```
5. Crea la clase con el mismo código de verificación (`ABISMO2026` o el que pongas en `src/config.ts`) desde **Panel → Herramientas → Nueva clase**. Aplica también la migración `20261104020000_alumno_nombre.sql`.

## Privacidad

- El alumno se identifica con su **nombre completo** (dato personal de un menor: requiere informar a las familias y, según el centro, su consentimiento). Cada partida recibe además un **ID único seudónimo**.
- El nombre solo aparece en el panel del docente; las exportaciones lo omiten salvo que el docente lo marque.
- El código de verificación está en el frontend: evita accesos casuales, no protege datos. La protección real, con Supabase, la dan Auth y RLS.
- El alumno nunca ve puntuaciones, ni en la interfaz ni en respuestas de red (`return=minimal`).
- Al LLM solo se envían porcentajes y textos de decisiones; nunca el nombre, el ID, la clase ni la partida.
- La API key de Anthropic vive solo en la Edge Function.

## Estructura

```
src/
├── types/game.ts              Tipos compartidos (escenas, mecánicas, estado)
├── data/escenas.json          Guion (contenido, sin lógica)
├── data/guion.ts              VERSION_GUION, índices y utilidades del guion
├── logica/                    Funciones puras: partida, puntuación, recomendación, simulación
├── mecanicas/                 Las 7 mecánicas + registro (claves y conductas) para el docente
├── store/                     Zustand: partida del alumno y ajustes de accesibilidad
├── servicios/partidas.ts      Envío y lectura de partidas (local o Supabase) + informe IA
├── components/                Motor del juego, UI común, retratos, iconos y panel docente
├── paginas/                   Entrada, Jugar y Docente (React Router)
└── audio/sonido.ts            Efectos con Web Audio
scripts/                       validar-guion.ts y generar-fondos.ts
supabase/                      Migración SQL y Edge Function informe-docente
docs/estado-alumno.schema.json JSON Schema del estado que se envía al backend
```
