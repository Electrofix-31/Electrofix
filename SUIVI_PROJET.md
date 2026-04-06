# 📋 SUIVI ET DOCUMENTATION DU PROJET ELECTRO'FIX

Ce document centralise la vision globale du projet, les règles de développement (mandats) et le journal de bord des avancées.

---

## 1. CONTEXTE ET OBJECTIFS (Le "Pourquoi")
L'application **Electro'Fix** est destinée à une société de dépannage (électroménager, informatique, téléphonie) et vente de matériel, dirigée par une jeune entrepreneuse. L'objectif principal est de réduire au maximum les coûts de développement tout en offrant une application robuste, évolutive et sécurisée.

L'application est découpée en 3 portails :
- **Portail Public** : Vitrine et prise de rendez-vous.
- **Portail Client** : Suivi des réparations et gestion du compte.
- **Portail Admin** : Pilotage de l'activité (Gestion, RH, Finances). L'interface doit être résolument **"No-Code"** et accessible (aucune ligne de commande requise pour la gérante).

### Fonctionnalités Critiques :
1. **Planning Géo-Optimisé** : Suggestion de créneaux basés sur la proximité géographique.
2. **Sécurité Financière** : Pré-paiement obligatoire via Stripe pour valider un RDV.
3. **Règle RH** : Surveillance constante de l'effectif magasin (Minimum 3 personnes présentes).
4. **IA Administrative** : Triage d'emails Gmail et génération de newsletters/conseils techniques (via Google Gemini API).
5. **Dashboard Trésorerie** : Pilotage des flux financiers hebdomadaires.

---

## 2. STACK TECHNIQUE & RÈGLES DE DÉVELOPPEMENT (Le "Comment")

### Stack Technique
- **Framework** : Next.js 14+ (App Router)
- **Style** : Tailwind CSS
- **Base de données & Auth** : Supabase (PostgreSQL)
- **Emails** : Resend (SDK)
- **Paiement** : Stripe
- **IA** : Google Gemini API
- **Langage** : TypeScript (Typage strict)

### Règles et Mandats Immuables (GEMINI)
- **Communication** : Exclusivement en **Français** (sauf termes techniques spécifiques au code).
- **Base de données** : **AUCUNE** commande SQL dans le chat. Toute modification doit se faire via un fichier dédié dans `/SQL/` pour un copier-coller sécurisé par l'utilisateur.
- **Ergonomie Admin** : Interfaces 100% visuelles. Aucun accès terminal ou SQL pour la gérante.
- **Validation** : Effectuer systématiquement un `npm run build` après chaque modification structurelle importante.
- **Sécurité** : Validation systématique des rôles (Admin/Technicien) côté serveur (SSR).

## 3. ARCHITECTURE DE SÉCURITÉ & LEÇONS APPRISES (Auth & Reverse Proxy)
*À lire absolument pour tout futur développement touchant à l'authentification (Supabase, Emails, SSR).*

1. **Le Piège du `NEXT_PUBLIC_` et des Reverse Proxies (Synology/Nginx)**
   - **Problème** : Les variables `NEXT_PUBLIC_` sont figées (hardcodées) lors du `npm run build`. Si le build est fait sur la VM avec un paramètre manquant, le code restera bloqué, même si on modifie le `.env.local` ensuite.
   - **Solution** : Pour toute détection d'URL dynamique côté serveur (comme l'envoi d'emails), utiliser une variable non-publique lue "en direct" : `process.env.SITE_URL`. Ne jamais se fier à `request.url` derrière un Proxy (qui renverra systématiquement `localhost:3000`).

2. **Génération de Liens Supabase (`generateLink`)**
   - **Problème** : Supabase force ses liens (action_link) à pointer vers l'URL par défaut configurée dans son Dashboard, même si on précise un `redirectTo`.
   - **Solution** : Dans le Dashboard Supabase, "Site URL" doit être le domaine de production (`https://amiraljp.zapto.org`), et localhost doit être placé dans les "Redirect URLs" (`http://localhost:3000/**`).

3. **Le Flux de Récupération (Mot de passe oublié) "Direct"**
   - **Problème** : L'erreur `"Auth session missing"` survient car le Reverse Proxy s'emmêle dans les fragments d'URL (`#access_token=...`) et les multiples redirections vers les Callbacks.
   - **Solution (Mise en place le 05/04/26)** : 
     - L'API génère un lien Supabase, mais n'envoie pas ce lien brut.
     - L'API **extrait le `token`** de ce lien et crée une URL simple : `monsite.com/auth/reset-password?token_hash=xxx`.
     - La page cible (enveloppée dans un `<Suspense>`) utilise `supabase.auth.verifyOtp({ token_hash })` dès le chargement pour créer la session de manière totalement robuste et déjouer les Proxies.
     - Toujours mettre un flag `isMounted` pour éviter la double-validation du token par les navigateurs.

---

## 4. JOURNAL DE BORD (Changelog & Suivi)

### 🟢 En cours / Dernière mise à jour (05 Avril 2026)
- **Correction du système d'Emails (Mot de passe oublié)** : 
  - Abandon du SMTP natif de Supabase (bloqué par les restrictions de domaine).
  - Intégration du SDK **Resend**.
  - Création d'une API route sécurisée (`/api/auth/reset-password`) utilisant le `service_role_key` de Supabase pour générer le lien, puis l'envoyer via Resend avec le domaine autorisé (`noreply@electrofix.badie.ovh`).
  - Implémentation du flux "Direct Token Hash" déjouant les Reverse Proxies (Synology) pour éviter le bug "Auth Session Missing" et les retours forcés vers localhost.
  - Sécurisation du Frontend (Alertes propres au lieu de crashs si les clés API manquent).
  - Ajout d'un nettoyage automatique des emails (trim/lowercase) sur toutes les routes de connexion.
- **Admin** : Création d'un véritable composant client interactif `LogoutButton` pour la déconnexion dans le menu latéral.

### 🔵 Historique des versions précédentes
- **04 Avril 2026** : 
  - Intégration du portail client, correction des formulaires de reset password (UI) et toggle de visibilité.
  - Gestion complète des utilisateurs (Admin) avec conformité RGPD (anonymisation/blocage).
  - Mise en place de la cartographie (Map), de l'espace technicien et de la sécurité admin.
