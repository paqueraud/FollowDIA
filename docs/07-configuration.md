# 7. Configurer l'application

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** relier l'application à vos services et l'adapter à votre enfant. Tous les réglages sont dans **⚙ Paramètres**, en haut à droite.

**Temps nécessaire :** 15 minutes.

> **Les réglages sont propres à chaque appareil**, sauf ceux qui sont synchronisés (voir le tableau 7.11). Un réglage fait sur le téléphone n'apparaît pas automatiquement sur l'ordinateur, sauf si la synchronisation est active.
>
> **Pensez à appuyer sur « Sauvegarder »** en bas de la fenêtre : rien n'est enregistré tant que vous ne l'avez pas fait.

---

## 7.1 Nightscout / xDrip

C'est le réglage **indispensable** : sans lui, aucune glycémie ne s'affiche.

| Champ | Ce qu'il faut saisir |
|---|---|
| **URL Nightscout** | l'adresse complète de votre serveur, par exemple `https://prenom-suivi.10be.de` |
| **Token API** | le jeton de **lecture** créé au chapitre 3 (par exemple `followdia-a1b2c3d4e5f6a7b8`) |

Précisions :

- Saisissez l'adresse **avec** `https://` et **sans** barre oblique finale (l'application la supprime de toute façon).
- Ne mettez **pas** votre API secret administrateur ici : un jeton de lecture suffit et se révoque individuellement.
- Si votre Nightscout autorise la lecture anonyme, le jeton peut rester vide — mais ce n'est pas recommandé.

### Vérifier

Ouvrez l'onglet **Glycémie**. Au bout de quelques secondes, la glycémie du moment et la courbe doivent apparaître, avec un message du type « 864 glycémies récupérées ».

Si un message d'erreur s'affiche, allez au [chapitre 13, section « La glycémie ne s'affiche pas »](13-depannage.md).

### Ce que l'application demande à Nightscout

Pour information (utile en cas de diagnostic) :

- au démarrage et à l'ouverture de l'onglet Glycémie : les **3 derniers jours**, au maximum 864 mesures ;
- à l'ouverture de l'onglet Synthèse : les **30 derniers jours**, au maximum 9000 mesures, avec une mise en cache de 5 minutes ;
- le jeton est transmis dans l'adresse, en paramètre `token=`.

---

## 7.2 Profil de pompe — remplir les repas automatiquement

Les ratios, sensibilités et cibles vivent d'abord **dans la pompe**, découpés en plages horaires. Le bouton **⟳ Mettre à jour le profil** va les chercher sur myDiabby et les reporte sur les quatre repas, sans ressaisie.

**Comment le report est fait :** chaque repas prend les valeurs de la **plage horaire qui contient son heure** — c'est exactement ce que fait la pompe au moment du bolus. Avec les heures par défaut : Petit-déj 7 h 30, Déjeuner 12 h 00, Goûter 16 h 45, Dîner 19 h 00.

Le profil complet s'affiche ensuite en tableau, dans le format de la pompe :

| Plage | Basal U/h | Ratio g/U | Sensib. | Cible |
|---|---|---|---|---|
| 06:00–08:00 🌅 | 0,15 | 11,5 | 150 | 110 |
| 12:00–15:00 ☀️ | 0,25 | 17 | 130 | 110 |

- L'**icône du repas** marque la plage qui lui fournit ses valeurs.
- Une valeur **modifiée depuis la dernière mise à jour** s'affiche en orange, l'ancienne barrée à côté : vous voyez d'un coup d'œil ce que votre diabétologue a changé.
- Chaque repas porte une étiquette **profil pompe** ou **forcé à la main**.

Ce bouton nécessite vos identifiants myDiabby (section 7.4). Il ne récupère que le profil — pas les 60 jours de données — et prend une seconde.

> Le même report est proposé dans l'onglet **Assistant**, sous le profil affiché, par le bouton **Utiliser ce profil pour les repas** : il applique le profil déjà récupéré, sans nouvel appel à myDiabby.

### Forcer les valeurs à la main

Indispensable quand le profil de la pompe a été modifié mais que la pompe n'a pas encore été téléversée sur myDiabby.

Modifiez simplement les champs de la section suivante et appuyez sur **Sauvegarder** : le repas passe en **forcé à la main** et n'est plus aligné sur le profil. Un bouton **Réappliquer le profil** apparaît alors pour revenir aux valeurs de la pompe, sans connexion réseau.

La prochaine mise à jour du profil écrase les valeurs forcées — c'est voulu : quand la pompe a enfin été téléversée, c'est elle qui fait foi.

---

## 7.3 Paramètres par repas

C'est le cœur du calcul. Chacun des quatre repas a ses propres valeurs.

| Réglage | Signification | Valeur par défaut |
|---|---|---|
| **Ratio** (g/U) | nombre de grammes de glucides couverts par 1 unité d'insuline | Petit-déj 12 · Déjeuner 22 · Goûter 20 · Dîner 26 |
| **Sensibilité** (mg/dl/U) | baisse de glycémie attendue pour 1 unité | 150 pour les quatre repas |
| **Cible** (mg/dl) | glycémie visée pour le calcul de correction | 150 pour les quatre repas |

> **Ces valeurs doivent être celles indiquées par votre diabétologue.** Les valeurs par défaut sont un point de départ, pas une recommandation. Reportez les valeurs figurant dans les réglages de votre pompe.

Les repas sont proposés automatiquement selon l'heure : Petit-déjeuner de 4 h à 11 h, Déjeuner de 11 h à 15 h, Goûter de 15 h à 17 h 30, Dîner ensuite. Vous pouvez toujours changer d'onglet manuellement.

---

## 7.4 myDiabby (données de la pompe)

Nécessaire **uniquement** pour l'onglet Assistant. Ignorez cette section si vous ne l'utilisez pas.

| Champ | Ce qu'il faut saisir |
|---|---|
| **Email myDiabby** | l'adresse de connexion à votre compte myDiabby |
| **Mot de passe myDiabby** | le mot de passe correspondant |

> **Ces identifiants restent sur cet appareil.** Ils sont enregistrés dans une zone séparée et ne partent **jamais** dans le Gist de synchronisation. Il faut donc les saisir sur chaque appareil où vous voulez utiliser l'assistant.

⚠️ **Attention aux tentatives répétées** : myDiabby bloque temporairement le compte (environ 15 minutes) après plusieurs échecs de connexion. Si le mot de passe est refusé, vérifiez-le sur le site de myDiabby plutôt que de réessayer en boucle.

---

## 7.5 Synchronisation GitHub

Permet de retrouver les mêmes repas sur tous vos appareils. La procédure complète, avec la création du jeton, est décrite au chapitre **[10. Synchronisation multi-appareils](10-synchronisation.md)**.

| Champ | Ce qu'il faut saisir |
|---|---|
| **Token GitHub** | un jeton personnel avec la portée `gist` (commence généralement par `ghp_`) |
| **Gist ID** | **laissez vide la première fois** : l'application crée le Gist et remplit le champ automatiquement. Sur les appareils suivants, recopiez l'identifiant obtenu. |

---

## 7.6 Apparence et lisibilité

| Réglage | Options | Remarque |
|---|---|---|
| **Thème** | 🌙 Sombre (par défaut) · ☀️ Clair (plein soleil) | le thème clair est à contraste élevé, prévu pour l'extérieur |
| **Taille du texte** | Petit · Moyen · Grand · Très grand | agit sur toute l'application, y compris les graphiques |

Ces deux réglages sont synchronisés entre vos appareils.

---

## 7.7 Sécurité — la phrase secrète

**À définir sur le premier appareil, avant d'activer la synchronisation ou de partager un QR code.**

| Champ | Ce qu'il faut saisir |
|---|---|
| **Phrase secrète de synchronisation** | une phrase d'au moins 8 caractères, que vous seul connaissez |

Ce qu'elle fait :

- elle **chiffre le contenu du Gist** — GitHub héberge alors un fichier dont il ne peut rien lire ;
- elle **chiffre le QR code** — une photo du code ne sert à rien sans la phrase.

Ce qu'il faut savoir :

- **Elle n'est enregistrée nulle part.** Notez-la ailleurs : personne ne peut vous la redonner, et sans elle les données chiffrées sont définitivement illisibles.
- **Saisissez la même sur chaque appareil.** Un appareil qui ne l'a pas refuse de synchroniser plutôt que d'écraser les données des autres.
- Sur un appareil qui rejoint le groupe, la phrase n'est demandée **qu'une fois** : la clé qui en découle reste ensuite dans un coffre local.

Le bloc **Sécurité** affiche en permanence l'état réel de la protection : ce qui est chiffré, ce qui ne l'est pas.

> **Tant qu'aucune phrase n'est définie**, l'application n'écrit plus le jeton Nightscout dans le Gist et refuse de générer un QR code. Le reste continue de fonctionner normalement.

Le **mot de passe myDiabby** et la **clé API Anthropic** sont, eux, chiffrés automatiquement sur l'appareil, sans réglage à faire — voir le [chapitre 11](11-securite-donnees.md).

---

## 7.8 Partage de configuration par QR code

Pour éviter de ressaisir les adresses et jetons sur un deuxième appareil.

- **Générer QRCode** : affiche un QR code contenant votre configuration.
- **Scanner QRCode** : ouvre la caméra pour lire le code affiché sur l'autre appareil.
- **QRCode depuis image** : lit un QR code à partir d'une capture d'écran, pratique quand les deux appareils ne sont pas côte à côte.

Le QR contient **cinq informations** : l'adresse Nightscout, le jeton Nightscout, le jeton GitHub, l'identifiant du Gist et le sel de dérivation. Il ne contient **ni** vos identifiants myDiabby, **ni** votre clé Anthropic, **ni** vos données de repas.

Le code est **chiffré par votre phrase secrète** (section 7.7) : l'appareil qui le scanne la demande une fois, puis applique la configuration. Une photo du code, sans la phrase, ne donne rien.

> ⚠️ **Tant qu'aucune phrase secrète n'est définie**, l'application refuse de générer un QR code et vous explique pourquoi.
>
> ⚠️ **Les QR codes générés avant juillet 2026** étaient chiffrés avec une clé présente dans le code public : considérez-les comme lisibles par tous. L'application les lit encore, en vous avertissant. Détruisez-les et régénérez-en un.

---

## 7.9 Sauvegarde et export

Cette section protège vos données contre la principale fragilité de l'application : **le stockage du navigateur**. Une donnée corrompue, un nettoyage automatique par iOS, un téléphone perdu — et tout ce qui n'a pas été sauvegardé ailleurs disparaît.

| Bouton | Ce qu'il fait |
|---|---|
| **💾 Exporter mes données (JSON)** | télécharge un fichier complet de vos repas, aliments et réglages. Sur téléphone, la feuille de partage s'ouvre pour l'envoyer où vous voulez. |
| **📊 Exporter les repas (CSV)** | télécharge un tableau des repas, ouvrable directement dans Excel ou LibreOffice |
| **↩️ Restaurer un fichier** | recharge une sauvegarde JSON précédemment exportée |
| **Créer une sauvegarde maintenant** | force un instantané local immédiat |

### Les sauvegardes automatiques

L'application enregistre régulièrement un **instantané** de vos données dans un stockage **distinct** de celui utilisé au quotidien (IndexedDB). Un instantané est créé quelques secondes après une saisie, au maximum une fois toutes les 5 minutes.

**Seules trois sauvegardes sont conservées**, toutes les autres sont supprimées automatiquement pour ne pas encombrer l'appareil :

| Sauvegarde conservée | À quoi elle sert |
|---|---|
| **la plus récente** | revenir sur une erreur de saisie repérée tout de suite |
| **la dernière de la veille** | rattraper une corruption constatée le lendemain |
| **une copie plus ancienne, d'environ une semaine** | remonter avant une dérive passée inaperçue |

> **Pourquoi « environ » une semaine ?** Pour disposer chaque jour d'une copie datée d'exactement sept jours, il faudrait garder toutes les copies journalières intermédiaires, soit huit fichiers au lieu de trois. L'application conserve donc la plus ancienne copie encore valide : elle vieillit jour après jour, et une fois passés quatorze jours elle cède la place à la suivante. Ce troisième créneau contient donc une copie âgée d'un à quatorze jours, d'une semaine en moyenne. La purge s'exécute au démarrage de l'application et après chaque nouvelle sauvegarde.

Ces instantanés sont listés sous les boutons, avec leur date, leur ancienneté (« aujourd'hui », « hier », « il y a 9 jours ») et le nombre de jours de données qu'ils contiennent, avec un bouton **Restaurer** pour chacun. C'est le filet de sécurité en cas de données corrompues : si l'application affiche le bandeau rouge d'erreur, celui-ci propose directement **Restaurer la dernière sauvegarde**.

> Trois copies locales ne remplacent pas un export : elles disparaissent toutes avec l'appareil. Faites un **export JSON** de temps en temps et rangez-le ailleurs.

> Ces instantanés vivent **sur l'appareil**. Ils ne protègent pas d'une perte du téléphone : pour cela, utilisez l'export JSON et/ou la [synchronisation](10-synchronisation.md).

### Ce que contient le fichier exporté

| Inclus | Exclu |
|---|---|
| Repas, bolus, glucides | Jeton GitHub |
| Aliments personnalisés et supprimés | Identifiants myDiabby |
| Ratios, sensibilités, cibles | Clé API Anthropic |
| Adresse **et jeton** Nightscout | Données de pompe importées |
| Thème et taille du texte | Rapports d'analyse |

> ⚠️ **Le fichier contient votre jeton Nightscout** — nécessaire pour qu'une restauration remette l'application en état de marche. **Traitez-le comme un mot de passe** : ne l'envoyez pas par un canal non sécurisé et ne le déposez pas sur un partage public.

### Le fichier CSV

Une ligne par repas saisi, avec la date, le repas, la glycémie, la tendance, l'insuline active, la correction recommandée et faite, les glucides, les bolus théoriques et injectés, les pourcentages réalisés, les paramètres du repas et le détail des aliments (masse servie et masse restante).

Le format est prévu pour les tableurs français : **séparateur point-virgule**, **virgule décimale** et **encodage Windows-1252**. Le fichier s'ouvre d'un double-clic dans Excel, LibreOffice ou Google Sheets, accents et « œ » compris.

> **Pourquoi pas de l'UTF-8 ?** Parce que les tableurs ouvrent un `.csv` dans l'encodage occidental historique sans tenir compte de l'indication de codage : un fichier UTF-8 y affiche « DÃ©jeuner » au lieu de « Déjeuner ». Windows-1252 couvre l'ensemble des caractères français ; les rares caractères qu'il ne couvre pas sont translittérés (par exemple `ā` → `a`) plutôt que perdus.

La **tendance** est écrite en toutes lettres — « hausse lente », « stable », « baisse forte » — car les flèches ↗ ↘ n'existent dans aucun encodage de tableur, et un libellé se lit et se filtre mieux dans une colonne.

---

## 7.10 Application

- **Forcer la mise à jour** : vide le cache et recharge la dernière version publiée. Vos données ne sont pas touchées.
- Sous le bouton figure le **numéro de version** installé, de la forme `202607261650-02ed11f`. Communiquez-le en cas de demande d'aide.

---

## 7.11 Ce qui est synchronisé, ce qui ne l'est pas

| Réglage | Synchronisé entre appareils ? |
|---|---|
| Adresse Nightscout | **oui** |
| Jeton Nightscout | **oui**, uniquement si la synchronisation est chiffrée |
| Ratios, sensibilités, cibles par repas | **oui** |
| Profil de pompe récupéré | **oui** |
| Thème et taille du texte | **oui** |
| Identifiant du Gist | **oui** |
| Sel de dérivation | **oui** (en clair dans l'en-tête du Gist et dans le QR : ce n'est pas un secret) |
| Jeton GitHub | **non** — à saisir sur chaque appareil |
| Phrase secrète | **non** — à saisir sur chaque appareil, jamais enregistrée |
| Identifiants myDiabby | **non** — à saisir sur chaque appareil |
| Clé API Anthropic, solde, période d'analyse | **non** |
| Données de pompe importées et rapports d'analyse | **non** |

---

## 7.12 Récapitulatif

- [ ] L'adresse et le jeton Nightscout sont saisis, et la courbe s'affiche.
- [ ] Le profil de pompe a été récupéré, ou les ratios, sensibilités et cibles correspondent à l'ordonnance.
- [ ] La synchronisation est configurée si vous utilisez plusieurs appareils.
- [ ] Une phrase secrète est définie et notée ailleurs que dans l'application.
- [ ] Le thème et la taille du texte vous conviennent.
- [ ] Vous avez appuyé sur **Sauvegarder**.


---

> ⚠️ **Rappel** — Rien de ce qui précède ne constitue un avis médical. **Vous êtes seul responsable** de l'insuline administrée et des réglages modifiés ; le développeur ne peut être tenu responsable d'aucun dommage. → **[Conditions d'utilisation](AVERTISSEMENT.md)**

➡️ Chapitre suivant : **[8. Utiliser l'application au quotidien](08-utilisation.md)**
