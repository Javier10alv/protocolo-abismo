import { useEffect, useRef } from 'react';
import type { FondoVideo, Personaje, Scene } from '../types/game';
import { NOMBRE_PERSONAJE, SPRITE_PERSONAJE } from './Retrato';

/**
 * Escenario de una escena: fondo estático (imagen) o en vídeo (bucle silencioso)
 * y, encima, los sprites de los personajes presentes. Todo es decorativo y no
 * captura clics (pointer-events-none): la interacción vive en el panel de diálogo.
 */
export default function Escenario({ escena, visible }: { escena: Scene; visible: boolean }) {
  // Si el fondo es un vídeo, los personajes ya aparecen en él: no se dibujan sprites encima.
  const personajes = escena.fondoVideo ? [] : (escena.personajes ?? []);

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

      <CapaPersonajes personajes={personajes} visible={visible} />
    </div>
  );
}

/**
 * Coloca a Leo a la izquierda y a Lisa a la derecha, como en las cinemáticas.
 * En móvil se anclan arriba (se ve cabeza y torso sobre el panel); desde `sm`, de pie sobre el suelo.
 */
const LADO: Record<Personaje, 'izquierda' | 'derecha'> = { leo: 'izquierda', lisa: 'derecha' };

function CapaPersonajes({ personajes, visible }: { personajes: Personaje[]; visible: boolean }) {
  if (personajes.length === 0) return null;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {personajes.map((p, i) => {
        const izquierda = personajes.length === 1 ? i === 0 && LADO[p] === 'izquierda' : LADO[p] === 'izquierda';
        return (
          <img
            key={p}
            src={SPRITE_PERSONAJE[p]}
            alt={NOMBRE_PERSONAJE[p]}
            draggable={false}
            className={`absolute top-[7dvh] h-[62dvh] w-auto sm:top-auto sm:bottom-0 max-w-none select-none drop-shadow-[0_0_24px_rgba(8,145,178,0.35)] transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none sm:h-[78dvh] lg:h-[86dvh] ${
              izquierda ? 'left-[-4%] sm:left-[2%] lg:left-[6%]' : 'right-[-4%] sm:right-[2%] lg:right-[6%]'
            } ${visible ? 'translate-x-0 opacity-100' : izquierda ? '-translate-x-8 opacity-0' : 'translate-x-8 opacity-0'}`}
            style={{
              transitionDelay: `${200 + i * 150}ms`,
              // Ligera penumbra para integrarlos con la luz de la estación.
              filter: 'brightness(0.92) saturate(0.95)',
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
