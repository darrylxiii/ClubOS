-- Migration: Add EUR snapshot columns to operating_expenses and vendor_subscriptions

-- 1. operating_expenses: add amount_eur column
ALTER TABLE public.operating_expenses
  ADD COLUMN IF NOT EXISTS amount_eur numeric;

-- Backfill: existing EUR rows, amount_eur = amount
UPDATE public.operating_expenses
  SET amount_eur = amount
  WHERE currency = 'EUR' OR currency IS NULL;

-- 2. vendor_subscriptions: add monthly_cost_eur column
ALTER TABLE public.vendor_subscriptions
  ADD COLUMN IF NOT EXISTS monthly_cost_eur numeric;

-- Backfill: existing EUR rows, monthly_cost_eur = monthly_cost
UPDATE public.vendor_subscriptions
  SET monthly_cost_eur = monthly_cost
  WHERE currency = 'EUR' OR currency IS NULL;