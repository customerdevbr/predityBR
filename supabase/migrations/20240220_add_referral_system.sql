-- Add referral_code and referred_by to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Auto-generate 8-char uppercase referral code for all existing users
UPDATE public.users
SET referral_code = UPPER(SUBSTRING(MD5(id::text || email) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create referral_commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.users(id) NOT NULL,
  referred_id UUID REFERENCES public.users(id) NOT NULL,
  deposit_id UUID REFERENCES transactions(id),
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'PAID',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for referral_commissions
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own commissions" ON referral_commissions;
CREATE POLICY "Users can view own commissions"
ON referral_commissions FOR SELECT
USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Admins can view all commissions" ON referral_commissions;
CREATE POLICY "Admins can view all commissions"
ON referral_commissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
);

-- Update trigger to also generate referral_code on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, cpf, dob, avatar_url, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'dob',
    NEW.raw_user_meta_data->>'avatar_url',
    UPPER(SUBSTRING(MD5(NEW.id::text || NEW.email) FROM 1 FOR 8))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    cpf = COALESCE(EXCLUDED.cpf, public.users.cpf),
    dob = COALESCE(EXCLUDED.dob, public.users.dob),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    referral_code = COALESCE(public.users.referral_code, EXCLUDED.referral_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
