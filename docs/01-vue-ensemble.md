# 1. Vue d'ensemble

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** comprendre ce que fait FollowDIA, comment les pièces s'assemblent, et où vivent vos données. Ce chapitre ne demande aucune manipulation.

---

## 1.1 Ce que fait l'application

FollowDIA couvre le quotidien de l'insulinothérapie fonctionnelle :

- **Calculer les bolus repas** à partir des aliments réellement consommés (masse servie moins masse restante), avec une base de **540 aliments** et la possibilité d'en ajouter.
- **Calculer le bolus de correction** à partir de la glycémie, de la tendance du capteur, de la cible et de l'insuline active.
- **Suivre ce qui a réellement été injecté** face à ce qui était dû, repas par repas, en pourcentage.
- **Afficher les glycémies du capteur** : courbe, dérivée, delta, sélection d'un point.
- **Produire les statistiques cliniques** de référence : temps dans la cible (TIR), HbA1c estimée (GMI), variabilité (CV).
- **Assister la révision des paramètres de la pompe** (ratios, sensibilités, plages horaires) grâce à l'intelligence artificielle, avec production d'un rapport PDF partageable.
- **Se synchroniser entre plusieurs appareils**, pour que les deux parents voient les mêmes données.

## 1.2 Ce qu'elle ne fait pas

- Elle ne **commande pas** la pompe et ne modifie aucun réglage à distance.
- Elle ne déclenche **aucune alarme** d'hypoglycémie : ce rôle revient à xDrip+ ou à l'application du capteur.
- Elle ne remplace **aucun** dispositif médical certifié.
- Elle ne transmet rien à un professionnel de santé : c'est à vous de partager le rapport si vous le souhaitez.

---

## 1.3 Comment les pièces s'assemblent

```
        Capteur de glycémie (Dexcom G7)
                    │  Bluetooth
                    ▼
        ┌───────────────────────┐
        │  Téléphone porteur    │
        │  xDrip+               │
        └───────────┬───────────┘
                    │  dépôt des glycémies
                    ▼
            ┌───────────────┐
            │  NIGHTSCOUT   │  ← votre serveur, vos données
            └───────┬───────┘
                    │  lecture des glycémies
        ┌───────────┴────────────┐
        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│   FollowDIA     │◄───►│   FollowDIA     │   ← synchronisation
│   (téléphone)   │Gist │   (autre tél.)  │      via GitHub
└────────┬────────┘     └─────────────────┘
         │
         │  (facultatif, onglet Assistant)
         ├──────────────► myDiabby  : données de la pompe
         └──────────────► API Claude : analyse des réglages
```

Chaque flèche correspond à un service distinct, que vous contrôlez :

| Service | Rôle | Qui le fournit |
|---|---|---|
| **Nightscout** | stocke et partage les glycémies | vous (hébergé ou auto-hébergé) |
| **xDrip+** | lit le capteur et alimente Nightscout | application libre sur Android |
| **GitHub Pages** | héberge l'application elle-même | GitHub, gratuit |
| **GitHub Gist** | synchronise les repas entre appareils | GitHub, gratuit, dépôt **privé** |
| **myDiabby** | fournit les données de la pompe | votre service de diabétologie |
| **API Claude** | analyse et propose des ajustements | Anthropic, payant à l'usage |

---

## 1.4 Où vivent vos données

C'est une question importante ; voici la réponse exacte.

| Donnée | Emplacement principal | Copie ailleurs ? |
|---|---|---|
| Repas, bolus, glucides saisis | mémoire locale du navigateur, sur chaque appareil | oui, dans votre **Gist privé** si la synchronisation est activée |
| Aliments personnalisés et aliments supprimés | mémoire locale | oui, dans le Gist |
| Glycémies du capteur | **votre serveur Nightscout** | non, l'application ne les recopie pas |
| Identifiants myDiabby | mémoire locale, **sur cet appareil uniquement** | **non**, jamais envoyés au Gist |
| Clé API Anthropic et solde | mémoire locale, **sur cet appareil uniquement** | **non** |
| Données de pompe importées | mémoire locale, **sur cet appareil uniquement** | **non** |
| Rapports d'analyse (5 derniers) | mémoire locale | **non** |

L'application n'a **aucun serveur central** : il n'existe pas de base de données FollowDIA quelque part. Tout transite entre votre navigateur et les services que vous avez configurés.

Le détail complet, y compris ce qui est chiffré et ce qui ne l'est pas, figure au chapitre **[11. Sécurité et données personnelles](11-securite-donnees.md)**.

---

## 1.5 Comment l'application est construite

Ces éléments expliquent certains comportements et facilitent le dépannage.

- **Application web installable (PWA)** : une seule page HTML, une feuille de style, un fichier JavaScript. Aucun framework.
- **Fonctionne hors ligne** grâce à un *service worker* qui met en cache les fichiers de l'application. Les appels à Nightscout, GitHub, myDiabby et Anthropic ne sont **jamais** mis en cache : ils échouent proprement hors connexion.
- **Mise à jour automatique** : au démarrage, l'application compare sa version à celle publiée et se recharge si nécessaire.
- **Aucune ressource externe** : les deux seules bibliothèques utilisées (`qrcode-generator` et `jsQR`, pour les QR codes de configuration) sont hébergées avec l'application. Rien n'est chargé depuis un service tiers, ce qui garantit le fonctionnement hors ligne et met l'application à l'abri d'une panne de CDN. Tout le reste — y compris les graphiques — est écrit à la main.
- **Sauvegardes locales automatiques** dans IndexedDB, un stockage distinct de celui des données courantes : si ce dernier venait à être corrompu, les instantanés restent intacts et permettent de revenir en arrière.
- **Graphiques dessinés directement** sur des zones de dessin (`canvas`), sans bibliothèque.

---

## 1.6 Les six onglets

| Onglet | À quoi il sert |
|---|---|
| **Repas** | la saisie quotidienne : aliments, glycémie, bolus. C'est l'écran principal. |
| **Glycémie** | la courbe du capteur sur 3 jours, sa dérivée, et le détail d'un point. |
| **Synthèse** | les statistiques cliniques : temps dans la cible, GMI, variabilité. |
| **Tableau de bord** | le récapitulatif des 3 derniers jours et la tendance sur 30 jours. |
| **Aliments** | la base des aliments : recherche, ajout, suppression. |
| **Assistant** | l'analyse des réglages de pompe par l'IA et le rapport PDF. |

Chacun est décrit en détail au chapitre **[8. Utiliser l'application](08-utilisation.md)**.

➡️ Chapitre suivant : **[2. Prérequis et coûts](02-prerequis.md)**
