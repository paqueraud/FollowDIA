# 3. Mettre en place Nightscout

**Objectif de ce chapitre :** disposer d'un serveur Nightscout en ligne, avec son **adresse** (URL) et un **jeton de lecture** (token) — les deux informations que vous saisirez plus tard dans FollowDIA.

**Temps nécessaire :** 15 minutes avec un service hébergé, 1 à 2 heures en auto-hébergement.

---

## 3.1 À quoi sert Nightscout ici

Nightscout est un serveur qui **centralise les glycémies du capteur**. Il joue le rôle de boîte aux lettres commune :

- le téléphone qui lit le capteur (via xDrip+) **y dépose** les glycémies, en continu ;
- tous les autres appareils (téléphone du deuxième parent, ordinateur, FollowDIA) **y lisent** les glycémies.

Sans Nightscout, chaque téléphone serait isolé. C'est lui qui rend le suivi partagé possible.

> **Nightscout n'est pas un dispositif médical certifié.** C'est un projet communautaire libre. Il ne remplace ni le lecteur officiel du capteur, ni la pompe, ni un avis médical. En cas de doute sur une glycémie, contrôlez au doigt.

---

## 3.2 Choisir : service hébergé ou auto-hébergement

| | Service hébergé (recommandé) | Auto-hébergement |
|---|---|---|
| Mise en place | 15 min, dans le navigateur | 1 à 2 h, notions techniques |
| Coût | environ 1 à 5 € par mois | gratuit à quelques € (selon l'hébergeur) |
| Maintenance | assurée par le prestataire | à votre charge (mises à jour, sauvegardes) |
| Pour qui | la grande majorité des familles | profils à l'aise avec Docker / le terminal |

**Notre recommandation : commencez par un service hébergé.** Vous pourrez toujours migrer plus tard ; l'adresse et le token changeront, mais rien d'autre.

---

## 3.3 Option A — Service Nightscout hébergé

### 3.3.1 Choisir un prestataire

Plusieurs services proposent une instance Nightscout prête à l'emploi, sans installation. Les plus connus dans la communauté francophone et européenne :

- **10be.de** (`https://ns.10be.de`) — hébergement allemand, tarif modique, interface simple. C'est celui utilisé dans l'exemple de ce guide.
- **T1Pal** (`https://t1pal.com`) — service anglophone, abonnement mensuel, assistance incluse.
- D'autres prestataires existent ; cherchez « Nightscout hosting » ou demandez sur les groupes d'entraide.

Vérifiez avant de payer : **où sont hébergées les données** (préférez l'Union européenne), la **sauvegarde**, et la possibilité d'**exporter** vos données si vous partez.

### 3.3.2 Créer l'instance

1. Créez un compte chez le prestataire choisi.
2. Choisissez un **nom de site**. Il devient votre adresse, par exemple `https://prenom-suivi.10be.de`.
   - Évitez le nom et le prénom complets de l'enfant : cette adresse circulera entre plusieurs appareils.
3. Définissez le **mot de passe administrateur**, appelé *API secret* dans Nightscout.
   - **12 caractères minimum.** Notez-le dans votre gestionnaire de mots de passe : il sert à administrer le site.
4. Réglez les options demandées :
   - **Unité d'affichage** : `mg/dL` (c'est l'unité utilisée par FollowDIA).
   - **Fuseau horaire** : `Europe/Paris`.
   - **Plage cible** : basse `70`, haute `180` (valeurs du consensus international ; adaptez selon les consignes de votre équipe).
5. Attendez la fin de la création, puis ouvrez l'adresse dans un navigateur : vous devez voir le graphique Nightscout, vide pour l'instant.

### 3.3.3 Créer un jeton de lecture

Ne mettez **jamais** votre mot de passe administrateur dans FollowDIA ou dans xDrip. Créez à la place des **jetons** (tokens), qui donnent des droits limités et peuvent être révoqués individuellement.

1. Ouvrez votre site Nightscout, menu **☰** (en haut à gauche) → **Admin Tools**.
2. Saisissez votre API secret si l'authentification est demandée.
3. Dans la section **Subjects – People, Devices, etc.**, cliquez sur **Add new Subject**.
4. Créez deux sujets :

| Nom | Rôles | Usage |
|---|---|---|
| `followdia` | `readable` | lecture des glycémies par l'application FollowDIA |
| `xdrip-upload` | voir ci-dessous | dépôt des glycémies par xDrip+ |

**Pour le sujet qui dépose les glycémies**, le rôle doit autoriser la **création d'entrées**. Deux possibilités :

- **Le plus propre** — dans la section **Roles** des Admin Tools, créez un rôle (par exemple `uploader`) avec les permissions :
  ```
  api:entries:create  api:treatments:create  api:devicestatus:create
  ```
  puis affectez ce rôle au sujet `xdrip-upload`.
- **Le plus simple** — affectez le rôle `admin` au sujet `xdrip-upload`. C'est ce que font beaucoup de tutoriels, mais sachez que ce jeton aura alors **tous les droits** sur votre Nightscout : ne le mettez que dans xDrip+, et révoquez-le si le téléphone est perdu.

Les rôles `readable` et `careportal` seuls **ne suffisent pas** pour déposer des glycémies.

5. Cliquez sur **Save**. Un **jeton** apparaît en face de chaque sujet, sous une forme du type :

```
followdia-a1b2c3d4e5f6a7b8
```

6. **Notez ces deux jetons.** Le premier ira dans FollowDIA, le second dans xDrip+.

> Si vous perdez un jeton, supprimez le sujet et recréez-le : un nouveau jeton sera généré, l'ancien cessera de fonctionner.

### 3.3.4 Vérifier que le serveur répond

Dans un navigateur, ouvrez cette adresse en remplaçant les deux valeurs :

```
https://VOTRE-SITE/api/v1/status.json?token=VOTRE-JETON-FOLLOWDIA
```

Vous devez obtenir un texte technique commençant par `{"status":"ok"` ...

- **Une page de texte s'affiche** : parfait, l'adresse et le jeton sont bons.
- **`{"status":"unauthorized"}`** : le jeton est incorrect ou n'a pas le rôle `readable`.
- **Erreur 404 ou page introuvable** : l'adresse est erronée (vérifiez l'orthographe, et l'absence de `/` final en trop).

Conservez précieusement :

```
Adresse Nightscout : https://______________________
Jeton FollowDIA    : ______________________________
Jeton xDrip        : ______________________________
API secret (admin) : ______________________________
```

---

## 3.4 Option B — Auto-hébergement

Cette voie suppose d'être à l'aise avec un terminal et la notion de variables d'environnement.

### 3.4.1 Ce qu'il faut

1. **Une base de données MongoDB.** MongoDB Atlas propose une offre gratuite (M0) suffisante pour un usage familial.
2. **Un hébergeur d'application** capable de faire tourner Node.js en continu : Northflank, Railway, Fly.io, Render, ou un petit serveur privé (VPS).
3. **Le code de Nightscout** : <https://github.com/nightscout/cgm-remote-monitor>.

### 3.4.2 Variables d'environnement essentielles

| Variable | Valeur | Rôle |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | connexion à la base de données |
| `API_SECRET` | 12 caractères minimum | mot de passe administrateur |
| `DISPLAY_UNITS` | `mg/dl` | unité d'affichage |
| `TIME_FORMAT` | `24` | affichage 24 h |
| `ENABLE` | `careportal basal iob cob boluscalc rawbg` | fonctions activées |
| `AUTH_DEFAULT_ROLES` | `denied` | **important** : impose un jeton pour toute lecture |
| `BG_TARGET_BOTTOM` / `BG_TARGET_TOP` | `70` / `180` | plage cible |

> `AUTH_DEFAULT_ROLES=denied` empêche que vos glycémies soient lisibles publiquement par quiconque connaît l'adresse. Ne laissez pas la valeur par défaut `readable` sur une instance exposée à Internet.

### 3.4.3 Après le déploiement

Créez les jetons exactement comme au point **3.3.3**, puis effectuez la vérification du point **3.3.4**.

---

## 3.5 Ce qu'il faut retenir avant de continuer

À la fin de ce chapitre vous devez avoir, notés quelque part :

- [ ] l'**adresse** de votre Nightscout (elle commence par `https://`) ;
- [ ] le **jeton FollowDIA** (rôle lecture) ;
- [ ] le **jeton xDrip** (rôle dépôt) ;
- [ ] l'**API secret** administrateur, rangé dans un gestionnaire de mots de passe ;
- [ ] la confirmation que `…/api/v1/status.json?token=…` répond bien.

➡️ Chapitre suivant : **[4. Installer et configurer xDrip+](04-xdrip.md)**
