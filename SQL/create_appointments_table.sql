CREATE TABLE public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES public.technicians ON DELETE SET NULL NULL, -- Nullable si non assigné
  service_id uuid REFERENCES public.services ON DELETE RESTRICT NOT NULL,
  appointment_type text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  material_ref text NULL,
  material_issue text NULL,
  purchase_info text NULL, -- Ex: "Achat magasin le JJ/MM/AAAA", "Achat ailleurs, sous garantie"
  attachment_url text NULL, -- URL vers Supabase Storage
  payment_status text DEFAULT 'pending'::text NOT NULL, -- "pending", "paid", "failed"
  stripe_payment_intent_id text UNIQUE NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_appointment_type CHECK (appointment_type IN ('atelier', 'domicile')),
  CONSTRAINT valid_appointment_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed'))
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir et gérer leurs propres rendez-vous
CREATE POLICY "Clients can view their own appointments." ON public.appointments
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Clients can insert their own appointments." ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update their own appointments." ON public.appointments
  FOR UPDATE USING (auth.uid() = client_id AND status = 'pending'); -- Peut modifier si en attente

-- Les techniciens peuvent voir les rendez-vous qui leur sont assignés
CREATE POLICY "Technicians can view their assigned appointments." ON public.appointments
  FOR SELECT USING (auth.uid() = technician_id);

-- Les administrateurs peuvent voir, insérer, mettre à jour tous les rendez-vous
CREATE POLICY "Admins can manage all appointments." ON public.appointments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger pour mettre à jour 'updated_at'
CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
