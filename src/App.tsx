import GameEngine from './components/GameEngine';
import type { EstadoAlumno } from './types/game';

// Aquí irá el envío a Supabase. Hacedlo idempotente (upsert por partidaId):
// si el alumno recarga en la pantalla final, se volverá a llamar.
function enviarTelemetria(estado: EstadoAlumno) {
  console.log('Telemetría de la partida', estado);
}

export default function App() {
  return <GameEngine onPartidaFinalizada={enviarTelemetria} />;
}
