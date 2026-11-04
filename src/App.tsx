import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Entrada from './paginas/Entrada';
import Jugar from './paginas/Jugar';
import { useAjustesStore } from './store/useAjustesStore';

// El panel del docente (con Recharts) se carga solo cuando se visita.
const Docente = lazy(() => import('./paginas/Docente'));

export default function App() {
  const textoGrande = useAjustesStore((s) => s.textoGrande);
  useEffect(() => {
    document.documentElement.classList.toggle('texto-grande', textoGrande);
  }, [textoGrande]);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-dvh bg-slate-950" />}>
        <Routes>
          <Route path="/" element={<Entrada />} />
          <Route path="/jugar" element={<Jugar />} />
          <Route path="/docente" element={<Docente />} />
          <Route path="*" element={<Entrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
