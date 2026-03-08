
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS estimated_cost numeric DEFAULT 0;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, delivery_id)
    VALUES (
      NEW.customer_id,
      CASE NEW.status
        WHEN 'assigned' THEN 'Driver Assigned'
        WHEN 'in_transit' THEN 'Delivery In Transit'
        WHEN 'delivered' THEN 'Delivery Completed'
        ELSE 'Delivery Update'
      END,
      CASE NEW.status
        WHEN 'assigned' THEN 'A driver has been assigned to your delivery'
        WHEN 'in_transit' THEN 'Your delivery is now on its way'
        WHEN 'delivered' THEN 'Your delivery has been completed successfully'
        ELSE 'Your delivery status has been updated to ' || NEW.status
      END,
      CASE NEW.status WHEN 'delivered' THEN 'success' ELSE 'info' END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_delivery_status_change();

CREATE OR REPLACE FUNCTION public.notify_new_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  driver_record RECORD;
BEGIN
  IF NEW.status = 'pending' THEN
    FOR driver_record IN 
      SELECT dp.user_id FROM public.driver_profiles dp WHERE dp.is_available = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, delivery_id)
      VALUES (
        driver_record.user_id,
        'New Delivery Available',
        'A new delivery request is available: ' || COALESCE(LEFT(NEW.pickup_address, 30), '') || ' → ' || COALESCE(LEFT(NEW.dropoff_address, 30), ''),
        'delivery',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_delivery
  AFTER INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_delivery();
