-- Protocolo Abismo: clases y partidas con Row Level Security.
--  · El alumnado (rol anon) solo puede INSERTAR partidas terminadas en clases existentes.
--  · Cada docente (rol authenticated) solo ve y gestiona sus propias clases y sus partidas.
--  · Nunca se guardan nombres: solo códigos seudónimos.

create table public.clases (
  id text primary key check (id ~ '^[A-Z0-9-]{2,20}$'),
  docente_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text check (char_length(nombre) <= 80),
  creada_en timestamptz not null default now()
);

create table public.partidas (
  partida_id uuid primary key,
  clase_id text not null references public.clases (id) on delete cascade,
  alumno_codigo text not null check (alumno_codigo ~ '^[A-Z0-9-]{3,12}$'),
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  completada boolean not null,
  estado jsonb not null,
  creada_en timestamptz not null default now(),
  -- Las columnas deben coincidir con el JSON del estado.
  constraint estado_coherente check (
    estado ->> 'partidaId' = partida_id::text
    and estado ->> 'claseId' = clase_id
    and estado ->> 'alumnoCodigo' = alumno_codigo
    and (estado ->> 'completada')::boolean = completada
  ),
  constraint estado_tamano check (pg_column_size(estado) < 65536)
);

create index partidas_clase_idx on public.partidas (clase_id, creada_en desc);

alter table public.clases enable row level security;
alter table public.partidas enable row level security;

-- El rol anon no puede leer `clases` (RLS), así que la comprobación de existencia
-- se hace con una función SECURITY DEFINER que solo devuelve true/false.
create or replace function public.clase_existe(p_clase text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.clases where id = p_clase);
$$;

revoke all on function public.clase_existe(text) from public;
grant execute on function public.clase_existe(text) to anon, authenticated;

-- Clases: cada docente gestiona las suyas.
create policy "docente lee sus clases" on public.clases
  for select to authenticated using (docente_id = auth.uid());
create policy "docente crea clases" on public.clases
  for insert to authenticated with check (docente_id = auth.uid());
create policy "docente edita sus clases" on public.clases
  for update to authenticated using (docente_id = auth.uid()) with check (docente_id = auth.uid());
create policy "docente borra sus clases" on public.clases
  for delete to authenticated using (docente_id = auth.uid());

-- Partidas: el alumnado solo inserta (partidas terminadas, en clases que existen).
create policy "alumno envia partida" on public.partidas
  for insert to anon, authenticated
  with check (completada and public.clase_existe(clase_id));

-- Partidas: el docente solo lee las de sus clases.
create policy "docente lee partidas de sus clases" on public.partidas
  for select to authenticated
  using (exists (select 1 from public.clases c where c.id = partidas.clase_id and c.docente_id = auth.uid()));

create policy "docente borra partidas de sus clases" on public.partidas
  for delete to authenticated
  using (exists (select 1 from public.clases c where c.id = partidas.clase_id and c.docente_id = auth.uid()));

-- Privilegios mínimos (RLS se aplica además de esto).
revoke all on public.partidas from anon;
grant insert on public.partidas to anon;
revoke all on public.clases from anon;
grant select, insert, update, delete on public.clases to authenticated;
grant select, insert, delete on public.partidas to authenticated;
