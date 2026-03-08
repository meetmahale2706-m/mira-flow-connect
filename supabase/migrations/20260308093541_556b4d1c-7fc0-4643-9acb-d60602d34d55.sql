
CREATE OR REPLACE FUNCTION public.check_driver_proximity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dist_km double precision;
  already_notified boolean;
BEGIN
  -- Only check for in_transit deliveries with driver location
  IF NEW.status = 'in_transit' AND NEW.driver_lat IS NOT NULL AND NEW.dropoff_lat IS NOT NULL THEN
    -- Calculate distance using Haversine
    dist_km := 6371 * 2 * asin(sqrt(
      sin(radians(NEW.dropoff_lat - NEW.driver_lat) / 2) ^ 2 +
      cos(radians(NEW.driver_lat)) * cos(radians(NEW.dropoff_lat)) *
      sin(radians(NEW.dropoff_lng - NEW.driver_lng) / 2) ^ 2
    ));

    -- If within 500m (0.5km), notify customer
    IF dist_km <= 0.5 AND NEW.customer_id IS NOT NULL THEN
      -- Check if we already sent a proximity notification for this delivery
      SELECT EXISTS(
        SELECT 1 FROM public.notifications
        WHERE delivery_id = NEW.id AND user_id = NEW.customer_id AND type = 'proximity'
      ) INTO already_notified;

      IF NOT already_notified THEN
        INSERT INTO public.notifications (user_id, title, message, type, delivery_id)
        VALUES (
          NEW.customer_id,
          'Driver Nearby! 📍',
          'Your driver is less than 500m away. Please be ready for delivery!',
          'proximity',
          NEW.id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_driver_location_update
  AFTER UPDATE OF driver_lat, driver_lng ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION check_driver_proximity();
