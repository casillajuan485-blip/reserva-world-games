-- Perfil mínimo. Supabase Auth administra las cuentas y sus contraseñas.
begin;

create table if not exists public.perfiles (
  usuario_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60)
);

alter table public.perfiles enable row level security;
revoke all on public.perfiles from public, anon, authenticated;
grant select, insert on public.perfiles to authenticated;

drop policy if exists perfil_propio_lectura on public.perfiles;
create policy perfil_propio_lectura on public.perfiles
  for select to authenticated using ((select auth.uid()) = usuario_id);

drop policy if exists perfil_propio_creacion on public.perfiles;
create policy perfil_propio_creacion on public.perfiles
  for insert to authenticated with check ((select auth.uid()) = usuario_id);

-- La confirmación del correo y el perfil son independientes del almacenamiento del navegador.
create or replace function public.crear_perfil_world_games()
returns trigger language plpgsql security definer set search_path = ''
as $
declare nombre text := btrim(new.raw_user_meta_data->>'nombre');
begin
  if char_length(nombre) between 2 and 60 then
    insert into public.perfiles (usuario_id, nombre) values (new.id, nombre)
    on conflict (usuario_id) do nothing;
  end if;
  return new;
end;
$;
revoke all on function public.crear_perfil_world_games() from public, anon, authenticated;
drop trigger if exists world_games_perfil_registro on auth.users;
create trigger world_games_perfil_registro after insert on auth.users
  for each row execute function public.crear_perfil_world_games();
commit;
