
-- Ratings & Reviews
CREATE TABLE public.delivery_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(delivery_id)
);

ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert own ratings"
  ON public.delivery_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view own ratings"
  ON public.delivery_ratings FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Drivers can view own ratings"
  ON public.delivery_ratings FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can view all ratings"
  ON public.delivery_ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Delivery Scheduling columns
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS scheduled_time_slot text DEFAULT '';

-- Support chat messages
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
