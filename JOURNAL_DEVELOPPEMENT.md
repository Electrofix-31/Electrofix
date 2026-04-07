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
