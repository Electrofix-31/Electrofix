CREATE TABLE public.repair_videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NULL,
  video_url text NOT NULL,
  service_id uuid REFERENCES public.services ON DELETE SET NULL NULL,
  product_model_id uuid REFERENCES public.product_models ON DELETE SET NULL NULL,
  keywords jsonb NULL, -- Pour la recherche par IA, ex: ["panne", "frigo", "réparer"]
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.repair_videos ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les vidéos de réparation
CREATE POLICY "Public repair videos are viewable by everyone." ON public.repair_videos
  FOR SELECT USING (TRUE);

-- Seuls les administrateurs peuvent gérer les vidéos de réparation
CREATE POLICY "Admins can manage repair videos." ON public.repair_videos
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger pour mettre à jour 'updated_at'
CREATE FUNCTION public.set_updated_at_repair_videos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_repair_videos_updated_at
BEFORE UPDATE ON public.repair_videos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_repair_videos();
