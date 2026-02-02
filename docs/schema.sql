-- Extensions
create extension if not exists "pgcrypto";

-- Servers
create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Memberships
create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

-- Channels
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null,
  type text not null check (type in ('text', 'voice')),
  created_at timestamptz not null default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

-- Server policies
create policy "servers_select_member"
on public.servers for select
to authenticated
using (
  exists (
    select 1
    from public.server_members sm
    where sm.server_id = id and sm.user_id = auth.uid()
  )
);

create policy "servers_insert_owner"
on public.servers for insert
to authenticated
with check (owner_id = auth.uid());

-- Member policies
create policy "server_members_select_self"
on public.server_members for select
to authenticated
using (user_id = auth.uid());

create policy "server_members_insert_owner"
on public.server_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.servers s
    where s.id = server_id and s.owner_id = auth.uid()
  )
);

-- Channel policies
create policy "channels_select_member"
on public.channels for select
to authenticated
using (
  exists (
    select 1
    from public.server_members sm
    where sm.server_id = server_id and sm.user_id = auth.uid()
  )
);

create policy "channels_insert_owner"
on public.channels for insert
to authenticated
with check (
  exists (
    select 1
    from public.servers s
    where s.id = server_id and s.owner_id = auth.uid()
  )
);

-- Message policies
create policy "messages_select_member"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.channels c
    join public.server_members sm on sm.server_id = c.server_id
    where c.id = channel_id and sm.user_id = auth.uid()
  )
);

create policy "messages_insert_member"
on public.messages for insert
to authenticated
with check (
  exists (
    select 1
    from public.channels c
    join public.server_members sm on sm.server_id = c.server_id
    where c.id = channel_id and sm.user_id = auth.uid()
  )
);
