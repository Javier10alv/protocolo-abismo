-- Guion 5.0.0: telemetría de eventos y ajustes manuales del docente.

-- 1) El estado guarda ahora los eventos de cada minijuego: se amplía el tamaño máximo.
alter table public.partidas drop constraint estado_tamano;
alter table public.partidas add constraint estado_tamano check (pg_column_size(estado) < 524288);

-- 2) Ajustes del docente: puede subir o bajar la banda de una habilidad con un motivo.
--    El valor calculado por el juego no se toca (queda en `partidas.estado`).
create table public.ajustes_docente (
  partida_id uuid not null references public.partidas (partida_id) on delete cascade,
  habilidad text not null check (habilidad in ('logica', 'creatividad', 'comunicacion', 'resiliencia', 'liderazgo')),
  banda text not null check (banda in ('emergente', 'desarrollo', 'consolidado')),
  motivo text not null check (char_length(motivo) between 3 and 500),
  docente_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  actualizado_en timestamptz not null default now(),
  primary key (partida_id, habilidad)
);

alter table public.ajustes_docente enable row level security;

-- Solo el docente dueño de la clase de esa partida puede leer y escribir sus ajustes.
create policy "docente gestiona ajustes de sus clases" on public.ajustes_docente
  for all to authenticated
  using (exists (
    select 1 from public.partidas p join public.clases c on c.id = p.clase_id
    where p.partida_id = ajustes_docente.partida_id and c.docente_id = auth.uid()
  ))
  with check (
    docente_id = auth.uid()
    and exists (
      select 1 from public.partidas p join public.clases c on c.id = p.clase_id
      where p.partida_id = ajustes_docente.partida_id and c.docente_id = auth.uid()
    )
  );

revoke all on public.ajustes_docente from anon;
grant select, insert, update, delete on public.ajustes_docente to authenticated;
