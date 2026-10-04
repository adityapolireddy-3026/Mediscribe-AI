ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, specialty, hospital, registration_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'specialty',
    NEW.raw_user_meta_data ->> 'hospital',
    NEW.raw_user_meta_data ->> 'registration_number'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'doctor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;