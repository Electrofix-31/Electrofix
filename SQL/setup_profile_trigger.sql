-- Cette fonction s'exécute à chaque fois qu'un utilisateur s'inscrit via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- On crée le profil automatiquement dans la table 'profiles'
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencheur (Trigger) après chaque création dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
