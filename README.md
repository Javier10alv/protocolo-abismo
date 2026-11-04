# Protocolo Abismo — hack4edu

Aventura narrativa submarina que **evalúa de forma invisible** cinco habilidades blandas (lógica, creatividad, comunicación, resiliencia y liderazgo) de estudiantes de 10 a 18 años. El alumno juega; el docente ve un radar de fortalezas, el recorrido de decisiones y una recomendación pedagógica.

## Arrancar

> ¿Primera vez? Sigue la guía paso a paso de **[INSTRUCCIONES.md](INSTRUCCIONES.md)** (instalar Node.js, arrancar, jugar desde móviles y publicar).

```bash
npm install
npm run dev        # http://localhost:5173
```

- `/` — entrada del alumno (código de clase + código seudónimo).
- `/jugar` — el juego.
- `/docente` — panel del docente. En modo demo pulsa **«Cargar clase de ejemplo»** para ver 14 partidas simuladas.

Otros comandos:

```bash
npm run validar    # valida el guion (también se ejecuta en build)
npm run build      # validar + tsc + vite build
npx tsx scripts/generar-fondos.ts   # regenera las ilustraciones SVG de public/img
```

## Qué incluye

**Juego (15 escenas, 5 caminos, ~20 min)**

| Escena | Tipo | Qué observa |
|---|---|---|
| *Cinemática de llegada* (`intro.mp4`) | Vídeo | — |
| La sala de control | Decisión | — |
| *Cinemática de alarma* (`emergencia.mp4`) | Vídeo con subtítulos | — |
| Apagón en el Abismo | Decisión con **5 ramas**, una por habilidad | Qué frente elige atender |
| ↳ Refrigerar el motor | **Tuberías**: girar piezas para llevar el refrigerante | Planificación (funciones ejecutivas, Miyake et al., 2000) |
| ↳ El invernadero hidropónico | **Cultivo**: combinar objetos inusuales para estabilizar el pH | Pensamiento divergente (Guilford, 1967; Stokes, 2005) |
| ↳ La evacuación del Sector C | **Evacuación**: delegar 5 tareas entre Lisa, Leo, Reyes, Aris y tú | Liderazgo situacional y transformacional (Hersey y Blanchard, 1969; Bass, 1985) |
| ↳ Protocolo S.O.S. | **S.O.S.**: mensaje de 3 fragmentos con la antena dañada | Máximas de cantidad y relevancia (Grice, 1975) |
| ↳ La señal perdida | **Ondas**: sintonizar una señal que falla a propósito | Tolerancia a la frustración y *grit* (Rosenzweig, 1944; Duckworth, 2016) |
| La escotilla atascada | **Cableado** (puzle lógico con esquema y pistas) | Consulta antes de actuar, pide ayuda, reintenta |
| El pasillo inundado | **Conversación** de 3 turnos con Leo, que tiene miedo | Estilo comunicativo dominante |
| El hangar a oscuras | **Sonar** en una cuadrícula para encontrar el dron | Explora antes de actuar, coordina, persiste |
| Voces desde la superficie | Decisión | — |
| El manual desordenado | **Secuencia**: ordenar pasos (arrastrar o ▲▼) | Consulta notas, reintenta, deduce |
| El corazón de la estación | Decisión | — |
| Preparar la cápsula | **Energía**: repartir recursos + imprevisto | Prioridades y adaptación al cambio |
| El ascenso | Decisión metacognitiva | — |

Equipo: **Lisa** (bióloga jefa), **Leo** (ingeniero mecánico en prácticas), **Comandante Reyes** (seguridad y piloto) y **Dra. Aris** (científica de datos). Reyes y Aris usan retratos provisionales hasta tener su arte.

Las mecánicas inspiradas en esas teorías se adaptan a las reglas del proyecto: ninguna respuesta resta, cada desenlace suma 2+1 según el comportamiento, el reloj de Tuberías es solo ambiental y la sobrecarga en Evacuación hace que el plan falle (hay que rehacerlo), sin penalizar. En Ondas los errores están provocados y se le explica al alumno al terminar.

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

- Vista de clase: perfil medio, mapa de calor alumno × habilidad, fortaleza principal, caminos elegidos y **agrupamientos sugeridos** con fortalezas complementarias.
- Informe individual: radar normalizado (con la media de la clase), recomendación con plantilla local o **redactada con IA** (Claude), cronología de decisiones y comportamientos, e impresión.
- Herramientas: generador de códigos seudónimos imprimibles, exportación a CSV, clase de ejemplo y explicación de cómo se evalúa.

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
5. Cada docente crea su clase desde **Panel → Herramientas → Nueva clase** y comparte el código.

## Privacidad

- Solo códigos seudónimos; el juego nunca pide nombres.
- El alumno nunca ve puntuaciones, ni en la interfaz ni en respuestas de red (`return=minimal`).
- Al LLM solo se envían porcentajes y textos de decisiones; nunca código de alumno, clase ni partida.
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
