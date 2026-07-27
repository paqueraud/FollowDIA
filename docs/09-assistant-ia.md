# 9. L'assistant IA — réviser les paramètres de la pompe

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** utiliser l'onglet Assistant pour obtenir une proposition argumentée de révision des plages horaires, ratios et sensibilités, et produire un rapport PDF à emporter en consultation.

> ## ⚠️ À lire avant toute utilisation
>
> Les propositions de l'assistant sont une **aide à la décision**. Elles ne constituent **pas** une prescription et ne doivent **jamais** être appliquées directement sur la pompe.
>
> **La démarche correcte : lire le rapport, le partager avec votre diabétologue, et n'appliquer que ce que l'équipe soignante valide.**
>
> L'analyse est produite par un modèle de langage. Il peut se tromper, mal interpréter une situation ou passer à côté d'un élément que vous seul connaissez (maladie, sport, stress, changement de rythme).

---

## 9.1 Ce que fait l'assistant

1. Il **récupère les données de la pompe** depuis myDiabby : réglages complets du profil, glycémies capteur, bolus repas et correction, glucides, périodes Control-IQ et débits de basal délivrés.
2. Il **calcule localement** — gratuitement, sans intelligence artificielle — des agrégats par plage horaire : temps dans la cible, hypoglycémies, glycémie moyenne, ratio effectivement observé, écart entre le basal programmé et le basal réellement délivré.
3. Il **croise avec vos saisies FollowDIA** pour connaître le pourcentage de bolus repas réellement effectué — information que myDiabby n'a pas, et qui permet de distinguer un ratio insuffisant d'un bolus incomplet.
4. Il **envoie ces agrégats** (et seulement eux) au modèle Claude d'Anthropic, avec des règles de sécurité strictes.
5. Il **affiche le rapport** et propose un **profil recommandé** ainsi qu'un **export PDF**.

---

## 9.2 Prérequis

- Vos identifiants **myDiabby** saisis dans **⚙ Paramètres → myDiabby** (chapitre 7.3).
- Une **clé API Anthropic** (section 9.4).
- Des **données de pompe récentes** : myDiabby n'est alimenté que lorsque la pompe est déchargée. Faites un transfert avant l'analyse.

---

## 9.3 Étape 1 — Choisir la période et récupérer les données

En haut de l'onglet, la carte **Période analysée** propose **7 j · 14 j · 30 j · 60 j** (14 jours par défaut).

Ce choix commande **les deux étapes** : la quantité de données téléchargées depuis myDiabby et la profondeur de l'analyse. Inutile de télécharger 60 jours pour n'en analyser que 7.

| Période | Quand la choisir |
|---|---|
| **7 jours** | après un changement récent de réglages, ou si l'analyse est trop longue |
| **14 jours** | le choix par défaut, celui du consensus international pour le GMI |
| **30 / 60 jours** | pour dégager une tendance de fond, avant une consultation |

Appuyez ensuite sur **Récupérer depuis myDiabby**. L'application se connecte, télécharge la période par tranches, puis affiche :

```
✓ 14 jours récupérés (4032 mesures capteur)
```

Vous verrez ensuite :

- **Profil de pompe** : toutes les plages avec basal, ratio, sensibilité, cible, et le basal quotidien total. Le bouton **Utiliser ce profil pour les repas** reporte ratio, sensibilité et cible sur les quatre repas, chacun prenant la plage qui contient son heure (voir [7.2](07-configuration.md#72-profil-de-pompe--remplir-les-repas-automatiquement)) ;
- **Vérification — 48 dernières heures** : par créneau de 2 h, la glycémie médiane, le basal programmé face au basal reçu, les bolus, les glucides et le mode Control-IQ, suivis des derniers évènements bruts. Cette section sert à contrôler que la récupération est complète ;
- **Synthèse locale** : les statistiques par plage horaire, avec la colonne **Δ Ctrl-IQ**.

### Lire la colonne Δ Ctrl-IQ

C'est l'écart entre le basal réellement délivré et le basal programmé dans le profil :

- **positif (orange)** : Control-IQ ajoute en permanence de l'insuline sur cette plage → le basal programmé est probablement trop faible ;
- **négatif (bleu)** : Control-IQ freine → le basal programmé est probablement trop fort ;
- **proche de zéro** : le profil est bien calé.

---

## 9.4 Étape 2 — Obtenir une clé API Anthropic

1. Créez un compte sur <https://console.anthropic.com>.
2. Ajoutez un **crédit** (achat ponctuel ; quelques euros suffisent pour des mois d'usage).
3. Ouvrez **API Keys** → **Create Key**, donnez-lui un nom (par exemple `followdia`).
4. **Copiez la clé immédiatement** : elle ne sera plus jamais affichée.
5. Collez-la dans l'onglet Assistant, champ **Clé API Anthropic**.
6. Renseignez le **solde du compte en euros** et, si vous le souhaitez, le **taux USD→EUR** (0,92 par défaut).

> La clé reste sur cet appareil : elle n'est jamais envoyée dans le Gist de synchronisation. Il faut donc la saisir sur chaque appareil où vous voulez lancer une analyse.
>
> **Ne mettez jamais cette clé dans un fichier du dépôt GitHub.** Si cela arrivait, révoquez-la immédiatement depuis la console Anthropic.

### Comprendre le coût

| Élément | Valeur |
|---|---|
| Modèle utilisé | `claude-opus-5` |
| Tarif | 5 $ par million de tokens en entrée, 25 $ par million en sortie |
| Coût constaté par analyse | environ **0,20 à 0,50 €** |

Le suivi du solde affiché dans l'application est une **estimation locale** : l'application déduit le coût réel de chaque analyse (calculé à partir des tokens consommés) du solde que vous avez saisi. Le solde exact reste celui de la console Anthropic.

---

## 9.5 Étape 3 — Lancer l'analyse

Appuyez sur **Lancer l'analyse IA**. Une confirmation apparaît **avant toute dépense** :

```
Analyse IA — service payant

Modèle : claude-opus-5
Coût estimé de cette analyse : ~0,32 €
Solde estimé restant du compte API : 18,40 €

Lancer l'analyse ?
```

Rien n'est facturé si vous refusez. Pendant l'analyse, la progression s'affiche (« Analyse en cours… 45 s »), puis « Rédaction du rapport ». Comptez **1 à 3 minutes**.

> Si l'analyse est trop longue pour le budget de réponse, l'application relance automatiquement une fois avec plus de marge. En cas de second échec, elle vous conseille de choisir la période de 7 jours.

---

## 9.6 Lire le rapport

### Le profil recommandé

Un tableau reprend la présentation du profil de pompe — **Plage · Basal U/h · Ratio g/U · Sensib. · Cible** — avec les **valeurs modifiées surlignées**, la nouvelle valeur en gras et l'ancienne barrée à côté. En pied de tableau : le nombre de paramètres modifiés et le **basal quotidien proposé**, à comparer avec celui du profil actuel.

### Le rapport détaillé

| Section | Contenu |
|---|---|
| **Résumé** | la situation en quelques phrases |
| **Qualité des données** | ce sur quoi l'analyse s'appuie, et ses limites |
| **Plages proposées** | chaque plage avec sa justification |
| **Priorités** | par quoi commencer |
| **Avertissements** | les points de vigilance |

Les **5 dernières analyses** sont conservées sur l'appareil.

### Les règles imposées au modèle

Pour votre information, l'assistant reçoit des consignes strictes :

- ne jamais proposer un changement supérieur à **20 %** d'un paramètre en une seule étape ;
- traiter **les hypoglycémies d'abord**, les hyperglycémies ensuite ;
- être **particulièrement prudent la nuit** ;
- tenir compte du fait que **Control-IQ module déjà la basale** ;
- si le pourcentage de bolus repas réellement fait est bas, **le signaler** au lieu de renforcer le ratio ;
- ne pas proposer de changement sur une plage où les données sont insuffisantes ;
- ne modifier la cible glycémique qu'exceptionnellement ;
- rappeler systématiquement que tout doit être validé par l'équipe de diabétologie.

### Provenance des données

Deux règles, appliquées au calcul et annoncées au modèle :

- **Les bolus font foi côté pompe.** Ce qui a été injecté vient de myDiabby, jamais de vos saisies.
- **Les glucides font foi côté FollowDIA** quand le repas y a été saisi ; sinon, ceux enregistrés dans la pompe sont utilisés. Le nombre de jours relevant de chaque source est affiché et transmis au modèle.

---

## 9.7 Le rapport PDF

Le bouton **📄 Rapport PDF** génère le fichier **directement dans l'application** — sans appel à l'IA, sans connexion, sans passer par la boîte d'impression.

- Sur **téléphone**, la feuille de partage du système s'ouvre : vous pouvez l'envoyer par messagerie, par mail, ou l'enregistrer.
- Sur **ordinateur**, le fichier se télécharge sous le nom `FollowDIA_analyse_AAAA-MM-JJ.pdf`.

Le rapport contient l'en-tête (période, profil de pompe), le résumé, les statistiques observées, le tableau du profil recommandé — **sur une page entière**, modifications surlignées — les justifications par plage, la qualité des données, les priorités, les avertissements, et l'encadré rappelant la validation médicale.

---

## 9.8 À quelle fréquence l'utiliser ?

Les paramètres d'insulinothérapie ne se modifient pas toutes les semaines. Un rythme raisonnable :

- **avant chaque consultation** de diabétologie, pour arriver avec des données analysées ;
- **après un changement notable** (croissance, saison, activité), une fois que 2 semaines de données ont été accumulées ;
- **pas plus d'une fois par semaine** : en dessous, les variations observées relèvent du bruit plus que d'une tendance.

---

## 9.9 Limites à connaître

- **L'analyse ne vaut que par la fraîcheur des données.** Si le dernier transfert de la pompe date de trois semaines, l'application vous avertit — et l'analyse ne reflétera pas la situation actuelle.
- **Le modèle ne connaît pas votre contexte** : une semaine de gastro-entérite ou un stage sportif produiront des recommandations inadaptées si vous ne le mentionnez pas à votre équipe.
- **Ce n'est pas un dispositif médical certifié**, et cela ne remplace pas le jugement clinique.


---

> ⚠️ **Rappel** — Rien de ce qui précède ne constitue un avis médical. **Vous êtes seul responsable** de l'insuline administrée et des réglages modifiés ; le développeur ne peut être tenu responsable d'aucun dommage. → **[Conditions d'utilisation](AVERTISSEMENT.md)**

➡️ Chapitre suivant : **[10. Synchronisation multi-appareils](10-synchronisation.md)**
