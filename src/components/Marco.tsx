import { useAjustesStore } from '../store/useAjustesStore';
import Icono from './Iconos';
import { useLector } from './ui';

/** Burbujas decorativas que suben (solo si el usuario no pide reducir movimiento). */
export function Burbujas() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden motion-reduce:hidden">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="absolute bottom-[-20px] rounded-full border border-cyan-200/30 bg-cyan-200/5 animate-[subir_linear_infinite]"
          style={{
            left: `${(i * 37) % 100}%`,
            width: 6 + ((i * 7) % 14),
            height: 6 + ((i * 7) % 14),
            animationDuration: `${9 + ((i * 5) % 11)}s`,
            animationDelay: `${(i * 1.7) % 9}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Barra superior: profundidad, progreso (0–1) y ajustes de accesibilidad. */
export function BarraSuperior({ progreso, texto, onSalir }: { progreso: number; texto?: string; onSalir?: () => void }) {
  const { sonido: sonidoOn, textoGrande, animarTexto, alternar } = useAjustesStore();
  const lector = useLector();
  const pct = Math.round(progreso * 100);

  const boton = 'flex h-10 w-10 aria-pressed:border-cyan-300/70 aria-pressed:bg-cyan-400/25 items-center justify-center rounded-lg border border-cyan-400/25 bg-black/40 text-base text-cyan-100 backdrop-blur transition-colors hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';

  return (
    <header className="relative z-10 flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
      <div className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/70">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] motion-safe:animate-pulse" />
          <span className="truncate">Estación Abismo · -3.000 m</span>
        </div>
        <div
          className="mt-2 h-1 w-full max-w-56 overflow-hidden rounded-full bg-cyan-950"
          role="progressbar"
          aria-label="Progreso del protocolo de emergencia"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct} % completado`}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-200 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <nav aria-label="Ajustes" className="flex gap-2">
        {lector.disponible && texto && (
          <button type="button" className={boton} onClick={() => lector.leer(texto)} aria-pressed={lector.leyendo} title="Leer en voz alta" aria-label={lector.leyendo ? 'Detener lectura' : 'Leer en voz alta'}>
            <Icono nombre={lector.leyendo ? 'parar' : 'leer'} />
          </button>
        )}
        <button type="button" className={boton} onClick={() => alternar('textoGrande')} aria-pressed={textoGrande} title="Texto grande" aria-label="Texto grande">
          <Icono nombre="texto" />
        </button>
        <button type="button" className={boton} onClick={() => alternar('animarTexto')} aria-pressed={!animarTexto} title="Mostrar el texto de golpe" aria-label="Mostrar el texto de golpe">
          <Icono nombre="saltar" />
        </button>
        <button type="button" className={boton} onClick={() => alternar('sonido')} aria-pressed={sonidoOn} title={sonidoOn ? 'Silenciar' : 'Activar sonido'} aria-label={sonidoOn ? 'Silenciar' : 'Activar sonido'}>
          <Icono nombre={sonidoOn ? 'sonido' : 'silencio'} />
        </button>
        {onSalir && (
          <button type="button" className={boton} onClick={onSalir} title="Pausar y salir" aria-label="Pausar y salir (la partida se guarda)">
            <Icono nombre="pausa" />
          </button>
        )}
      </nav>
    </header>
  );
}

