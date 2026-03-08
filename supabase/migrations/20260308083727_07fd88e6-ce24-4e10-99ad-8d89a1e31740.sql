
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS package_weight numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_time_mins integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lng double precision,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Allow customers to create deliveries
CREATE POLICY "Customers can create deliveries"
  ON public.deliveries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Allow customers to update own deliveries (cancel)
CREATE POLICY "Customers can update own deliveries"
  ON public.deliveries FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id);
