-- =====================================================================
-- EventSpark Complete Production Supabase Database Schema
-- Safe, Idempotent, High-Concurrency (1,000+ Concurrent Users)
-- Can be re-run at any time in the Supabase SQL Editor with ZERO errors.
-- =====================================================================

-- 1. Ensure required PostgreSQL extensions are enabled
create extension if not exists "uuid-ossp";

create extension if not exists "pgcrypto";

-- 2. Safe Cascade Drops (Reset existing objects cleanly)
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user () cascade;

drop function if exists public.register_for_event (uuid, text, text, text, text) cascade;

drop function if exists public.get_event_reg_count (uuid) cascade;

drop table if exists public.registrations cascade;

drop table if exists public.events cascade;

drop table if exists public.profiles cascade;

-- 3. Profiles Table (Stores Organizer & User Profiles)
create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text default '',
    email text not null,
    role text default 'organizer',
    created_at timestamptz default now()
);

-- Backfill profiles for any existing users in auth.users
insert into
    public.profiles (id, full_name, email)
select id, coalesce(
        raw_user_meta_data ->> 'full_name', split_part (email, '@', 1)
    ), coalesce(email, '')
from auth.users on conflict (id) do nothing;

-- 4. Events Table (Stores Hosted Events)
create table public.events (
    id uuid primary key default gen_random_uuid (),
    organizer_id uuid not null references public.profiles (id) on delete cascade,
    title text not null,
    description text not null,
    category text default 'Other',
    cover_image text,
    start_date date not null,
    end_date date,
    start_time time,
    end_time time,
    location text,
    event_mode text default 'offline',
    max_attendees integer,
    registration_deadline date,
    registration_enabled boolean default true,
    status text default 'published',
    created_at timestamptz default now()
);

-- 5. Registrations Table (Stores Attendee Ticket Registrations)
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_name text not null,
  email text not null,
  phone text default '',
  organization text default '',
  registration_status text default 'registered',
  registration_code text unique default ('ES-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  created_at timestamptz default now(),
  unique (event_id, email)
);

-- 6. Performance Composite Indexes for 1,000+ Concurrency
create index if not exists events_owner_idx on public.events (organizer_id);

create index if not exists events_status_idx on public.events (status);

create index if not exists events_start_date_idx on public.events (start_date);

create index if not exists regs_event_idx on public.registrations (event_id);

create index if not exists regs_email_idx on public.registrations (email);

create index if not exists profiles_email_idx on public.profiles (email);

-- 7. Trigger Function: Automatically Create/Sync Profile upon Auth Signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    email = excluded.email;

return new;

end;
$$;


create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

-- Profiles Policies
create policy "allow_profiles_read_all" on public.profiles for
select using (true);


create policy "allow_profiles_insert_owner" on public.profiles for
insert
with
    check (auth.uid () = id);

create policy "allow_profiles_update_owner" on public.profiles for
update using (auth.uid () = id)
with
    check (auth.uid () = id);

-- Events Policies
create policy "allow_events_select" on public.events for
select using (
        status = 'published'
        or auth.uid () = organizer_id
    );

create policy "allow_events_insert" on public.events for
insert
with
    check (auth.uid () = organizer_id);

create policy "allow_events_update" on public.events for
update using (auth.uid () = organizer_id)
with
    check (auth.uid () = organizer_id);

create policy "allow_events_delete" on public.events for delete using (auth.uid () = organizer_id);

-- Registrations Policies
create policy "allow_regs_select_owner" on public.registrations for
select using (
        exists (
            select 1
            from public.events e
            where
                e.id = registrations.event_id
                and e.organizer_id = auth.uid ()
        )
    );


create policy "allow_regs_update_owner" on public.registrations for
update using (
    exists (
        select 1
        from public.events e
        where
            e.id = registrations.event_id
            and e.organizer_id = auth.uid ()
    )
)
with
    check (
        exists (
            select 1
            from public.events e
            where
                e.id = registrations.event_id
                and e.organizer_id = auth.uid ()
        )
    );

create policy "allow_regs_delete_owner"
  on public.registrations for delete
  using (
    exists (
      select 1 from public.events e
      where e.id = registrations.event_id and e.organizer_id = auth.uid()
    )

);

-- 9. Helper Function: Real-time Public Registration Count
create or replace function public.get_event_reg_count(p_event_id uuid)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.registrations
  where event_id = p_event_id and registration_status <> 'cancelled';
$$;

-- 10. Atomic Public Registration RPC (Concurrency Protected with Row Lock)
create or replace function public.register_for_event(
  p_event_id uuid,
  p_name text,
  p_email text,
  p_phone text default '',
  p_organization text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;

reg public.registrations % rowtype;

active_count int;

clean_email text;

clean_name text;

begin
  clean_email := lower(trim(p_email));
  clean_name := trim(p_name);

  if clean_name = '' or clean_email = '' then
    raise exception 'Name and email are required';
  end if;

  -- Atomic row lock on event to prevent overbooking race condition
  select * into ev
  from public.events
  where id = p_event_id and status = 'published'
  for update;

  if not found then
    raise exception 'Event unavailable or not published';
  end if;

  if not ev.registration_enabled then
    raise exception 'Registration is closed for this event';
  end if;

  if ev.registration_deadline is not null and ev.registration_deadline < current_date then
    raise exception 'Registration deadline has passed';
  end if;

  select count(*) into active_count
  from public.registrations
  where event_id = p_event_id and registration_status <> 'cancelled';

  if ev.max_attendees is not null and active_count >= ev.max_attendees then
    raise exception 'This event is full (capacity reached)';
  end if;

  insert into public.registrations (
    event_id,
    participant_name,
    email,
    phone,
    organization
  ) values (
    p_event_id,
    clean_name,
    clean_email,
    trim(coalesce(p_phone, '')),
    trim(coalesce(p_organization, ''))
  )
  returning * into reg;

return jsonb_build_object (
    'id',
    reg.id,
    'registration_code',
    reg.registration_code
);

exception when unique_violation then raise exception 'This email is already registered for this event';

end;

$$;

-- 11. Grant Execution Rights
grant
execute on function public.get_event_reg_count (uuid) to anon,
authenticated,
service_role;

grant
execute on function public.register_for_event (uuid, text, text, text, text) to anon,
authenticated,
service_role;