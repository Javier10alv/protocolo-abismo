import { Navigate, useNavigate } from 'react-router';
import GameEngine from '../components/GameEngine';
import { enviarPartida } from '../servicios/partidas';
import { SIN_ALUMNO, useGameStore } from '../store/useGameStore';

export default function Jugar() {
  const navigate = useNavigate();
  const alumnoCodigo = useGameStore((s) => s.alumnoCodigo);
  // Sin alumno identificado no hay partida: vuelve a la pantalla de entrada.
  if (alumnoCodigo === SIN_ALUMNO) return <Navigate to="/" replace />;
  return <GameEngine onPartidaFinalizada={enviarPartida} onSalir={() => navigate('/')} />;
}
