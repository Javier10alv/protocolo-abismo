import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Mecanica } from '../types/game';
import type { PropsMecanica } from './tipos';

/** Componentes de cada mecánica, cargados bajo demanda. */
export const COMPONENTES_MECANICA: Record<Mecanica, LazyExoticComponent<ComponentType<PropsMecanica>>> = {
  cableado: lazy(() => import('./Cableado')),
  conversacion: lazy(() => import('./Conversacion')),
  reparto: lazy(() => import('./Reparto')),
  inventario: lazy(() => import('./Inventario')),
  sonar: lazy(() => import('./Sonar')),
  secuencia: lazy(() => import('./Secuencia')),
  energia: lazy(() => import('./Energia')),
};
