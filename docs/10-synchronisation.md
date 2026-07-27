# 10. Synchronisation multi-appareils

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** que les deux parents, sur deux téléphones différents, voient et saisissent les mêmes repas.

**Temps nécessaire :** 10 minutes pour le premier appareil, 3 minutes pour les suivants.

---

## 10.1 Comment ça marche

L'application enregistre l'ensemble de vos données dans un **Gist GitHub privé** — un petit fichier texte hébergé sur votre compte GitHub, invisible des autres utilisateurs.

```
Téléphone A ──┐                        ┌── Téléphone B
              ├──► Gist privé GitHub ──┤
Ordinateur ───┘   followdia_data.json  └── Téléphone C
```

Le rythme des échanges :

| Évènement | Délai |
|---|---|
| Au démarrage de l'application | lecture immédiate |
| En continu | lecture toutes les **2 minutes** |
| Après une modification | envoi environ **4,5 secondes** après la dernière frappe |
| Bouton ⟳ (en haut à droite) | lecture puis envoi immédiats |

L'icône ⟳ change de couleur : **verte** en cas de succès, **rouge** en cas d'erreur.

### Ce qui est synchronisé

| Synchronisé | Non synchronisé |
|---|---|
| Tous les repas, bolus, glucides | Jeton GitHub |
| Aliments personnalisés | Identifiants myDiabby |
| Liste des aliments supprimés | Clé API Anthropic et solde |
| Adresse et jeton Nightscout* | Données de pompe importées |
| Ratios, sensibilités, cibles | Rapports d'analyse |
| Thème et taille du texte | Phrase secrète |

\* Le jeton Nightscout n'est transmis que si la synchronisation est **chiffrée** par une phrase secrète. Sans phrase secrète, l'application ne l'écrit plus dans le Gist ; il se saisit alors à la main sur chaque appareil.

---

> ### 🔒 Avant tout : la phrase secrète
>
> Définissez-la dans **⚙ Paramètres → Sécurité** *avant* d'activer la synchronisation. Le contenu du Gist est alors chiffré (AES-GCM 256) : GitHub héberge un fichier dont il ne peut rien lire, et une fuite de l'adresse du Gist ne livre rien.
>
> Elle n'est enregistrée nulle part : **notez-la**, et saisissez la même sur chaque appareil. Détails au [chapitre 11](11-securite-donnees.md#la-phrase-secrète-de-synchronisation).

---

## 10.2 Créer le jeton GitHub

1. Connectez-vous à GitHub, puis ouvrez <https://github.com/settings/tokens>.
2. **Generate new token** → **Generate new token (classic)**.
3. Remplissez :
   - **Note** : `FollowDIA`
   - **Expiration** : `No expiration` (sinon la synchronisation s'arrêtera sans prévenir à l'échéance)
   - **Scopes** : cochez **uniquement** la case **`gist`**
4. **Generate token**, puis **copiez immédiatement** la valeur affichée (elle commence par `ghp_`). Elle ne sera plus jamais visible.

> **Ne cochez que `gist`.** Un jeton plus large donnerait accès à tous vos dépôts. Avec cette seule portée, le jeton ne peut lire et écrire que des Gists.

---

## 10.3 Configurer le premier appareil

1. **⚙ Paramètres → GitHub Sync**.
2. Collez le jeton dans **Token GitHub**.
3. **Laissez le champ Gist ID vide.**
4. **Sauvegarder**.
5. Appuyez sur l'icône ⟳ en haut à droite.

L'application crée alors un Gist **privé** nommé `followdia_data.json`, et remplit automatiquement le champ **Gist ID**.

6. Rouvrez les paramètres et **notez cet identifiant** : c'est lui qu'il faudra recopier sur les autres appareils.

### Vérifier

Ouvrez <https://gist.github.com/> : un Gist marqué **Secret** doit apparaître, contenant `followdia_data.json`.

---

## 10.4 Configurer les appareils suivants

Deux méthodes.

### Méthode A — Par QR code (la plus rapide)

1. Sur l'appareil **déjà configuré** : **⚙ Paramètres → Partage de configuration → Générer QRCode**.
2. Sur le **nouvel** appareil : **⚙ Paramètres → Scanner QRCode**, et visez l'écran du premier.
3. Le nouvel appareil demande la **phrase secrète** : saisissez la même que sur le premier.
4. La configuration est reprise ; appuyez sur **Sauvegarder**, puis sur ⟳.

Si les deux appareils ne sont pas côte à côte, envoyez-vous une **capture d'écran** du QR par un canal privé, puis utilisez **QRCode depuis image**. Supprimez la capture ensuite.

> Le QR transporte l'adresse et le jeton Nightscout, le jeton GitHub, l'identifiant du Gist et le sel de dérivation. Il est **chiffré par votre phrase secrète** : sans elle, une photo du code ne donne rien. Supprimez tout de même la capture après usage — la prudence ne coûte rien.

### Méthode B — À la main

1. **⚙ Paramètres → GitHub Sync** sur le nouvel appareil.
2. Saisissez **le même jeton** et **l'identifiant du Gist** noté précédemment.
3. **Sauvegarder**, puis ⟳.

Les données du premier appareil apparaissent en quelques secondes.

---

## 10.5 Comment les conflits sont résolus

Deux parents peuvent saisir en même temps. Les règles appliquées :

| Élément | Règle |
|---|---|
| **Un repas** | la version modifiée **le plus récemment** l'emporte, repas par repas et jour par jour |
| **Aliments personnalisés** | fusion des deux listes (aucune perte) |
| **Aliments supprimés** | la liste la plus récente l'emporte **en entier**, ce qui propage aussi bien les suppressions que les réajouts |

Concrètement : deux parents qui saisissent **des repas différents** ne se gênent pas. En revanche, si tous deux modifient **le même repas du même jour** en même temps, la dernière modification enregistrée écrase l'autre.

> **Bonne pratique :** convenez de qui saisit quel repas, ou appuyez sur ⟳ avant de commencer une saisie pour partir de la dernière version.

---

## 10.6 Sauvegarde et restauration

Trois niveaux de protection, du plus immédiat au plus solide :

| Niveau | Où | Protège de |
|---|---|---|
| **Instantanés automatiques** (8 derniers) | sur l'appareil, dans un stockage distinct | données corrompues, fausse manipulation |
| **Export JSON** | fichier que vous rangez où vous voulez | perte ou remplacement de l'appareil |
| **Gist GitHub** | serveurs de GitHub | tout perdre d'un coup |

### Sauvegarder

Le Gist **est** votre sauvegarde principale : il vit sur les serveurs de GitHub, indépendamment de vos téléphones.

Pour une copie de votre côté, le plus simple est **⚙ Paramètres → Sauvegarde et export → 💾 Exporter mes données (JSON)** : le fichier contient repas, aliments et réglages, sans vos identifiants (détail en [7.9](07-configuration.md#79-sauvegarde-et-export)). Rangez-le comme un mot de passe, il contient le jeton Nightscout.

Vous pouvez aussi récupérer directement le contenu du Gist :

1. Ouvrez <https://gist.github.com/>, puis votre Gist.
2. Bouton **Raw** → la page affiche le contenu brut.
3. Enregistrez la page (`Ctrl+S`) dans un endroit sûr.

### Restaurer sur un appareil neuf

1. Installez l'application (chapitre 6).
2. Saisissez le jeton GitHub et l'identifiant du Gist.
3. Appuyez sur ⟳ : toutes vos données redescendent.

### Restaurer sur un appareil neuf

Deux voies, au choix :

- **Depuis un fichier** : ⚙ Paramètres → Sauvegarde et export → **↩️ Restaurer un fichier**, puis choisissez votre export JSON. L'application demande confirmation en affichant la date de la sauvegarde, puis se recharge.
- **Depuis le Gist** : saisissez le jeton GitHub et l'identifiant du Gist, puis appuyez sur ⟳.

### Repartir de zéro sur un appareil

Si l'application se comporte anormalement sur un appareil précis, le bandeau d'erreur propose d'abord **Restaurer la dernière sauvegarde** — c'est à essayer en premier, cela règle le cas de données corrompues sans rien perdre. En dernier recours, **Réinitialiser les données locales** efface les données de **cet appareil uniquement** ; celles du Gist sont retéléchargées à la synchronisation suivante.

---

## 10.7 Révoquer un accès

Si un téléphone est perdu ou si vous voulez couper un accès :

1. Ouvrez <https://github.com/settings/tokens>, puis **Delete** sur le jeton concerné.
2. Créez-en un nouveau et saisissez-le sur les appareils que vous conservez.
3. Si le jeton Nightscout a pu être compromis, supprimez le sujet correspondant dans **Admin Tools** de Nightscout et recréez-le.

> Créer **un jeton par appareil** (`FollowDIA-telephone-papa`, `FollowDIA-tablette`…) permet de révoquer un seul appareil sans déranger les autres. Ils peuvent tous partager le même Gist.

➡️ Chapitre suivant : **[11. Sécurité et données personnelles](11-securite-donnees.md)**
