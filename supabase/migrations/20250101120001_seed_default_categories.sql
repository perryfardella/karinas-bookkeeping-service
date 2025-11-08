-- Migration: Seed default categories for new users
-- Purpose: Create default category structure for healthcare business users
-- Affected tables: categories
-- Special considerations: Categories are created per user via trigger function

-- Create function to seed default categories for a new user
-- This function will be called when a new user signs up
create or replace function public.seed_default_categories(user_uuid uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  income_parent_id bigint;
  expenses_parent_id bigint;
  business_expenses_parent_id bigint;
begin
  -- Create top-level Income category
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values (user_uuid, 'Income', null, false)
  returning id into income_parent_id;

  -- Create Income sub-categories
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values
    (user_uuid, 'Contracting Income', income_parent_id, false),
    (user_uuid, 'Dividend Payments', income_parent_id, false);

  -- Create top-level Expenses category
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values (user_uuid, 'Expenses', null, false)
  returning id into expenses_parent_id;

  -- Create Business Expenses parent category
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values (user_uuid, 'Business Expenses', expenses_parent_id, false)
  returning id into business_expenses_parent_id;

  -- Create Business Expenses sub-categories
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values
    (user_uuid, 'Motor Vehicle Expenses', business_expenses_parent_id, false),
    (user_uuid, 'Healthcare Supplies', business_expenses_parent_id, false);

  -- Create other expense categories
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values
    (user_uuid, 'Employee Payments', expenses_parent_id, false),
    (user_uuid, 'Loans to Sole Shareholder', expenses_parent_id, false),
    (user_uuid, 'Utilities', expenses_parent_id, false),
    (user_uuid, 'Rent/Office Space', expenses_parent_id, false);

  -- Create top-level Transfers category
  -- Transfer categories will be created dynamically when bank accounts are created
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values (user_uuid, 'Transfers', null, false);

  -- Create top-level Assets category
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values (user_uuid, 'Assets', null, false);

  -- Create top-level Liabilities category
  insert into public.categories (user_id, name, parent_id, is_transfer_category)
  values (user_uuid, 'Liabilities', null, false);
end;
$$;

comment on function public.seed_default_categories is 'Seeds default categories for a new user including Income, Expenses with sub-categories, Transfers, Assets, and Liabilities. Should be called after user creation.';

