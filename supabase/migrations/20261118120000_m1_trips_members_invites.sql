-- M1: profiles, trips, members, invites + RLS.
-- Every table has RLS on. Default rule: the user is a member of the trip; writes need editor or owner.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create type public.trip_role as enum ('owner', 'editor', 'viewer');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text check (char_length(avatar_url) <= 2048),
  locale text check (locale in ('en', 'it')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  destination text check (char_length(destination) <= 200),
  start_date date,
  end_date date,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  cover_media_id uuid,
  palette jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_ordered check (start_date is null or end_date is null or end_date >= start_date)
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.trip_role not null,
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index trip_members_user_id_idx on public.trip_members (user_id);

create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- sha256 hex of the random token. The raw token only ever exists in the invite link.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  role public.trip_role not null check (role <> 'owner'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_invites_trip_id_idx on public.trip_invites (trip_id);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger trip_members_set_updated_at before update on public.trip_members
  for each row execute function public.set_updated_at();
create trigger trip_invites_set_updated_at before update on public.trip_invites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer so policies on trip_members don't recurse)
-- ---------------------------------------------------------------------------

create function public.trip_role_of(p_trip_id uuid)
returns public.trip_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.trip_members m
  where m.trip_id = p_trip_id
    and m.user_id = (select auth.uid());
$$;

create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.trip_role_of(p_trip_id) is not null;
$$;

create function public.can_edit_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.trip_role_of(p_trip_id) in ('owner', 'editor'), false);
$$;

create function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.trip_role_of(p_trip_id) = 'owner', false);
$$;

create function public.shares_trip_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers: profile on sign-up, owner membership on trip create, owner is immutable
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    left(new.raw_user_meta_data ->> 'avatar_url', 2048)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.add_trip_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger trips_add_owner
  after insert on public.trips
  for each row execute function public.add_trip_owner();

create function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'owner_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trips_prevent_owner_change
  before update on public.trips
  for each row execute function public.prevent_owner_change();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

-- Signed-out visitors get nothing from these tables.
revoke all on public.profiles, public.trips, public.trip_members, public.trip_invites from anon;

-- profiles: readable by yourself and people you share a trip with; writable only by yourself.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_trip_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- trips
-- owner_id check lets INSERT ... RETURNING work before the owner-membership trigger has run.
create policy trips_select on public.trips for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_trip_member(id));
create policy trips_insert on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy trips_update on public.trips for update to authenticated
  using (public.can_edit_trip(id))
  with check (public.can_edit_trip(id));
create policy trips_delete on public.trips for delete to authenticated
  using (public.is_trip_owner(id));

-- trip_members: rows are created only by triggers / accept_invite.
create policy trip_members_select on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_members_update on public.trip_members for update to authenticated
  using (public.is_trip_owner(trip_id) and role <> 'owner')
  with check (public.is_trip_owner(trip_id) and role <> 'owner');
create policy trip_members_delete on public.trip_members for delete to authenticated
  using (
    role <> 'owner'
    and (public.is_trip_owner(trip_id) or user_id = (select auth.uid()))
  );

-- trip_invites: owner only.
create policy trip_invites_select on public.trip_invites for select to authenticated
  using (public.is_trip_owner(trip_id));
create policy trip_invites_insert on public.trip_invites for insert to authenticated
  with check (public.is_trip_owner(trip_id) and created_by = (select auth.uid()));
create policy trip_invites_update on public.trip_invites for update to authenticated
  using (public.is_trip_owner(trip_id))
  with check (public.is_trip_owner(trip_id));
create policy trip_invites_delete on public.trip_invites for delete to authenticated
  using (public.is_trip_owner(trip_id));

-- ---------------------------------------------------------------------------
-- Invite RPCs: the only way to read an invite or join a trip without being a member
-- ---------------------------------------------------------------------------

create function public.invite_preview(p_token text)
returns table (trip_title text, destination text, start_date date, end_date date, role public.trip_role)
language sql
stable
security definer
set search_path = ''
as $$
  select t.title, t.destination, t.start_date, t.end_date, i.role
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where (select auth.uid()) is not null
    and char_length(p_token) between 32 and 128
    and i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now())
    and t.archived_at is null;
$$;

create function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_invite public.trip_invites%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_token is null or char_length(p_token) not between 32 and 128 then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  select i.* into v_invite
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now())
    and t.archived_at is null;

  if not found then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  -- Existing members keep their current role (an invite never downgrades or upgrades).
  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, v_user, v_invite.role)
  on conflict (trip_id, user_id) do nothing;

  return v_invite.trip_id;
end;
$$;

-- Keep-alive for the free Supabase project (called by a daily Vercel Cron).
create function public.ping()
returns integer
language sql
stable
set search_path = ''
as $$
  select 1;
$$;

-- Function privileges: nothing is executable by default; grant what the app calls.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.trip_role_of(uuid) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.can_edit_trip(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;
grant execute on function public.shares_trip_with(uuid) to authenticated;
grant execute on function public.invite_preview(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.ping() to anon, authenticated;
