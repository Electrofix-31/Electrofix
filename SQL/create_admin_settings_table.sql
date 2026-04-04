CREATE TABLE public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NULL,
  description text NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Seuls les administrateurs peuvent voir, créer, modifier ou supprimer les paramètres
CREATE POLICY "Admins can manage admin settings." ON public.admin_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger pour mettre à jour 'updated_at'
CREATE FUNCTION public.set_updated_at_admin_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_admin_settings();

-- Insertion des paramètres initiaux (modifiables par les admins)
INSERT INTO public.admin_settings (key, value, description) VALUES
('min_staff_store', '{"value": 3}', 'Nombre minimum de personnel requis au magasin'),
('store_address', '{"value": "123 Rue de la Réparation, 75001 Paris"}', 'Adresse physique du magasin'),
('store_latitude', '{"value": 48.8566}', 'Latitude du magasin'),
('store_longitude', '{"value": 2.3522}', 'Longitude du magasin');
