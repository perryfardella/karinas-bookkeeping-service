-- Migration: Auto-seed default categories for new users
-- Purpose: Automatically create default categories when a new user is created
-- Affected tables: categories
-- Special considerations: Uses database trigger to call seed function

-- Create trigger function to seed categories when a new user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Seed default categories for the new user
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

comment on function public.handle_new_user is 'Trigger function that seeds default categories when a new user is created.';

-- Create trigger on auth.users table
-- Note: This requires access to auth.users, which may need to be set up via Supabase dashboard
-- Alternative: Call seed_default_categories manually on first login/dashboard access
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

