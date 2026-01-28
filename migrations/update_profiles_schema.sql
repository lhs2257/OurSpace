-- Update profiles table schema to include email and theme_color
-- This is required for the team member list and chat features

-- Add columns if they don't exist
alter table public.profiles 
add column if not exists email text,
add column if not exists theme_color text default 'blue';

-- Update the handle_new_user function to include email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Attempt to backfill email for existing profiles
-- This relies on the SQL Editor user having permissions to access auth.users
do $$
begin
    update public.profiles p
    set email = u.email
    from auth.users u
    where p.id = u.id
    and p.email is null;
exception
    when others then
        raise notice 'Could not backfill emails automatically: %', SQLERRM;
end $$;
