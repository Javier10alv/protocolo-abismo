import { useEffect, useRef } from 'react';
import type { FondoVideo, Personaje, Scene } from '../types/game';
import { NOMBRE_PERSONAJE, SPRITE_PERSONAJE } from './Retrato';

/**
 * Escenario de una escena: fondo estático (imagen) o en vídeo (bucle silencioso)
 * y, encima, los sprites de los personajes presentes. Todo es decorativo y no
 * captura clics (pointer-events-none): la interacción vive en el panel de diálogo.
 */
interface Props {
  escena: Scene;
  visible: boolean;
  /** Personajes en escena ahora mismo (por defecto, todos los de la escena). Permite que entren por pasos. */
  enEscena?: Personaje[];
  /** Quién habla: el resto se atenúa ligeramente. */
  hablando?: Personaje | null;
}

export default function Escenario({ escena, visible, enEscena, hablando = null }: Props) {
  // Si el fondo ya dibuja a los personajes (vídeo o ilustración de grupo), no se superponen sprites.
  const sinSprites = !!escena.fondoVideo || !!escena.spritesEnFondo;
  const candidatos = sinSprites ? [] : (escena.personajes ?? []).filter((p) => SPRITE_PERSONAJE[p]);
  const presentes = enEscena ?? candidatos;

  return (
    <div className="pointer-events-none fixed inset-0">
      {escena.fondoVideo ? (
        <FondoEnVideo fondo={escena.fondoVideo} poster={escena.imagen} etiqueta={escena.altImagen} visible={visible} />
      ) : (
        <div
          role="img"
          aria-label={escena.altImagen}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out motion-reduce:transition-none motion-safe:animate-[deriva_40s_ease-in-out_infinite_alternate] ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${escena.imagen})` }}
        />
      )}

      {/* Oscurece arriba un poco y mucho abajo, donde va el texto */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.55) 40%, rgba(8,20,45,0.15) 100%)' }}
      />

      <CapaPersonajes candidatos={candidatos} presentes={presentes} hablando={hablando} visible={visible} />
    </div>
  );
}

/**
 * Coloca a Leo a la izquierda y a Lisa a la derecha, como en las cinemáticas.
 * En móvil se anclan arriba (se ve cabeza y torso sobre el panel); desde `sm`, de pie sobre el suelo.
 */
const LADO: Record<Personaje, 'izquierda' | 'derecha'> = { leo: 'izquierda', lisa: 'derecha', reyes: 'izquierda', aris: 'derecha' };

function CapaPersonajes({ candidatos, presentes, hablando, visible }: { candidatos: Personaje[]; presentes: Personaje[]; hablando: Personaje | null; visible: boolean }) {
  if (candidatos.length === 0) return null;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {candidatos.map((p, i) => {
        const izquierda = LADO[p] === 'izquierda';
        const dentro = visible && presentes.includes(p);
        const atenuado = hablando !== null && hablando !== p;
        return (
          <img
            key={p}
            src={SPRITE_PERSONAJE[p]!}
            alt={NOMBRE_PERSONAJE[p]}
            draggable={false}
            className={`absolute top-[7dvh] h-[62dvh] w-auto max-w-none select-none drop-shadow-[0_0_24px_rgba(8,145,178,0.35)] transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none sm:top-auto sm:bottom-0 sm:h-[78dvh] lg:h-[86dvh] ${
              izquierda ? 'left-[-4%] sm:left-[2%] lg:left-[6%]' : 'right-[-4%] sm:right-[2%] lg:right-[6%]'
            } ${dentro ? 'translate-x-0 opacity-100' : izquierda ? '-translate-x-16 opacity-0' : 'translate-x-16 opacity-0'}`}
            style={{
              transitionDelay: dentro ? `${150 + i * 120}ms` : '0ms',
              // Penumbra para integrarlos con la luz de la estación; más tenue si no hablan.
              filter: atenuado ? 'brightness(0.62) saturate(0.8)' : 'brightness(0.95) saturate(0.97)',
            }}
          />
        );
      })}
    </div>
  );
}

/** Fondo en vídeo: arranca en `bucleDesde` y se repite desde ahí, sin sonido. */
function FondoEnVideo({ fondo, poster, etiqueta, visible }: { fondo: FondoVideo; poster: string; etiqueta: string; visible: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const alInicio = () => {
      v.currentTime = fondo.bucleDesde;
      // Con movimiento reducido, se queda como imagen fija en ese fotograma.
      if (!reducido) void v.play().catch(() => undefined);
    };
    const alFinal = () => {
      v.currentTime = fondo.bucleDesde;
      void v.play().catch(() => undefined);
    };
    if (v.readyState >= 1) alInicio();
    else v.addEventListener('loadedmetadata', alInicio, { once: true });
    v.addEventListener('ended', alFinal);
    return () => {
      v.removeEventListener('loadedmetadata', alInicio);
      v.removeEventListener('ended', alFinal);
    };
  }, [fondo.bucleDesde]);

  return (
    <div role="img" aria-label={etiqueta} className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <video
        ref={ref}
        src={fondo.src}
        poster={poster}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
