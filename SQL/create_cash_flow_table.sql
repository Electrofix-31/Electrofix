-- Table pour gérer les entrées et sorties d'argent (Comptabilité simplifiée)
CREATE TABLE public.cash_flow (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL, -- 'income' (entrée) ou 'expense' (sortie)
  category text NOT NULL, -- 'repair_balance', 'store_sale', 'part_purchase', 'rent', 'other'
  amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL, -- 'cash', 'check', 'card', 'transfer'
  description text NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_flow_type CHECK (type IN ('income', 'expense')),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'check', 'card', 'transfer'))
);

ALTER TABLE public.cash_flow ENABLE ROW LEVEL SECURITY;

-- Seuls les administrateurs peuvent gérer la trésorerie
CREATE POLICY "Admins can manage cash flow." ON public.cash_flow
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Index pour accélérer les calculs de statistiques
CREATE INDEX idx_cash_flow_date ON public.cash_flow(date);
CREATE INDEX idx_cash_flow_type ON public.cash_flow(type);
