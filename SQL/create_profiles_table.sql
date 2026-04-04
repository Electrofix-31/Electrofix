CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'client'::text NOT NULL,
  first_name text NULL,
  last_name text NULL,
  address text NULL,
  phone text NULL,
  CONSTRAINT valid_role CHECK (role IN ('client', 'technician', 'admin'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
