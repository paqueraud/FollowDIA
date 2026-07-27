# 2. Prérequis et coûts

**Objectif de ce chapitre :** savoir exactement ce qu'il faut réunir avant de commencer, et ce que cela coûte.

---

## 2.1 Comptes à créer

| Compte | Obligatoire ? | Pourquoi | Coût |
|---|---|---|---|
| **Nightscout** (service hébergé ou auto-hébergé) | **Oui** | centralise les glycémies du capteur | ~1 à 5 €/mois, ou gratuit si auto-hébergé |
| **GitHub** | **Oui** | héberge votre instance de l'application et la synchronisation entre appareils | gratuit |
| **myDiabby** | Non | requis seulement pour l'assistant IA (données de pompe) | gratuit, fourni par le service de diabétologie |
| **Console Anthropic** | Non | requis seulement pour l'assistant IA | à l'usage, ~0,20 à 0,50 € par analyse |

Vous pouvez utiliser FollowDIA sans myDiabby ni clé Anthropic : vous perdez uniquement l'onglet **Assistant**.

---

## 2.2 Matériel

| Élément | Détail |
|---|---|
| **Capteur de glycémie** | Dexcom G7 (ou G6, Libre… selon la compatibilité xDrip+) |
| **Téléphone porteur** | **Android obligatoire** — xDrip+ n'existe pas sur iPhone |
| **Téléphones suiveurs** | Android ou iPhone : FollowDIA fonctionne sur les deux |
| **Ordinateur** | facultatif, pratique pour l'installation initiale et pour lire les rapports |
| **Connexion Internet** | nécessaire pour la remontée des glycémies et la synchronisation |

> **Le téléphone qui lit le capteur doit être sous Android.** Si toute la famille est sous iPhone, il faut soit un Android dédié (même ancien) pour ce rôle, soit utiliser l'application officielle du capteur avec son propre service de partage — dans ce cas, la remontée vers Nightscout devra être assurée autrement (passerelles type *Dexcom Share bridge*), ce qui sort du cadre de ce guide.

---

## 2.3 Compétences nécessaires

Vous n'avez **pas** besoin de savoir programmer. Il faut être capable de :

- créer un compte sur un site web ;
- copier-coller une adresse et un mot de passe sans se tromper ;
- installer une application depuis un fichier sur Android (une case à cocher) ;
- suivre des instructions pas à pas.

Comptez **2 à 3 heures** au total pour la première installation complète, en une ou plusieurs fois.

---

## 2.4 Coût récapitulatif

| Poste | Coût mensuel |
|---|---|
| Nightscout hébergé | 1 à 5 € |
| GitHub (dépôt + Pages + Gist) | 0 € |
| Application FollowDIA | 0 € |
| Assistant IA (facultatif) | à l'usage : environ 0,20 à 0,50 € par analyse |

Si vous lancez une analyse par semaine, l'assistant revient à environ **1 à 2 € par mois**. L'application vous prévient du coût estimé **avant** chaque analyse et n'en lance jamais sans confirmation.

---

## 2.5 Ce qu'il faut avoir sous la main

Préparez un endroit sûr (gestionnaire de mots de passe de préférence) pour noter, au fur et à mesure :

```
Adresse Nightscout ......... https://________________________
Jeton lecture (FollowDIA) .. ______________________________
Jeton dépôt (xDrip) ........ ______________________________
API secret Nightscout ...... ______________________________
Adresse de votre FollowDIA . https://________.github.io/FollowDIA/
Jeton GitHub (sync) ........ ______________________________
Identifiant Gist ........... ______________________________
Identifiants myDiabby ...... ______________________________
Clé API Anthropic .......... ______________________________
```

> **Ne notez jamais ces informations dans un fichier déposé sur GitHub**, ni dans une note partagée non protégée. Elles donnent accès aux données de santé de votre enfant.

---

## 2.6 Ordre d'installation conseillé

L'ordre a son importance : chaque étape produit une information dont la suivante a besoin.

1. **[Nightscout](03-nightscout.md)** → produit l'adresse et les jetons
2. **[xDrip+](04-xdrip.md)** → alimente Nightscout en glycémies
3. **[Déploiement de l'application](05-deploiement.md)** → produit l'adresse de votre FollowDIA
4. **[Installation sur les appareils](06-installation-app.md)**
5. **[Configuration](07-configuration.md)** → on saisit enfin tout ce qui a été noté
6. **[Utilisation](08-utilisation.md)** puis, si souhaité, **[Assistant IA](09-assistant-ia.md)**

➡️ Chapitre suivant : **[3. Mettre en place Nightscout](03-nightscout.md)**
