-- Migration: Initial schema for bookkeeping service
-- Purpose: Create core tables for bank accounts, categories, and transactions
-- Affected tables: bank_accounts, categories, transactions
-- Special considerations: All tables use RLS with user-scoped access

-- Create bank_accounts table
-- Stores user bank accounts with name and creation timestamp
create table public.bank_accounts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.bank_accounts is 'Stores bank accounts for each user. Each account starts with a balance of $0.';

-- Create categories table
-- Stores transaction categories with hierarchical support via parent_id
create table public.categories (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  parent_id bigint references public.categories (id) on delete cascade,
  is_transfer_category boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.categories is 'Stores transaction categories with hierarchical sub-categories. Transfer categories are marked with is_transfer_category flag.';

-- Create transactions table
-- Stores all financial transactions with references to accounts and categories
create table public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_account_id bigint not null references public.bank_accounts (id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null,
  description text not null,
  category_id bigint not null references public.categories (id) on delete restrict,
  transfer_to_account_id bigint references public.bank_accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.transactions is 'Stores all financial transactions. Amount is positive for income, negative for expenses. Transfer transactions link to destination account via transfer_to_account_id.';

-- Enable row level security on all tables
alter table public.bank_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- RLS policies for bank_accounts table
-- Users can only access their own bank accounts

-- Select policy: authenticated users can view their own bank accounts
create policy "Users can view their own bank accounts"
on public.bank_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Insert policy: authenticated users can create their own bank accounts
create policy "Users can create their own bank accounts"
on public.bank_accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Update policy: authenticated users can update their own bank accounts
create policy "Users can update their own bank accounts"
on public.bank_accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Delete policy: authenticated users can delete their own bank accounts
create policy "Users can delete their own bank accounts"
on public.bank_accounts
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- RLS policies for categories table
-- Users can only access their own categories

-- Select policy: authenticated users can view their own categories
create policy "Users can view their own categories"
on public.categories
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Insert policy: authenticated users can create their own categories
create policy "Users can create their own categories"
on public.categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Update policy: authenticated users can update their own categories
create policy "Users can update their own categories"
on public.categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Delete policy: authenticated users can delete their own categories
create policy "Users can delete their own categories"
on public.categories
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- RLS policies for transactions table
-- Users can only access their own transactions

-- Select policy: authenticated users can view their own transactions
create policy "Users can view their own transactions"
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Insert policy: authenticated users can create their own transactions
create policy "Users can create their own transactions"
on public.transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Update policy: authenticated users can update their own transactions
create policy "Users can update their own transactions"
on public.transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Delete policy: authenticated users can delete their own transactions
create policy "Users can delete their own transactions"
on public.transactions
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Create indexes for performance optimization
-- Index on user_id for all tables (used in RLS policies)
create index bank_accounts_user_id_idx on public.bank_accounts (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index transactions_user_id_idx on public.transactions (user_id);

-- Index on foreign keys for join performance
create index transactions_bank_account_id_idx on public.transactions (bank_account_id);
create index transactions_category_id_idx on public.transactions (category_id);
create index categories_parent_id_idx on public.categories (parent_id);

-- Index on date for transaction filtering and sorting
create index transactions_date_idx on public.transactions (date desc);

-- Index on transfer_to_account_id for transfer queries
create index transactions_transfer_to_account_id_idx on public.transactions (transfer_to_account_id);

-- Create function to calculate running balance for a bank account
-- This function calculates the cumulative sum of all transactions for an account
create or replace function public.calculate_account_balance(account_id bigint)
returns numeric
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  balance numeric;
begin
  select coalesce(sum(public.transactions.amount), 0)
  into balance
  from public.transactions
  where public.transactions.bank_account_id = calculate_account_balance.account_id;

  return balance;
end;
$$;

comment on function public.calculate_account_balance is 'Calculates the running balance for a bank account by summing all transaction amounts. Returns 0 if no transactions exist.';

