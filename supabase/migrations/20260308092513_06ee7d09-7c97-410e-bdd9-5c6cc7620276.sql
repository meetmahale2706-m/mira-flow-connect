
CREATE TABLE public.driver_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_out_at timestamptz,
  ip_address text DEFAULT '',
  device_info text DEFAULT ''
);

ALTER TABLE public.driver_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own checkins"
  ON public.driver_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert own checkins"
  ON public.driver_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own checkins"
  ON public.driver_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins"
  ON public.driver_checkins FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
