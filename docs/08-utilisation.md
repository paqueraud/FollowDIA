# 8. Utiliser l'application au quotidien

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** savoir se servir de chaque onglet, et comprendre les calculs affichés.

---

## 8.1 L'onglet Repas — la saisie quotidienne

C'est l'écran principal. En haut, la date ; en dessous, les quatre repas ; le repas correspondant à l'heure actuelle est sélectionné automatiquement.

### Étape 1 — Renseigner la glycémie et l'insuline active

La zone **Bolus de correction** contient :

| Champ | Ce qu'il faut y mettre |
|---|---|
| **Glycémie** | la glycémie du moment, en mg/dl |
| **Bouton CGM** | récupère automatiquement la glycémie depuis Nightscout |
| **Insuline active** | l'insuline encore active, telle qu'affichée par la pompe |
| **Tendance** | la flèche du capteur (↑↑ ↑ ↗ → ↘ ↓ ↓↓) |

**Le bouton CGM est orange par défaut.** Il devient **vert** uniquement si la glycémie récupérée date de **moins de 5 minutes**. Sinon, un message précise l'ancienneté de la dernière mesure et la valeur n'est pas reprise : c'est volontaire, une glycémie ancienne fausserait la correction.

### Étape 2 — Le calcul de correction

L'application affiche la **correction recommandée** et un champ **Correction faite (UI)** où vous notez ce qui a réellement été injecté.

La formule appliquée est :

```
correction = (glycémie + décalage de tendance − cible) ÷ sensibilité − insuline active
```

Le décalage de tendance vaut : ↑↑ +90 · ↑ +60 · ↗ +30 · → 0 · ↘ −30 · ↓ −60 · ↓↓ −90 mg/dl.

> **Deux garde-fous** sont appliqués : la correction n'est jamais négative, et elle n'est proposée que si la glycémie est **supérieure ou égale à la cible**. Dans tous les autres cas, elle vaut 0.

### Étape 3 — Saisir les aliments

Pour chaque aliment :

1. Tapez les premières lettres dans le champ **Aliment** : les suggestions apparaissent (20 au maximum).
2. Saisissez la **masse servie** en grammes.
3. Après le repas, saisissez la **masse restante** — c'est-à-dire ce qui n'a pas été mangé.

Les glucides absorbés sont calculés ainsi :

```
glucides = (masse servie − masse restante) × glucides pour 100 g ÷ 100
```

Le bouton **Ajouter un aliment** (vert) ajoute une ligne. Si l'enfant a tout mangé, laissez la masse restante à 0.

> Si vous saisissez une masse restante **supérieure** à la masse servie, l'application signale l'erreur au lieu de calculer un résultat aberrant.

### Étape 4 — Le bolus repas

À partir des glucides absorbés :

```
bolus repas = total des glucides ÷ ratio du repas
```

La ligne **« Je veux XX % — reste Y »** permet de ne délivrer qu'une partie du bolus (par exemple en cas d'activité physique prévue) : indiquez le pourcentage voulu, l'application calcule ce qu'il reste à injecter, en unités et en grammes de glucides équivalents.

Juste au-dessus, **« Bolus repas effectué »** indique le pourcentage réellement injecté **par rapport à 100 %** du bolus repas — indépendamment du pourcentage demandé, et **sans** compter la correction. C'est l'information à surveiller au quotidien.

### Étape 5 — Le bilan des bolus

Le pavé **Bilan des bolus** distingue trois blocs :

| Bloc | Contenu |
|---|---|
| **Bolus de correction** | théorique (UI) et pourcentage réalisé |
| **Bolus repas** | théorique (UI), réel injecté (UI), pourcentage injecté |
| **Bolus global** | somme des deux, en théorique, en réel, et en pourcentage |

Le code couleur des pourcentages est le même partout : **rouge en dessous de 80 %**, **vert entre 80 et 120 %**, **orange au-dessus de 120 %**.

### Enregistrement

Tout est enregistré automatiquement, environ **1,5 seconde** après votre dernière frappe. Si la synchronisation est active, l'envoi vers le Gist suit **3 secondes** plus tard.

---

## 8.2 L'onglet Glycémie

- **En haut** : la glycémie actuelle, colorée selon sa valeur (rouge sous 70, verte de 70 à 180, orange de 181 à 250, rouge au-delà), la flèche de tendance, l'ancienneté (« il y a X min ») et le **delta** avec la mesure précédente.
- **Graphique de la dérivée** : la vitesse de variation en mg/dl/min, lissée. Il montre d'un coup d'œil si la glycémie monte ou descend vite, avant même que la courbe ne le rende évident.
- **Courbe des glycémies** sur 3 jours : faites glisser pour vous déplacer dans le temps, pincez pour zoomer. **Touchez un point** pour afficher son heure et sa valeur ; touchez-le à nouveau pour désélectionner.

---

## 8.3 L'onglet Synthèse — les statistiques cliniques

Trois barres verticales : **Aujourd'hui**, **7 jours**, **30 jours**. La légende commune, en haut, donne le code couleur des cinq zones, de la plus haute à la plus basse.

| Zone | Objectif international (ATTD 2019) |
|---|---|
| > 250 mg/dl | moins de 5 % |
| 181–250 mg/dl | (avec la précédente) moins de 25 % au-dessus de 180 |
| **70–180 mg/dl (cible)** | **plus de 70 %** |
| 54–69 mg/dl | moins de 4 % sous 70 |
| < 54 mg/dl | moins de 1 % |

Le pourcentage dans la cible s'affiche en vert au-dessus de chaque barre. Les pourcentages de chaque zone sont indiqués à côté du segment correspondant, sauf s'ils sont nuls.

En dessous, deux indicateurs calculés sur les **14 derniers jours** :

- **GMI (HbA1c estimée)** — objectif inférieur à 7 %. Formule de Bergenstal (2018) : `3,31 + 0,02392 × glycémie moyenne`.
- **Coefficient de variation (CV)** — objectif inférieur ou égal à 36 %. Il mesure l'instabilité : une moyenne correcte peut cacher de grandes oscillations.

> Si moins de 70 % des mesures attendues ont été captées sur 14 jours, un avertissement s'affiche : le GMI et le CV sont alors à interpréter avec prudence.

---

## 8.4 L'onglet Tableau de bord

- **Trois derniers jours** : pour chaque repas, une jauge verticale du pourcentage de bolus réalisé, et la **courbe des glycémies sur les 4 heures suivant le bolus**. C'est l'outil pour relier une hyperglycémie post-prandiale à ce qui a été injecté.
- **Tendance 30 jours** : l'évolution du pourcentage de bolus réalisé, avec des filtres par repas.

---

## 8.5 L'onglet Aliments

- **Rechercher** : tapez quelques lettres.
- **Ajouter un aliment** : nom, glucides pour 100 g, et « dont sucres » pour 100 g. L'aliment est ajouté à votre base et synchronisé.
- **Supprimer** (icône 🗑 en haut à droite) : la suppression demande volontairement deux gestes.
  1. Touchez la corbeille : des cases à cocher apparaissent devant chaque aliment.
  2. Cochez les aliments à supprimer.
  3. Touchez **à nouveau** la corbeille et confirmez.

> La suppression fonctionne aussi sur les aliments de la base d'origine, et se propage à vos autres appareils. Si vous rajoutez plus tard un aliment portant le même nom, il réapparaît normalement.

---

## 8.6 L'onglet Assistant

Il fait l'objet d'un chapitre entier : **[9. L'assistant IA](09-assistant-ia.md)**.

---

## 8.7 Une journée type

| Moment | Geste |
|---|---|
| Avant le repas | onglet **Repas** → bouton **CGM** → insuline active → tendance → saisir les aliments servis |
| | lire le **bolus repas** et la **correction recommandée**, les vérifier, puis administrer avec la pompe |
| Après le repas | saisir la **masse restante** de chaque aliment et les **bolus réellement faits** |
| Le soir | onglet **Tableau de bord** : regarder les courbes post-bolus de la journée |
| Chaque semaine | onglet **Synthèse** : suivre le temps dans la cible et le CV |
| Avant la consultation | onglet **Assistant** : lancer une analyse et générer le rapport PDF |


---

> ⚠️ **Rappel** — Rien de ce qui précède ne constitue un avis médical. **Vous êtes seul responsable** de l'insuline administrée et des réglages modifiés ; le développeur ne peut être tenu responsable d'aucun dommage. → **[Conditions d'utilisation](AVERTISSEMENT.md)**

➡️ Chapitre suivant : **[9. L'assistant IA](09-assistant-ia.md)**
