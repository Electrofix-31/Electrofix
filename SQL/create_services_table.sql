CREATE TABLE public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text NULL,
  price numeric(10, 2) NOT NULL,
  type text NOT NULL,
  CONSTRAINT valid_service_type CHECK (type IN ('atelier', 'domicile', 'both'))
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir tous les services disponibles
CREATE POLICY "Public services are viewable by everyone." ON public.services
  FOR SELECT USING (TRUE);

-- Les administrateurs peuvent insérer de nouveaux services
CREATE POLICY "Admins can insert services." ON public.services
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Les administrateurs peuvent mettre à jour les services
CREATE POLICY "Admins can update services." ON public.services
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Les administrateurs peuvent supprimer des services
CREATE POLICY "Admins can delete services." ON public.services
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
