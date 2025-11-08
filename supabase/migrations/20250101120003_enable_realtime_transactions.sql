-- Migration: Enable Realtime for transactions table
-- Purpose: Enable Supabase Realtime subscriptions for the transactions table
-- Affected tables: transactions
-- Special considerations: Realtime is needed for live updates when transactions are added/modified

-- Enable Realtime for transactions table
-- This allows clients to subscribe to changes via postgres_changes
alter publication supabase_realtime add table public.transactions;

comment on table public.transactions is 'Realtime enabled: Clients can subscribe to INSERT, UPDATE, DELETE events on this table.';

