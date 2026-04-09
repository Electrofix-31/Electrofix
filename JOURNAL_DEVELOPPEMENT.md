# JOURNAL DE DÉVELOPPEMENT - ELECTRO'FIX

Ce document retrace les réflexions stratégiques, les problématiques rencontrées et les solutions logiques apportées au projet. Il sert de base de connaissances pour la gérance et pour de futurs développements.

---

## [06/04/2026] - Refonte de la Gestion d'Équipe : Recrutement vs Rôles

### Problématique
La confusion entre la gestion des droits (Admin/Tech) et la présence opérationnelle (Planning) créait des doublons et des erreurs d'affichage.

### Analyse & Logique
*   **Modèle Client/Employé** : Tout utilisateur est un client par défaut. Le recrutement est une action explicite.
*   **Flexibilité** : Un Admin peut être Technicien, mais un Technicien n'est pas forcément Admin.
*   **Ergonomie** : La gérante doit pouvoir "recruter" ou "renvoyer" du planning en un clic sans toucher aux bases de données.

### Décision / Solution
1.  **Interface "L'Équipe"** : Création d'une page dédiée pour ajouter/supprimer des techniciens par leur email.
2.  **Automatisation** : L'ajout à l'équipe transforme le rôle du profil en 'technician' si nécessaire.
3.  **Nettoyage de Sécurité** : Suppression des synchronisations automatiques instables.

### Résultat
Un flux de gestion humain et logique pour la gérante, garantissant un planning 100% fidèle à l'équipe présente.

---

## [08/04/2026] - Refonte Intégrale de la Réservation & Algorithme de Tournée

### Problématique
Le parcours de réservation initial ("Choix de prestation") manquait de précision pour les techniciens (pas de type d'appareil, pas de garantie, pas de photos de la panne). De plus, le moteur de planification autorisait des "zigzags" géographiques intenables pour un technicien unique (ex: Carbonne à 8h, Toulouse à 10h) et bloquait parfois les créneaux pour des règles RH inadaptées au futur.

### Analyse & Logique
*   **Parcours Client** : Il faut demander *l'appareil* (Catégorie > Type) plutôt que le *service*. Le système doit en déduire le prix du forfait (Atelier ou Domicile).
*   **Acompte "Anti-Lapin"** : On ne facture plus une réparation à l'avance, mais un Forfait de Déplacement/Diagnostic, sécurisant ainsi l'intervention sans flouer le client.
*   **Géo-Optimisation ("Tournée Unique Anti-Zigzag")** : Pour rationaliser les coûts, on limite le terrain à 1 technicien simultané.
    *   *Règle 1 (Ancrage)* : Impossible d'intervenir à plus de X km (ex: 20km) du point central (Carbonne).
    *   *Règle 2 (Anti-Zigzag)* : Impossible de prendre un RDV à plus de 10km du client précédent ou suivant si l'intervalle de temps est court (< 2h).

### Décision / Solution
1.  **Base de données "No-Code"** : Création des tables `equipment_categories`, `equipment_types`, et `warranty_types`.
2.  **Paramètres Admin** : Ajout d'une interface complète (`/admin/settings`) pour que la gérante modifie les familles, les appareils, les prix des forfaits, et le rayon d'intervention maximal.
3.  **Refonte du BookingWizard** : Intégration du choix d'appareil, ajout de l'upload de 3 fichiers (vers Supabase Storage), et modification de l'étape "Review" pour un récapitulatif ultra-précis.
4.  **Moteur API `slots`** : Suppression du blocage RH strict pour le terrain (remplacé par une alerte visuelle) et implémentation de l'algorithme de distance séquentielle.
5.  **Logistique Rurale** : Ajout d'un champ "Instructions d'accès" (codes, chemins, chiens) sauvegardé en BDD et transmis au technicien.
6.  **Automatisation** : Envoi d'un email de confirmation HTML (via Resend) déclenché dès la validation du paiement Stripe, même sans rechargement de page.
7.  **Gestion des Annulations** : Mise en place d'un sélecteur de statut interactif dans l'Admin permettant de libérer instantanément un créneau horaire en passant en "Annulé".

### Résultat
Une solution de réservation "End-to-End" professionnelle. Le client est rassuré par un récapitulatif et un email précis, le technicien est guidé jusqu'au portail, et la gérante pilote son planning et ses tarifs sans aucune connaissance technique.

---

## [06/04/2026] - Standardisation ES Modules (ESM)

### Problématique
Avertissements de compatibilité Node.js au démarrage du projet.

### Décision / Solution
Passage intégral au standard moderne ESM (`type: module` dans package.json et mise à jour de postcss.config.js).

---

## [06/04/2026] - Synchronisation en Temps Réel du Parcours Client

### Problématique
Onglet bloqué lors de la validation Magic Link par email.

### Décision / Solution
Ajout d'un écouteur d'état Supabase (Realtime) pour basculer automatiquement l'onglet source vers le récapitulatif dès le clic sur le mail.

---

## [06/04/2026] - Stabilisation du Moteur de Planning (Logique RH)

### Problématique
Calcul instable des disponibilités selon les effectifs réels.

### Décision / Solution
Calcul dynamique par tranche horaire : `(Fixes:2) + (Techs au magasin) - (RDV en cours) >= 3 personnes`.

---

## [06/04/2026] - Ergonomie Universelle et Compatibilité Mobile

### Problématique
Affichage tronqué sur Firefox/Opera Mobile.

### Décision / Solution
Refonte Mobile-First, standardisation du viewport et harmonisation CSS Tailwind v4.
