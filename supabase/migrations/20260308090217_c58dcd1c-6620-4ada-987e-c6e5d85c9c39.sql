
-- Add driver location columns for live tracking
ALTER TABLE public.deliveries 
  ADD COLUMN IF NOT EXISTS driver_lat double precision,
  ADD COLUMN IF NOT EXISTS driver_lng double precision,
  ADD COLUMN IF NOT EXISTS driver_location_updated_at timestamp with time zone;

-- Allow drivers to view pending (unassigned) deliveries so they can accept them
CREATE POLICY "Drivers can view pending deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  status = 'pending' AND driver_id IS NULL AND has_role(auth.uid(), 'driver'::app_role)
);

-- Allow drivers to accept pending deliveries (update driver_id on unassigned ones)
CREATE POLICY "Drivers can accept pending deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  status = 'pending' AND driver_id IS NULL AND has_role(auth.uid(), 'driver'::app_role)
);

-- Enable realtime for deliveries table
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
