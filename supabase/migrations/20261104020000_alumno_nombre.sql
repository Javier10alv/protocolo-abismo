-- Registro con nombre completo (guion 4.0.0).
-- El nombre es un dato personal de un menor: solo lo leen los docentes de la clase
-- (mismas políticas RLS que el resto de la partida) y nunca se envía a la IA.
-- El ID seudónimo (alumno_codigo) se genera en el juego, por ejemplo 'K7Q2-M4X9'.

alter table public.partidas add column alumno_nombre text;

update public.partidas set alumno_nombre = coalesce(estado ->> 'alumnoNombre', alumno_codigo) where alumno_nombre is null;

alter table public.partidas
  alter column alumno_nombre set not null,
  add constraint alumno_nombre_longitud check (char_length(alumno_nombre) between 2 and 80),
  add constraint alumno_nombre_coherente check (estado ->> 'alumnoNombre' = alumno_nombre);
