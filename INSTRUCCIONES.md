# Protocolo Abismo — Cómo ponerlo en marcha

Guía paso a paso para arrancar el juego en tu ordenador, aunque nunca hayas usado la terminal. Calcula unos 10 minutos la primera vez.

---

## 1. Instala Node.js (solo la primera vez)

El juego necesita **Node.js 20.19 o superior**.

1. Entra en <https://nodejs.org> y descarga la versión **LTS** (la recomendada).
2. Instálala con las opciones por defecto (siguiente, siguiente…).
3. Comprueba que funciona. Abre una terminal:
   - **Windows:** menú Inicio → escribe `PowerShell` → ábrelo.
   - **macOS:** `Cmd + Espacio` → escribe `Terminal` → Intro.
   - **Linux:** abre tu aplicación de terminal.
4. Escribe esto y pulsa Intro:

   ```bash
   node -v
   ```

   Debe aparecer algo como `v22.x.x` (o `v20.19` o superior). Si dice «no se reconoce» o «command not found», reinicia el ordenador y vuelve a probar.

## 2. Descomprime el proyecto

1. Guarda el archivo `protocolo-abismo.zip` del correo.
2. Descomprímelo (botón derecho → «Extraer todo» en Windows, doble clic en macOS).
3. Tendrás una carpeta `protocolo-abismo` con archivos como `package.json`, `src`, `public`…

> **Consejo:** ponla en una ruta sencilla, por ejemplo el Escritorio o `Documentos`. Evita carpetas sincronizadas como OneDrive mientras instalas, porque pueden ralentizar o bloquear archivos.

## 3. Abre una terminal dentro de la carpeta

- **Windows:** abre la carpeta `protocolo-abismo`, haz clic derecho en un espacio vacío → **«Abrir en Terminal»**. Si no aparece esa opción, haz clic en la barra de direcciones de la carpeta, escribe `powershell` y pulsa Intro.
- **macOS:** abre Terminal, escribe `cd ` (con un espacio al final), **arrastra la carpeta** a la ventana y pulsa Intro.
- **Linux:** clic derecho en la carpeta → «Abrir en una terminal».

Para comprobar que estás en el sitio correcto, escribe `ls` (macOS/Linux) o `dir` (Windows): debe aparecer `package.json`.

## 4. Instala las dependencias (solo la primera vez)

```bash
npm install
```

Tarda uno o dos minutos y necesita internet. Crea una carpeta `node_modules`. Es normal ver algunos avisos («warn»); solo importa si al final aparece la palabra **ERR!**.

## 5. Arranca el juego

```bash
npm run dev
```

Verás algo así:

```
  VITE v8.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```

Abre **<http://localhost:5173>** en el navegador (Chrome, Edge, Firefox o Safari).

**Deja la terminal abierta** mientras juegas: si la cierras, el juego se detiene. Para pararlo a propósito, pulsa `Ctrl + C` en la terminal.

La próxima vez solo tendrás que repetir los pasos **3 y 5**.

---

## 6. Cómo se usa

### Alumnado — <http://localhost:5173>

1. Escribe un **código de clase** (por ejemplo `2ESO-B`) y un **código de investigador/a** (por ejemplo `A7K2`, o pulsa 🎲). **Nunca nombres reales.**
2. Pulsa **Comenzar la misión**. Mejor con sonido o auriculares.
3. La partida dura unos 20 minutos y se guarda sola: se puede pausar con ⏸ y continuar más tarde escribiendo el mismo código.

En la barra superior hay ajustes de accesibilidad: lectura en voz alta, texto grande, texto sin animación y sonido.

### Docente — <http://localhost:5173/docente>

- **Primera vez / demostración:** pulsa **«Cargar clase de ejemplo»** para ver 14 partidas simuladas.
- **Clase:** perfil medio, mapa de calor por alumno, frente elegido tras el apagón y agrupamientos sugeridos.
- **Alumnado:** radar de cada alumno comparado con la clase, recomendación pedagógica, recorrido de decisiones y botón de imprimir.
- **Herramientas:** generar e imprimir códigos seudónimos, exportar a CSV y explicación de cada minijuego con su fundamento teórico.

> **Importante (modo demo):** sin configurar nada, las partidas se guardan **en el navegador del ordenador donde se juega**. El panel del docente solo ve las partidas jugadas **en ese mismo navegador**. Para una clase real con varios dispositivos, mira el apartado 8.

## 7. Jugar desde móviles o tablets de la misma red Wi‑Fi

En lugar de `npm run dev`, arranca con:

```bash
npm run dev -- --host
```

Aparecerá también una dirección **Network**, por ejemplo `http://192.168.1.34:5173/`. Abre esa dirección en los móviles o tablets conectados **a la misma Wi‑Fi**.

- Si Windows pregunta por el **Firewall**, pulsa «Permitir acceso».
- Recuerda que, en modo demo, cada dispositivo guarda sus propias partidas.

## 8. Usarlo con una clase real (opcional, avanzado)

Para reunir las partidas de todos los dispositivos en un mismo panel, y para la recomendación redactada con IA, hace falta una cuenta gratuita de **Supabase**. Los pasos están en el `README.md`, apartado **«Modo demo vs. Supabase»**. En resumen:

1. Crear un proyecto en <https://supabase.com> y ejecutar el archivo `supabase/migrations/20261104000000_partidas.sql` en su editor SQL.
2. Copiar `.env.example` como `.env.local` y pegar la URL y la clave pública (anon) del proyecto.
3. Crear las cuentas de docente en Supabase → Authentication.
4. (Opcional) Desplegar la función `informe-docente` con una clave de la API de Anthropic.

## 9. Publicarlo en internet (opcional)

```bash
npm run build
```

Se crea la carpeta **`dist`** con el juego listo para publicar:

- **Netlify:** entra en <https://app.netlify.com/drop> y arrastra la carpeta `dist`. Te da una dirección pública al momento.
- **Vercel:** importa la carpeta del proyecto desde <https://vercel.com>; detecta Vite solo.
- **Probarlo antes en tu ordenador:** `npm run preview` y abre la dirección que indique.

El proyecto ya incluye la configuración para que las rutas `/jugar` y `/docente` funcionen en Netlify y Vercel.

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `node` o `npm` «no se reconoce como comando» | Node.js no está instalado o falta reiniciar. Repite el paso 1 y reinicia el ordenador. |
| `npm install` falla con `EACCES` o permisos | No uses `sudo`. Mueve la carpeta a tu usuario (Escritorio o Documentos) y repite. |
| En Windows: «la ejecución de scripts está deshabilitada» | Usa **Símbolo del sistema (cmd)** en lugar de PowerShell, o ejecuta una vez en PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Error de versión: `Vite requires Node.js version 20.19+` | Tu Node es antiguo. Instala la versión LTS de nodejs.org. |
| «Port 5173 is in use» | Ya hay otro juego abierto. Vite usará otro puerto (5174…): fíjate en la dirección que muestra la terminal. |
| La página sale en blanco | Revisa que la terminal siga abierta y sin errores. Recarga con `Ctrl + F5` (o `Cmd + Shift + R` en macOS). |
| Los vídeos no suenan | Los navegadores bloquean el sonido automático: pulsa **«Activar sonido»** en el vídeo o el botón 🔊 de la barra. |
| Quiero empezar de cero | En el navegador, borra los datos del sitio (Configuración → Privacidad → Datos de sitios → `localhost`), o en el panel del docente → Herramientas → «Borrar datos locales». |

## Resumen rápido

```bash
npm install      # solo la primera vez
npm run dev      # arrancar y abrir http://localhost:5173
```

- Alumnado: <http://localhost:5173>
- Docente: <http://localhost:5173/docente>
