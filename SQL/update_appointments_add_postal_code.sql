-- Ajout de la colonne pour stocker le code postal du client afin de permettre la géo-optimisation
ALTER TABLE public.appointments ADD COLUMN client_postal_code text NULL;