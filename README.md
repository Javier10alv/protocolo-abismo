# Protocolo Abismo — MVP hack4edu

Juego narrativo que evalúa de forma invisible habilidades blandas (lógica, creatividad, comunicación, resiliencia y liderazgo).

## Arrancar

```bash
npm install
npm run dev
```

## Estructura

- `src/data/escenas.json` — guion del juego. Si lo cambias, sube `VERSION_GUION` en `src/data/guion.ts`.
- `src/store/useGameStore.ts` — store de Zustand (estado del alumno y `seleccionarOpcion`).
- `src/components/GameEngine.tsx` — motor visual (escena, opciones y pantalla FIN).
- `src/types/game.ts` — tipos compartidos.
- `docs/estado-alumno.schema.json` — JSON Schema del estado que se envía al backend.
- `public/img/` — fondos de las escenas (provisionales: sustituir por las ilustraciones reales con el mismo nombre).
