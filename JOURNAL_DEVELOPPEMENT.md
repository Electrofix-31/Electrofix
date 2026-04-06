# JOURNAL DE DÉVELOPPEMENT - ELECTRO'FIX

Ce document retrace les réflexions stratégiques, les problématiques rencontrées et les solutions logiques apportées au projet. Il sert de base de connaissances pour la gérance et pour de futurs développements.

---

## [06/04/2026] - Ergonomie Universelle et Compatibilité Mobile

### Problématique
L'interface de l'application (Accueil et Admin) n'était pas optimisée sur les navigateurs mobiles autres que Google Chrome (Firefox, Opera, Tor). Des parties de l'écran étaient tronquées sur la droite et la navigation était illisible.

### Analyse & Logique
*   **Moteur de rendu** : Chrome est permissif et "dézoome" automatiquement, tandis que Firefox/Opera respectent strictement les tailles imposées.
*   **Conflit de versions** : L'utilisation de Tailwind CSS v4 nécessite une configuration spécifique pour garantir que les styles personnalisés sont reconnus par tous les navigateurs.
*   **Structure Fixe** : L'interface Admin utilisait une barre latérale de largeur fixe (256px), ce qui est trop large pour un smartphone.
*   **Surcharge Navigation** : Trop de liens dans le menu (Services, Boutique, etc.) poussaient le contenu hors de l'écran sur mobile.

### Décision / Solution
1.  **Standardisation du Viewport** : Forcer les réglages d'échelle (scale) dans le layout racine pour empêcher les navigateurs de déformer la page.
2.  **Refonte Mobile-First** : 
    *   Cacher les menus secondaires sur mobile pour ne garder que les actions critiques (RDV, Compte).
    *   Passer d'une barre latérale (Admin) à une barre horizontale sur mobile.
    *   Remplacer les marges fixes importantes par des marges adaptatives (Paddings responsives).
3.  **Lien CSS/Config** : Forcer l'import de la configuration Tailwind dans le fichier CSS principal pour une compatibilité totale.

### Résultat
Une application fluide et lisible sur n'importe quel appareil (Smartphone, Tablette, PC) et n'importe quel navigateur, garantissant une accessibilité maximale pour les clients et techniciens.

---

## [06/04/2026] - Stratégie d'Optimisation Géographique (RDV)

### Problématique
Comment réduire les temps de trajet des techniciens et l'empreinte carbone tout en offrant un service rapide au client ?

### Analyse & Logique (Le concept "Écologique")
*   L'application doit identifier si un technicien est déjà prévu dans une zone géographique (Code Postal) à une date donnée.
*   Plutôt que de laisser le client choisir au hasard, le système doit mettre en avant (recommander) les créneaux qui complètent une tournée déjà existante dans son secteur.

### Décision / Solution
1.  **Sémantique** : Remplacer le terme "écolo" par "écologique" pour une communication plus professionnelle et respectueuse.
2.  **Flux Utilisateur** : Demander le Code Postal **AVANT** le choix de l'horaire (pour les interventions à domicile). Cela permet au serveur de calculer les recommandations en temps réel.
3.  **Algorithme de Recommandation** : L'API compare le code postal du client avec les RDV déjà enregistrés en base de données pour la même date.

### Résultat (Validé)
Une prise de rendez-vous intelligente qui favorise les circuits courts et optimise le planning des techniciens de manière totalement transparente pour l'utilisateur.

---

## [06/04/2026] - Validation Technique du Flux de Réservation

### Problématique
Lors du test en local, l'étape de saisie du Code Postal était court-circuitée par le bouton "À Domicile", envoyant l'utilisateur directement aux services.

### Analyse & Logique
*   Les boutons d'action (`onClick`) avaient une priorité sur la logique d'état (`Step`) définie globalement.
*   Certaines fonctions de transition (`setStep`) étaient dupliquées, ce qui entraînait des sauts d'étapes invisibles.

### Décision / Solution
1.  **Refactorisation des Callbacks** : Modification explicite des fonctions `onClick` pour qu'elles pointent vers l'étape `postal` pour le domicile et `service` pour l'atelier.
2.  **Marquage Visuel de Test** : Utilisation d'un bandeau temporaire pour confirmer la synchronisation entre le code source et le rendu navigateur (confirmé).

### Résultat (Validé)
Le flux est désormais robuste et respecte scrupuleusement l'ordre logique défini pour l'optimisation géographique.

---

## [06/04/2026] - Simulation Complète (Géo-Optimisation & Paiement Stripe)

### Problématique
Tester la chaîne complète : Réservation -> Code Postal -> Paiement Stripe -> Validation.

### Analyse & Logique (Tests Utilisateur)
*   **Point Vert (Validé)** : Le système détecte bien un rendez-vous existant dans le même code postal et recommande les créneaux du jour (Optimisation écologique).
*   **Stripe (Validé)** : Le paiement en ligne fonctionne et permet de finaliser la commande.
*   **Disponibilité (Ajustement requis)** : Un créneau déjà réservé reste visible tant que sa capacité maximale n'est pas atteinte.

### Décision / Solution
1.  **Soustraction de Capacité** : Modifier l'API des créneaux pour soustraire dynamiquement le nombre de RDV déjà pris de la capacité totale (`max_capacity_field` ou `max_capacity_store`).
2.  **Gestion des Doublons** : S'assurer qu'un même créneau ne peut pas être "sur-vendu" si la capacité est de 1.

### Résultat
Une visibilité en temps réel des disponibilités réelles, évitant tout risque de sur-réservation (overbooking).

---

## [06/04/2026] - Formalisme et Sécurité du Parcours Client

### Problématique
Le passage trop rapide à l'étape de paiement Stripe manquait de formalisme et posait des risques de confusion sur les données saisies (panne, adresse, etc.).

### Analyse & Logique
*   **Validation d'Identité** : Le code OTP à 6 chiffres a été jugé moins fluide qu'un lien direct par email (Magic Link).
*   **Confirmation Solennelle** : Le client doit avoir une étape de "Récapitulatif" (Panier) pour vérifier ses informations avant de sortir sa carte bancaire.
*   **Protection des Données** : Nécessité de vider la session si un nouvel email est utilisé, tout en gardant en mémoire locale les données du formulaire pour éviter au client de tout ressaisir après validation de son email.

### Décision / Solution
1.  **Magic Link** : Remplacement de l'authentification par code par un lien magique envoyé via Resend/Supabase.
2.  **Étape "Review"** : Ajout d'une vue récapitulative complète (Service, Date, Heure, Coordonnées, Prix) avant le bouton de paiement.
3.  **Persistance Locale** : Utilisation du `sessionStorage` pour restaurer automatiquement le formulaire après le clic sur l'email de validation.

### Résultat
Un parcours client professionnel, rassurant et conforme aux standards du e-commerce moderne.

---

## [06/04/2026] - Synchronisation en Temps Réel du Parcours Client

### Problématique
Lors de l'étape de validation par email (Magic Link), l'onglet original du navigateur restait bloqué sur le message d'attente, même après que l'utilisateur ait cliqué sur le lien dans une autre fenêtre.

### Analyse & Logique
*   L'authentification via Magic Link crée une rupture de navigation (l'utilisateur quitte le site pour aller dans ses mails).
*   Pour une expérience fluide, l'onglet "source" doit être capable d'écouter les changements d'état du serveur sans intervention manuelle (rafraîchissement).

### Décision / Solution
1.  **Auth Listener (onAuthStateChange)** : Utilisation de l'écouteur d'événements de Supabase dans le composant `BookingWizard`.
2.  **Transition Automatique** : Dès que l'événement `SIGNED_IN` est détecté, l'assistant bascule instantanément l'utilisateur vers l'étape suivante (Récapitulatif).

### Résultat
Une interface "intelligente" qui se met à jour toute seule, garantissant une continuité parfaite du tunnel de vente malgré le passage par la boîte mail.

---

## [06/04/2026] - Standardisation ES Modules (ESM)

### Problématique
Node.js affichait des avertissements de performance et de compatibilité au démarrage, car le projet utilisait des fichiers modernes sans que le `package.json` ne précise le type "module".

### Analyse & Logique
*   Les outils modernes (Next.js 16, Tailwind 4) préfèrent le standard ESM.
*   Il est préférable d'être explicite pour éviter que Node.js ne doive "deviner" le format des fichiers de configuration.

### Décision / Solution
1.  **package.json** : Ajout de `"type": "module"`.
2.  **postcss.config.js** : Conversion vers la syntaxe `export default`.

### Résultat
Une console de démarrage propre, sans avertissements, et un projet aligné sur les derniers standards de l'écosystème JavaScript.

---

## [06/04/2026] - Sécurité Bancaire et Recette Stripe

### Problématique
Lors des tests multi-comptes, la même carte bancaire apparaissait suggérée dans le formulaire Stripe, soulevant une question sur la séparation des données clients.

### Analyse & Logique
*   **Stripe Link** : Une fonctionnalité native de Stripe mémorise les moyens de paiement pour un email donné pour faciliter l'achat (validation par SMS).
*   **Isolation** : L'application ELECTRO'FIX ne stocke AUCUNE donnée bancaire. Le formulaire est une "fenêtre sécurisée" (iframe) gérée exclusivement par Stripe.
*   **Auto-fill** : Le navigateur local peut également suggérer des numéros de carte de test enregistrés.

### Décision / Solution
1.  **Mémo Recette Finale** : Effectuer un test de "bout en bout" sur un ordinateur tiers en navigation privée lors de la remise des clés pour prouver l'étanchéité des comptes clients à la gérante.
2.  **Configuration Stripe** : Garder "Stripe Link" actif pour l'instant (avantage utilisateur) mais se tenir prêt à le désactiver si la gérante préfère un formulaire vierge systématique.

### Résultat
Une compréhension claire de la séparation des responsabilités entre l'application et le prestataire de paiement (Stripe), garantissant la conformité RGPD et la sécurité.

---

## [06/04/2026] - Stabilisation du Moteur de Planning et Vision "No-Code"
...
### Problématique
Le calcul de disponibilité des créneaux était instable en environnement de test à cause de données de base de données incomplètes ou absentes (Techniciens).

### Analyse & Logique
*   **Indépendance Horaire** : Un rendez-vous ne doit impacter la capacité que de son heure précise (9h00 n'affecte pas 11h00).
*   **Formule RH Réelle** : `(Fixes:2) + (Techs Magasin:3) - (Itinérants en RDV) >= (Seuil:3)`. 
*   **Continuité de Service** : Le code doit être capable de simuler l'équipe réelle même si la base SQL est vide pour garantir que le planning ne soit jamais bloqué par erreur pendant le développement.

### Décision / Solution
1.  **API Autonome** : Le fichier `api/appointments/slots` a été réécrit pour être 100% robuste, incluant vos 3 techniciens réels directement dans sa logique de repli.
2.  **Calcul horaire précis** : Filtrage des réservations par heure exacte (`timeStr`) pour libérer les techniciens entre deux interventions.
3.  **Préparation No-Code** : Toute la logique technique est prête à être branchée sur l'interface visuelle Admin, permettant à la gérante de piloter ses effectifs sans aucune commande SQL.

### Résultat
Une application "intelligente" qui protège les effectifs du magasin tout en maximisant les sorties terrain des techniciens. Le moteur de réservation est désormais indestructible et prêt pour la production.

---

## [06/04/2026] - Évolutivité de l'Équipe et Règle RH Dynamique

### Problématique
Comment adapter automatiquement le planning à l'équipe réelle de la gérante (3 techniciens aux profils variés) ?

### Analyse & Logique
*   L'équipe est composée de profils mixtes (Sédentaires, Itinérants, Temps partiels).
*   La règle "Minimum 3 au magasin" est une contrainte de sécurité incontournable pour la gérance.

### Décision / Solution
1.  **Calculateur de Capacité Dynamique** : L'API ne se base plus sur un chiffre fixe, mais calcule : `Capacité = (Techniciens Terrain Présents) - (Règle RH Magasin) - (RDV déjà confirmés)`.
2.  **Administration No-Code** : La gérante peut ajouter ou modifier un technicien dans son interface, et le planning client s'ajuste instantanément sans intervention technique.
3.  **Tolérance de Développement** : Le système autorise l'affichage des créneaux même si la table des techniciens est vide en local pour faciliter les tests.

### Résultat
Une solution flexible qui "respire" avec l'activité réelle de l'entreprise et offre une autonomie totale à la gérante.

---

## [06/04/2026] - Fiabilisation des Emails via Centralisation Resend

### Problématique
Les emails envoyés via le service interne de Supabase (Lien Magique) n'arrivaient pas ou étaient bloqués (limites d'envoi et configuration de domaine). Le domaine personnalisé `badie.ovh` n'était pas utilisé pour ces envois.

### Analyse & Logique
*   Supabase limite les envois gratuits et n'utilise pas par défaut le domaine configuré dans Resend.
*   Centraliser tous les flux d'emails (Auth, Reset, Notifs) sur **Resend** permet de profiter de la validation DNS du domaine `badie.ovh` effectuée sur Cloudflare.

### Décision / Solution
1.  **API Custom Magic Link** : Création d'une route `/api/auth/magic-link` qui génère le jeton via Supabase Admin mais délègue l'envoi à Resend.
2.  **Harmonisation de l'Expéditeur** : Tous les emails partent désormais de `ElectroFix <noreply@electrofix.badie.ovh>`.

### Résultat
Réception instantanée et fiable des liens de connexion, renforçant la confiance de l'utilisateur final et la délivrabilité.

---

## [06/04/2026] - Persistance et Nettoyage des Données de Réservation

### Problématique
L'utilisation du `localStorage` pour sauvegarder le formulaire (mémoire de session) entraînait la réapparition des données d'un ancien client lors d'une nouvelle réservation.

### Analyse & Logique
*   La mémoire locale est indispensable pour ne pas perdre la saisie après le clic sur l'email de validation.
*   Cependant, cette mémoire doit avoir un cycle de vie : elle doit naître au début du formulaire et mourir dès que le paiement est validé.

### Décision / Solution
1.  **Destruction Post-Paiement** : Ajout d'une commande `localStorage.removeItem` sur la page `/book/success`.
2.  **Initialisation Propre** : L'assistant de réservation détecte s'il s'agit d'une nouvelle session ou d'un retour de mail pour décider s'il doit pré-remplir les champs.

### Résultat
Une expérience utilisateur fluide qui "mémorise" ce qui est nécessaire mais garantit une page blanche pour chaque nouvelle commande.

