# 4. Installer et configurer xDrip+

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** que les glycémies du capteur remontent automatiquement vers Nightscout, et que le ou les téléphones suiveurs les reçoivent.

**Temps nécessaire :** 30 à 45 minutes pour le téléphone porteur, 10 minutes par téléphone suiveur.

> **xDrip+ est une application communautaire, sans certification médicale.** Elle ne remplace pas le lecteur officiel du capteur. Les décisions de traitement doivent s'appuyer sur les outils validés par votre équipe soignante et, en cas de doute, sur un contrôle capillaire.

---

## 4.1 Comprendre les deux rôles

Il faut distinguer deux fonctions, qui peuvent être sur deux téléphones différents :

| Rôle | Ce qu'il fait | Ce qu'il lui faut |
|---|---|---|
| **Téléphone porteur** (ou « collecteur ») | reçoit les glycémies du capteur en Bluetooth et les **dépose** sur Nightscout | Android + xDrip+ + être à portée du capteur |
| **Téléphone suiveur** | **lit** les glycémies depuis Nightscout (alarmes, affichage à distance) | xDrip+ en mode *Follower*, **ou** simplement FollowDIA |

**Point important :** FollowDIA lit directement Nightscout. Un parent qui veut seulement consulter les glycémies et gérer les repas **n'a pas besoin d'xDrip+** — l'application suffit. xDrip+ sur un téléphone suiveur n'est utile que pour les **alarmes** (hypo, hyper, perte de signal).

```
   Capteur (Dexcom G7)
            │ Bluetooth
            ▼
  ┌──────────────────────┐
  │ Téléphone PORTEUR    │
  │ xDrip+ (collecteur)  │
  └──────────┬───────────┘
             │ dépôt via Internet
             ▼
      ┌─────────────┐
      │ NIGHTSCOUT  │  ← la boîte aux lettres commune
      └──────┬──────┘
             │ lecture
      ┌──────┴────────────────┬───────────────────┐
      ▼                       ▼                   ▼
 Téléphone suiveur      FollowDIA sur         FollowDIA sur
 xDrip+ (alarmes)       le téléphone          l'ordinateur
```

---

## 4.2 Téléphone porteur : installer xDrip+

xDrip+ n'est **pas** sur le Play Store : il s'installe manuellement.

1. Sur le téléphone Android, ouvrez <https://github.com/NightscoutFoundation/xDrip/releases>.
2. Dans la version la plus récente marquée *Latest*, téléchargez le fichier `.apk` (souvent nommé `xdrip.apk` ou `xDrip-plus-...apk`).
3. Android demandera d'**autoriser l'installation depuis cette source** : acceptez, puis lancez l'installation.
4. À la première ouverture, accordez **toutes** les autorisations demandées : localisation (obligatoire pour le Bluetooth sur Android), notifications, stockage.

### Réglages Android indispensables

Sans ces réglages, Android mettra xDrip+ en veille et **les glycémies s'arrêteront de remonter**, souvent la nuit.

1. **Paramètres Android → Applications → xDrip+ → Batterie** → choisissez **Sans restriction** / **Non optimisée**.
2. Sur Samsung, Xiaomi, Huawei, Oppo : ouvrez également l'outil maison de gestion de batterie (« Optimisation », « Démarrage automatique », « Applications protégées ») et **autorisez xDrip+ à fonctionner en arrière-plan**. Le site <https://dontkillmyapp.com> décrit la marche à suivre pour chaque marque.
3. Désactivez l'économiseur de batterie automatique la nuit, s'il existe.

---

## 4.3 Téléphone porteur : lire le capteur

Le chemin exact varie selon la version d'xDrip+ ; le principe reste le même.

1. Menu **☰** → **Settings** → **Hardware Data Source**.
2. Sélectionnez la source correspondant à votre capteur :
   - **Dexcom G7 / ONE+** pour un G7 ;
   - **Dexcom G6 (native mode)** pour un G6 ;
   - une autre entrée pour Libre ou un émetteur tiers.
3. Suivez l'appairage proposé : xDrip+ recherche le capteur en Bluetooth. Il faut être à moins de quelques mètres, et le capteur doit avoir terminé son préchauffage.
4. Revenez à l'écran principal : au bout de quelques minutes, une valeur de glycémie et une courbe doivent apparaître.

> **Un capteur ne peut être connecté qu'à un nombre limité d'appareils simultanément.** Si le récepteur officiel ou l'application du fabricant capte déjà le signal, xDrip+ peut ne pas parvenir à s'y connecter. Testez et, si besoin, choisissez quel appareil garde la connexion directe — les autres passeront par Nightscout.

---

## 4.4 Téléphone porteur : envoyer vers Nightscout

C'est l'étape qui relie tout le système.

1. Menu **☰** → **Settings** → **Cloud Upload** → **Nightscout Sync (REST-API)**.
2. Activez **Enable REST-API Upload** (ou *Send to Nightscout*).
3. Dans **Base URL**, saisissez l'adresse **en incluant le jeton xDrip** créé au chapitre 3, sous cette forme :

```
https://VOTRE-SITE/api/v1/
```

  puis renseignez le jeton dans le champ prévu. Selon la version, xDrip+ n'offre qu'un seul champ : indiquez alors l'adresse complète avec le jeton intégré :

```
https://xdrip-upload-VOTREJETON@VOTRE-SITE/api/v1/
```

4. Laissez les autres options par défaut.

### Vérifier que ça monte

1. Attendez 5 à 10 minutes.
2. Ouvrez votre site Nightscout dans un navigateur : **la courbe doit se remplir**.
3. Dans xDrip+, l'écran **☰ → System Status** → onglet **Uploader** indique les envois réussis et les erreurs.

Si rien n'arrive, allez directement au chapitre **[13. Dépannage](13-depannage.md)**, section « Les glycémies n'arrivent pas sur Nightscout ».

---

## 4.5 Téléphone suiveur : xDrip+ en mode Follower

À faire **uniquement** si ce téléphone doit émettre des **alarmes**. Pour une simple consultation, installez FollowDIA (chapitre 6) et arrêtez-vous là.

1. Installez xDrip+ comme au point 4.2, et appliquez les mêmes réglages de batterie.
2. Menu **☰** → **Settings** → **Hardware Data Source** → choisissez **Nightscout Follower**.
3. Menu **☰** → **Settings** → **Cloud Upload** → **Nightscout Follow** (selon les versions : *Follower settings*).
4. Renseignez l'adresse de suivi, avec le **jeton de lecture** :

```
https://followdia-VOTREJETON@VOTRE-SITE
```

   (vous pouvez créer un jeton `readable` dédié à ce téléphone, pour pouvoir le révoquer seul).
5. Revenez à l'écran principal : les glycémies apparaissent avec un léger décalage (le temps du transit par Nightscout).

### Régler les alarmes

Menu **☰** → **Settings** → **Alerts / Alarms**. Réglez au minimum :

- une alarme **hypoglycémie** (seuil bas), avec un son qui réveille ;
- une alarme **hyperglycémie** ;
- une alarme **perte de signal** (« Missed readings ») : c'est elle qui vous prévient que plus rien n'arrive.

> Testez vos alarmes en conditions réelles, notamment la nuit et en mode silencieux. Une alarme non entendue est une alarme inutile.

---

## 4.6 Récapitulatif

À la fin de ce chapitre :

- [ ] le téléphone porteur affiche la glycémie du capteur dans xDrip+ ;
- [ ] la courbe se remplit sur le site Nightscout ;
- [ ] xDrip+ est exclu de l'optimisation de batterie sur chaque téléphone ;
- [ ] les téléphones suiveurs qui doivent alerter sont configurés en *Follower* avec leurs alarmes testées.

➡️ Chapitre suivant : **[5. Déployer votre propre instance de FollowDIA](05-deploiement.md)**
