# 5. Déployer votre propre instance de FollowDIA

**Objectif de ce chapitre :** obtenir **votre** adresse personnelle de l'application, du type `https://votre-compte.github.io/FollowDIA/`, que vous maîtrisez entièrement.

**Temps nécessaire :** 15 minutes.

---

## 5.1 Pourquoi une instance à soi

L'application est un ensemble de fichiers statiques publiés par GitHub Pages. Déployer votre propre copie vous garantit :

- que l'adresse ne changera pas et ne disparaîtra pas du jour au lendemain ;
- que vous décidez **quand** vous prenez les mises à jour ;
- que vous pouvez modifier l'application si vous le souhaitez (aliments par défaut, paramètres…).

> **À savoir :** vos données ne sont **pas** dans le dépôt. Le dépôt ne contient que le code de l'application. Vos repas et glycémies vivent dans votre navigateur, votre Gist privé et votre Nightscout.

---

## 5.2 Créer un compte GitHub

Si vous n'en avez pas :

1. Rendez-vous sur <https://github.com/signup>.
2. Créez le compte (adresse e-mail, mot de passe, nom d'utilisateur).
3. **Activez l'authentification à deux facteurs** (Settings → Password and authentication) : ce compte hébergera vos données de synchronisation.

Le nom d'utilisateur choisi apparaîtra dans l'adresse de votre application. Par exemple, `dupont-famille` donnera `https://dupont-famille.github.io/FollowDIA/`.

---

## 5.3 Dupliquer le dépôt (*fork*)

1. Ouvrez le dépôt d'origine : <https://github.com/paqueraud/FollowDIA>.
2. En haut à droite, cliquez sur **Fork**.
3. Laissez le nom `FollowDIA`, laissez cochée l'option **Copy the `main` branch only**.
4. Cliquez sur **Create fork**.

Vous obtenez votre propre copie à l'adresse `https://github.com/VOTRE-COMPTE/FollowDIA`.

> **Fork ou clone ?** Le *fork* se fait entièrement dans le navigateur et garde le lien avec le projet d'origine, ce qui permet de récupérer les mises à jour d'un clic (voir 5.6). Le *clone* (copie locale avec Git) n'est utile que si vous voulez modifier le code sur votre ordinateur — voir 5.7.

---

## 5.4 Activer la publication

1. Dans **votre** dépôt, ouvrez l'onglet **Settings** (roue dentée, en haut).
2. Dans le menu de gauche, cliquez sur **Pages**.
3. Sous **Build and deployment**, à la ligne **Source**, choisissez **GitHub Actions**.
   - ⚠️ Ne choisissez pas « Deploy from a branch » : le projet utilise un workflow qui estampille la version à chaque publication.
4. Ouvrez maintenant l'onglet **Actions**. Un bandeau peut demander d'autoriser les workflows : cliquez sur **I understand my workflows, go ahead and enable them**.

### Déclencher la première publication

Le workflow se déclenche à chaque modification de la branche `main`. Pour la première fois, provoquez une modification anodine :

1. Onglet **Code** → ouvrez `version.json` → icône crayon ✏️.
2. Ajoutez un espace, puis supprimez-le (ou changez simplement la valeur).
3. Cliquez sur **Commit changes…** → **Commit changes**.

Ou, plus simplement : onglet **Actions** → workflow **Deploy to GitHub Pages** → bouton **Run workflow** s'il est proposé.

---

## 5.5 Vérifier la publication

1. Onglet **Actions** : une exécution nommée **Deploy to GitHub Pages** doit apparaître, puis passer au vert (✓) en une quinzaine de secondes.
2. Si elle échoue (✗), ouvrez-la pour lire l'erreur, et reportez-vous au [chapitre 13](13-depannage.md).
3. Ouvrez ensuite votre adresse :

```
https://VOTRE-COMPTE.github.io/FollowDIA/
```

L'application doit s'afficher, avec les onglets Repas, Glycémie, Synthèse, Tableau de bord, Aliments et Assistant.

> La toute première publication peut prendre **jusqu'à 10 minutes** avant d'être visible. Si vous obtenez une erreur 404, patientez puis rechargez.

### Que fait exactement la publication ?

À chaque envoi sur `main`, le workflow `.github/workflows/deploy.yml` :

1. récupère le code ;
2. **estampille la version** : il calcule un identifiant de la forme `AAAAMMJJHHMM-abc1234` (date, heure et début de l'identifiant du commit), puis l'inscrit dans `version.json`, dans le code de l'application, dans les adresses des fichiers CSS et JavaScript, et dans le nom du cache hors ligne ;
3. publie l'ensemble du dépôt sur GitHub Pages.

C'est cet estampillage qui permet aux applications déjà installées de détecter qu'une nouvelle version existe et de se recharger automatiquement.

---

## 5.6 Récupérer les mises à jour du projet d'origine

Quand le projet d'origine évolue, votre copie ne bouge pas — c'est vous qui décidez.

1. Ouvrez votre dépôt sur GitHub.
2. Sous le nom du dépôt, un bandeau indique **This branch is N commits behind paqueraud/FollowDIA:main**.
3. Cliquez sur **Sync fork** → **Update branch**.
4. La publication se relance automatiquement ; vos appareils prendront la nouvelle version au prochain lancement.

> Si vous avez modifié vous-même des fichiers, GitHub peut signaler un conflit. Dans ce cas, mieux vaut noter vos modifications, resynchroniser, puis les réappliquer.

---

## 5.7 Variante : cloner en local (facultatif)

Uniquement si vous souhaitez modifier le code sur votre ordinateur.

```bash
# 1. Récupérer votre copie
git clone https://github.com/VOTRE-COMPTE/FollowDIA.git
cd FollowDIA

# 2. Tester localement (un serveur est nécessaire : ouvrir le fichier
#    directement ne fonctionne pas à cause des restrictions du navigateur)
python -m http.server 8080
#    puis ouvrir http://localhost:8080 dans le navigateur

# 3. Publier vos modifications
git add -A
git commit -m "Description de la modification"
git push
#    la publication se déclenche toute seule
```

Contenu du dépôt :

```
FollowDIA/
├── index.html                     l'interface complète
├── css/app.css                    les styles (thèmes clair/sombre, tailles de police)
├── js/app.js                      toute la logique de l'application
├── foods.json                     la base de 540 aliments
├── manifest.json                  déclaration de l'application installable
├── sw.js                          le cache hors ligne
├── version.json                   la version publiée
├── docs/                          cette documentation
└── .github/workflows/deploy.yml   la publication automatique
```

> **Ne placez jamais de clé ou de mot de passe dans ces fichiers.** Tout ce qui est dans le dépôt est **public**, y compris l'historique : une clé publiée une fois, même supprimée ensuite, doit être considérée comme compromise et révoquée.

---

## 5.8 Récapitulatif

- [ ] Vous avez un compte GitHub, avec l'authentification à deux facteurs.
- [ ] Vous avez votre propre copie du dépôt.
- [ ] La source de publication est réglée sur **GitHub Actions**.
- [ ] Le workflow s'est exécuté avec succès (✓).
- [ ] Votre adresse `https://VOTRE-COMPTE.github.io/FollowDIA/` affiche l'application.

➡️ Chapitre suivant : **[6. Installer l'application sur vos appareils](06-installation-app.md)**
