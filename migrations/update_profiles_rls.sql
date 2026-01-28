-- Add policy to allow authenticated users to view all profiles
-- This is needed for the team member list and chat features

-- Check existing policies on profiles
select * from pg_policies where tablename = 'profiles';

-- Enable RLS if not already enabled (it should be)
alter table public.profiles enable row level security;

-- Create policy to allow all authenticated users to view all profiles
-- Drop existing policy if it exists to avoid conflicts (or create if not exists)
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can view all profiles" on profiles;

create policy "Users can view all profiles"
    on profiles for select
    using (auth.role() = 'authenticated');

-- Also check if we need update policy for users to update their own profile
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can update own profile"
    on profiles for update
    using (auth.uid() = id);

-- Allow users to insert their own profile (usually handled by triggers but good to have)
drop policy if exists "Users can insert own profile" on profiles;

create policy "Users can insert own profile"
    on profiles for insert
    with check (auth.uid() = id);
