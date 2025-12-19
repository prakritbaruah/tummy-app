-- Migration for dish and trigger extraction system
-- Creates tables for raw entries, predicted dishes, dishes, dish events, triggers, and their relationships

-- 1. raw_entry table
create table if not exists public.raw_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  raw_entry_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- 2. predicted_dish table
create table if not exists public.predicted_dish (
  id uuid primary key default gen_random_uuid(),
  raw_entry_id uuid not null references public.raw_entry(id) on delete cascade,
  dish_fragment_text text not null,
  dish_name_suggestion text not null,
  model_version text not null,
  prompt_version text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- 3. dish table
create table if not exists public.dish (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  dish_name text not null,
  normalized_dish_name text not null,
  dish_embedding_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dish_user_name_unique unique (user_id, normalized_dish_name)
);

-- 4. dish_events table
create table if not exists public.dish_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  dish_id uuid not null references public.dish(id) on delete cascade,
  predicted_dish_id uuid null references public.predicted_dish(id) on delete set null,
  raw_entry_id uuid not null references public.raw_entry(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

-- 5. triggers table (fixed set of trigger types)
create table if not exists public.triggers (
  id uuid primary key default gen_random_uuid(),
  trigger_name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

-- 6. predicted_dish_triggers table
create table if not exists public.predicted_dish_triggers (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dish(id) on delete cascade,
  dish_event_id uuid not null references public.dish_events(id) on delete cascade,
  trigger_id uuid not null references public.triggers(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  model_version text not null,
  prompt_version text not null,
  constraint predicted_dish_triggers_unique unique (dish_event_id, trigger_id)
);

-- 7. dish_triggers table (user-confirmed triggers)
create table if not exists public.dish_triggers (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dish(id) on delete cascade,
  dish_event_id uuid not null references public.dish_events(id) on delete cascade,
  trigger_id uuid not null references public.triggers(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dish_triggers_unique unique (dish_event_id, trigger_id)
);

-- Indexes for foreign keys and common query patterns
create index if not exists idx_raw_entry_user_id on public.raw_entry (user_id);
create index if not exists idx_raw_entry_created_at on public.raw_entry (created_at desc);

create index if not exists idx_predicted_dish_raw_entry_id on public.predicted_dish (raw_entry_id);

create index if not exists idx_dish_user_id on public.dish (user_id);
create index if not exists idx_dish_normalized_name on public.dish (user_id, normalized_dish_name);

create index if not exists idx_dish_events_user_id on public.dish_events (user_id);
create index if not exists idx_dish_events_dish_id on public.dish_events (dish_id);
create index if not exists idx_dish_events_raw_entry_id on public.dish_events (raw_entry_id);
create index if not exists idx_dish_events_created_at on public.dish_events (created_at desc);

create index if not exists idx_predicted_dish_triggers_dish_id on public.predicted_dish_triggers (dish_id);
create index if not exists idx_predicted_dish_triggers_dish_event_id on public.predicted_dish_triggers (dish_event_id);
create index if not exists idx_predicted_dish_triggers_trigger_id on public.predicted_dish_triggers (trigger_id);

create index if not exists idx_dish_triggers_dish_id on public.dish_triggers (dish_id);
create index if not exists idx_dish_triggers_dish_event_id on public.dish_triggers (dish_event_id);
create index if not exists idx_dish_triggers_trigger_id on public.dish_triggers (trigger_id);

-- Enable RLS on all tables
alter table public.raw_entry enable row level security;
alter table public.predicted_dish enable row level security;
alter table public.dish enable row level security;
alter table public.dish_events enable row level security;
alter table public.triggers enable row level security;
alter table public.predicted_dish_triggers enable row level security;
alter table public.dish_triggers enable row level security;

-- RLS Policies for raw_entry
drop policy if exists raw_entry_owner_policy on public.raw_entry;
create policy raw_entry_owner_policy on public.raw_entry
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS Policies for predicted_dish (accessible via raw_entry ownership)
drop policy if exists predicted_dish_owner_policy on public.predicted_dish;
create policy predicted_dish_owner_policy on public.predicted_dish
  for all using (
    exists (
      select 1 from public.raw_entry
      where raw_entry.id = predicted_dish.raw_entry_id
      and raw_entry.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.raw_entry
      where raw_entry.id = predicted_dish.raw_entry_id
      and raw_entry.user_id = auth.uid()
    )
  );

-- RLS Policies for dish
drop policy if exists dish_owner_policy on public.dish;
create policy dish_owner_policy on public.dish
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS Policies for dish_events
drop policy if exists dish_events_owner_policy on public.dish_events;
create policy dish_events_owner_policy on public.dish_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS Policies for triggers (read-only for all authenticated users, no write needed for v1)
drop policy if exists triggers_select_policy on public.triggers;
create policy triggers_select_policy on public.triggers
  for select using (true);

-- RLS Policies for predicted_dish_triggers (accessible via dish_events ownership)
drop policy if exists predicted_dish_triggers_owner_policy on public.predicted_dish_triggers;
create policy predicted_dish_triggers_owner_policy on public.predicted_dish_triggers
  for all using (
    exists (
      select 1 from public.dish_events
      where dish_events.id = predicted_dish_triggers.dish_event_id
      and dish_events.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.dish_events
      where dish_events.id = predicted_dish_triggers.dish_event_id
      and dish_events.user_id = auth.uid()
    )
  );

-- RLS Policies for dish_triggers (accessible via dish_events ownership)
drop policy if exists dish_triggers_owner_policy on public.dish_triggers;
create policy dish_triggers_owner_policy on public.dish_triggers
  for all using (
    exists (
      select 1 from public.dish_events
      where dish_events.id = dish_triggers.dish_event_id
      and dish_events.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.dish_events
      where dish_events.id = dish_triggers.dish_event_id
      and dish_events.user_id = auth.uid()
    )
  );

-- Seed initial triggers (only insert if they don't exist)
insert into public.triggers (trigger_name)
select unnest(array['gluten', 'dairy', 'nuts', 'caffeine', 'sugar', 'red_meat']::text[])
where not exists (select 1 from public.triggers);



