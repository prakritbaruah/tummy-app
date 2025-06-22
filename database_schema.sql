-- Enable Row Level Security
alter table auth.users enable row level security;

-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Create food_entries table
create table food_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity text not null,
  notes text,
  timestamp bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on food_entries
alter table food_entries enable row level security;

-- Create symptom_entries table
create table symptom_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null check (name in ('Abdominal Pain', 'Bloating', 'Nausea', 'Vomiting', 'Gas', 'Heartburn', 'Loss of Appetite', 'Fatigue')),
  timing text not null check (timing in ('Morning', 'Afternoon', 'Evening')),
  severity text not null check (severity in ('Low', 'Mild', 'Moderate', 'High', 'Severe')),
  timestamp bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on symptom_entries
alter table symptom_entries enable row level security;

-- Create bowel_entries table
create table bowel_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  timing text not null check (timing in ('Morning', 'Afternoon', 'Evening')),
  urgency text not null check (urgency in ('Low', 'Medium', 'High')),
  consistency integer check (consistency >= 1 and consistency <= 7),
  mucus_present boolean not null default false,
  blood_present boolean not null default false,
  timestamp bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on bowel_entries
alter table bowel_entries enable row level security;

-- Create RLS policies for profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Create RLS policies for food_entries
create policy "Users can view own food entries" on food_entries for select using (auth.uid() = user_id);
create policy "Users can insert own food entries" on food_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own food entries" on food_entries for update using (auth.uid() = user_id);
create policy "Users can delete own food entries" on food_entries for delete using (auth.uid() = user_id);

-- Create RLS policies for symptom_entries
create policy "Users can view own symptom entries" on symptom_entries for select using (auth.uid() = user_id);
create policy "Users can insert own symptom entries" on symptom_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own symptom entries" on symptom_entries for update using (auth.uid() = user_id);
create policy "Users can delete own symptom entries" on symptom_entries for delete using (auth.uid() = user_id);

-- Create RLS policies for bowel_entries
create policy "Users can view own bowel entries" on bowel_entries for select using (auth.uid() = user_id);
create policy "Users can insert own bowel entries" on bowel_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own bowel entries" on bowel_entries for update using (auth.uid() = user_id);
create policy "Users can delete own bowel entries" on bowel_entries for delete using (auth.uid() = user_id);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create indexes for better performance
create index food_entries_user_id_idx on food_entries(user_id);
create index food_entries_created_at_idx on food_entries(created_at desc);
create index symptom_entries_user_id_idx on symptom_entries(user_id);
create index symptom_entries_created_at_idx on symptom_entries(created_at desc);
create index bowel_entries_user_id_idx on bowel_entries(user_id);
create index bowel_entries_created_at_idx on bowel_entries(created_at desc); 