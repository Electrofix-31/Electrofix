# Mandats du Projet ELECTRO'FIX

Ce document contient les instructions prioritaires et immuables pour le développement de l'application.

## 1. Communication et Langue
- Tous les échanges doivent être impérativement et systématiquement en **langue française**, sauf pour les termes techniques spécifiques présents dans les interfaces.

## 2. Gestion de la Base de Données (SQL)
- **AUCUNE** commande SQL ne doit être fournie directement dans le chat.
- Toute modification ou injection SQL doit faire l'objet de la création d'un fichier dédié dans le répertoire `/SQL/` du projet.
- L'utilisateur effectuera ensuite un copier-coller depuis ce fichier pour éviter toute erreur de saisie.

## 3. Ergonomie et Philosophie "No-Code" pour l'Admin
- L'interface d'administration doit être conçue pour une utilisatrice non-technicienne.
- **RIEN** ne doit nécessiter l'usage d'une console, d'un terminal ou d'un éditeur SQL pour la gérante (ex: promotion de rôle, changement d'horaires, gestion de stock).
- Toutes les fonctionnalités critiques (RH, Finance, IA) doivent avoir leur propre interface visuelle (boutons, formulaires, tableaux).

## 4. Standards Techniques et Qualité
- Stack : Next.js (App Router), Supabase (SSR), Tailwind CSS, TypeScript.
- Règle de validation : Effectuer un `npm run build` après chaque modification structurelle importante.
- Sécurité : Validation systématique des rôles (Admin/Technicien) côté serveur.

## 5. Fonctionnalités Critiques (Rappel)
1. **PLANNING GÉO-OPTIMISÉ** : Suggestion par proximité (Zones/Codes Postaux).
2. **SÉCURITÉ FINANCIÈRE** : Pré-paiement Stripe obligatoire.
3. **RÈGLE RH** : Minimum 3 personnes au magasin (sauf dérogation).
4. **IA ADMINISTRATIVE** : Triage d'emails et conseils via Gemini API.
5. **DASHBOARD TRÉSORERIE** : Pilotage des flux (Entrées/Sorties/Records).

## 6. Contexte Relationnel et Client
- La cliente s'appelle **Anne** (c'est la fille d'un ami du développeur).
- Le développement est effectué **bénévolement** (seuls les frais tiers sont à sa charge).
- Les échanges avec elle se font de manière **informelle et bienveillante (tutoiement de rigueur)**.
- L'objectif principal est de concevoir un outil qui la soulage au maximum de la charge mentale logistique et administrative liée au démarrage de son entreprise.
