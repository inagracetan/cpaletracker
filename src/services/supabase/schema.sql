-- CPALE Tracker — Future CPA
-- Supabase Database Schema & Row Level Security (RLS)

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. User review plans & state table
create table if not exists public.cpale_user_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  profile jsonb not null default '{}'::jsonb,
  exam_plan jsonb not null default '{}'::jsonb,
  weekly_schedule jsonb not null default '[]'::jsonb,
  work_period jsonb not null default '{}'::jsonb,
  rest_days jsonb not null default '[]'::jsonb,
  study_materials jsonb not null default '{}'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  sessions jsonb not null default '[]'::jsonb,
  deadlines jsonb not null default '[]'::jsonb,
  practice_attempts jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb
);

-- Enable Row Level Security (RLS)
alter table public.cpale_user_plans enable row level security;

-- Policies: Users can only read and write their own study records
create policy "Users can view their own CPALE review plan"
  on public.cpale_user_plans
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own CPALE review plan"
  on public.cpale_user_plans
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own CPALE review plan"
  on public.cpale_user_plans
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own CPALE review plan"
  on public.cpale_user_plans
  for delete
  using (auth.uid() = user_id);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_cpale_user_plans_updated_at
  before update on public.cpale_user_plans
  for each row
  execute function public.handle_updated_at();
