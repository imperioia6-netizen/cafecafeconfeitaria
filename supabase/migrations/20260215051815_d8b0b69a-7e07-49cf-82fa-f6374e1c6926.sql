
-- The 'client' value already exists in app_role enum (confirmed in types.ts)

-- Update handle_new_user to read role, phone, birthday from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  INSERT INTO public.profiles (user_id, name, phone, birthday)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'birthday' IS NOT NULL 
         THEN (NEW.raw_user_meta_data->>'birthday')::date 
         ELSE NULL END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role::app_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
