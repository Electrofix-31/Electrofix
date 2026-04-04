-- 1. Ajout de services de test
INSERT INTO public.services (name, description, price, type) VALUES
('Réparation Lave-linge', 'Diagnostic et réparation de lave-linge toutes marques.', 89.00, 'both'),
('Réparation Informatique', 'Optimisation, virus ou problème matériel sur PC/Mac.', 59.00, 'both'),
('Écran iPhone Cassé', 'Remplacement d''écran iPhone (pièces incluses).', 129.00, 'atelier'),
('Installation Domotique', 'Configuration de vos objets connectés à domicile.', 75.00, 'domicile')
ON CONFLICT (name) DO NOTHING;

-- 2. Ajout de techniciens de test (nécessite des profils existants)
-- Note: Pour ce test, nous allons marquer que nous avons 5 techniciens disponibles
-- au magasin par défaut via les paramètres pour simplifier.
UPDATE public.admin_settings SET value = '{"value": 1}' WHERE key = 'min_staff_store';

-- 3. Ajout de créneaux de test pour les 7 prochains jours
-- Cette fonction génère des créneaux de 9h à 17h
DO $$
DECLARE
    target_date date;
    start_t time;
BEGIN
    FOR i IN 0..7 LOOP
        target_date := CURRENT_DATE + i;
        FOR h IN 9..17 LOOP
            start_t := (h || ':00:00')::time;
            
            -- Vérifier si le créneau existe déjà pour cette date et heure
            IF NOT EXISTS (
                SELECT 1 FROM public.appointment_slots 
                WHERE date = target_date AND start_time = start_t
            ) THEN
                INSERT INTO public.appointment_slots (date, start_time, end_time, max_capacity_store, max_capacity_field, is_active)
                VALUES (target_date, start_t, start_t + interval '1 hour', 2, 2, true);
            END IF;
        END LOOP;
    END LOOP;
END $$;
