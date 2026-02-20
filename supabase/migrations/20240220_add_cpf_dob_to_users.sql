-- Add cpf and dob columns to public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob TEXT;

-- Update existing rows from auth.users metadata (backfill for existing users)
UPDATE public.users u
SET
  cpf = am.raw_user_meta_data->>'cpf',
  dob = am.raw_user_meta_data->>'dob'
FROM auth.users am
WHERE am.id = u.id
  AND (am.raw_user_meta_data->>'cpf' IS NOT NULL OR am.raw_user_meta_data->>'dob' IS NOT NULL);

-- Update or create trigger function that syncs full_name, cpf, dob from auth metadata on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, cpf, dob, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'dob',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    cpf = COALESCE(EXCLUDED.cpf, public.users.cpf),
    dob = COALESCE(EXCLUDED.dob, public.users.dob),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to apply updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
