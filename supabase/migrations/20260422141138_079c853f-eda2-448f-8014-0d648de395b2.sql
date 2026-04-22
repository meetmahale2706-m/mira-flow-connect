ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS upi_transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;