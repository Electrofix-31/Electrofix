CREATE TABLE public.technicians (
  profile_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL PRIMARY KEY,
  is_available_store boolean DEFAULT FALSE NOT NULL,
  is_available_field boolean DEFAULT FALSE NOT NULL,
  assigned_zone text NULL, -- Pour une future géo-optimisation plus fine
  schedule jsonb NULL -- Pour stocker les horaires fixes (ex: {"monday": {"start": "09:00", "end": "17:00"}})
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- Les techniciens peuvent voir leurs propres infos
CREATE POLICY "Technicians can view their own data." ON public.technicians
  FOR SELECT USING (auth.uid() = profile_id);

-- Les administrateurs peuvent voir toutes les infos des techniciens
CREATE POLICY "Admins can view all technicians data." ON public.technicians
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Les administrateurs peuvent insérer de nouveaux techniciens
CREATE POLICY "Admins can insert technicians." ON public.technicians
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Les techniciens peuvent mettre à jour leur propre disponibilité/zone
CREATE POLICY "Technicians can update their own data." ON public.technicians
  FOR UPDATE USING (auth.uid() = profile_id);

-- Les administrateurs peuvent mettre à jour toutes les infos des techniciens
CREATE POLICY "Admins can update all technicians data." ON public.technicians
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
