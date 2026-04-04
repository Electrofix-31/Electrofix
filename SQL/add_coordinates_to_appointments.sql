-- Mise à jour de la table appointments pour supporter la cartographie et l'historique client
-- Ajout des coordonnées géographiques (latitude et longitude)
-- Ajout de l'adresse et du téléphone d'intervention pour conservation historique

ALTER TABLE public.appointments 
ADD COLUMN latitude float8 NULL,
ADD COLUMN longitude float8 NULL,
ADD COLUMN client_address text NULL,
ADD COLUMN client_phone text NULL;

-- Commentaire pour aide à l'administration
COMMENT ON COLUMN public.appointments.latitude IS 'Latitude pour la géolocalisation de l''intervention';
COMMENT ON COLUMN public.appointments.longitude IS 'Longitude pour la géolocalisation de l''intervention';
COMMENT ON COLUMN public.appointments.client_address IS 'Adresse exacte d''intervention (pour conservation historique)';
COMMENT ON COLUMN public.appointments.client_phone IS 'Numéro de contact du client pour ce rendez-vous';
