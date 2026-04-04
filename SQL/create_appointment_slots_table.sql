CREATE TABLE public.appointment_slots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_capacity_store integer DEFAULT 0 NOT NULL,
  max_capacity_field integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT TRUE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_slot UNIQUE (date, start_time, end_time)
);

ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les créneaux disponibles
CREATE POLICY "Public slots are viewable by everyone." ON public.appointment_slots
  FOR SELECT USING (TRUE);

-- Seuls les administrateurs peuvent créer, modifier ou supprimer les créneaux
CREATE POLICY "Admins can manage appointment slots." ON public.appointment_slots
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger pour mettre à jour 'updated_at'
CREATE FUNCTION public.set_updated_at_slots()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_appointment_slots_updated_at
BEFORE UPDATE ON public.appointment_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_slots();
