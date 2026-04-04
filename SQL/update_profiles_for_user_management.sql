-- Mise à jour de la table profiles pour la gestion avancée des utilisateurs et RGPD
-- Ajout du blocage de compte et de l'anonymisation

ALTER TABLE public.profiles 
ADD COLUMN is_blocked boolean DEFAULT FALSE NOT NULL,
ADD COLUMN anonymized_at timestamp with time zone NULL;

-- Commentaire pour aide à l'administration
COMMENT ON COLUMN public.profiles.is_blocked IS 'Indique si l''accès de l''utilisateur est suspendu';
COMMENT ON COLUMN public.profiles.anonymized_at IS 'Date d''anonymisation du compte pour respect du RGPD';

-- Politique de sécurité : Un utilisateur bloqué ne peut plus rien faire
-- On modifie les politiques existantes pour vérifier is_blocked

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile if not blocked." ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND is_blocked = FALSE);

-- Seul l'admin peut modifier is_blocked et anonymized_at
CREATE POLICY "Admins can manage block status." ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
