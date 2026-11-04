import { Navigate, useNavigate } from 'react-router';
import GameEngine from '../components/GameEngine';
import { enviarPartida } from '../servicios/partidas';
import { useGameStore } from '../store/useGameStore';

export default function Jugar() {
  const navigate = useNavigate();
  const alumnoCodigo = useGameStore((s) => s.alumnoCodigo);
  // Sin código de alumno no hay partida: vuelve a la pantalla de entrada.
  if (alumnoCodigo === 'ANON') return <Navigate to="/" replace />;
  return <GameEngine onPartidaFinalizada={enviarPartida} onSalir={() => navigate('/')} />;
}
