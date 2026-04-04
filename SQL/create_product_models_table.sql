CREATE TABLE public.product_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  model text NOT NULL,
  type text NOT NULL, -- Ex: 'electromenager', 'informatique', 'telephonie'
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_product_model UNIQUE (brand, model, type)
);

ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les modèles de produits
CREATE POLICY "Public product models are viewable by everyone." ON public.product_models
  FOR SELECT USING (TRUE);

-- Seuls les administrateurs peuvent gérer les modèles de produits
CREATE POLICY "Admins can manage product models." ON public.product_models
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger pour mettre à jour 'updated_at'
CREATE FUNCTION public.set_updated_at_product_models()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_product_models_updated_at
BEFORE UPDATE ON public.product_models
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_product_models();
