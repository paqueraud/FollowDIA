# 6. Installer l'application sur vos appareils

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** avoir FollowDIA comme une véritable application, avec son icône, sur chaque téléphone et ordinateur de la famille.

**Temps nécessaire :** 2 minutes par appareil.

---

## 6.1 Comprendre : une application web installable

FollowDIA est une **PWA** (*Progressive Web App*). Concrètement :

- il n'y a **rien à télécharger** sur un magasin d'applications ;
- on ouvre une adresse web, puis on l'« ajoute à l'écran d'accueil » ;
- elle se comporte ensuite comme une application normale : icône, plein écran, **fonctionnement hors ligne** ;
- les mises à jour arrivent toutes seules, sans intervention.

L'adresse est celle obtenue au chapitre 5, de la forme :

```
https://VOTRE-COMPTE.github.io/FollowDIA/
```

---

## 6.2 Android (Chrome)

1. Ouvrez **Chrome** et allez à l'adresse de votre FollowDIA.
2. Laissez la page se charger complètement (quelques secondes la première fois).
3. Menu **⋮** (trois points, en haut à droite) → **Ajouter à l'écran d'accueil** (ou **Installer l'application**).
4. Confirmez le nom, puis **Ajouter**.
5. L'icône 💉 apparaît sur l'écran d'accueil. Ouvrez-la : l'application s'affiche en plein écran, sans barre d'adresse.

> Si l'entrée « Ajouter à l'écran d'accueil » n'apparaît pas, rechargez la page une fois et réessayez. Certains navigateurs alternatifs ne proposent pas l'installation : utilisez Chrome.

---

## 6.3 iPhone et iPad (Safari)

L'installation **doit** se faire depuis Safari — Chrome sur iOS ne sait pas installer de PWA.

1. Ouvrez **Safari** et allez à l'adresse de votre FollowDIA.
2. Touchez le bouton **Partager** (le carré avec une flèche vers le haut, en bas de l'écran).
3. Faites défiler et choisissez **Sur l'écran d'accueil**.
4. Confirmez avec **Ajouter**.
5. L'icône apparaît sur l'écran d'accueil.

> **Particularités d'iOS à connaître :** iOS peut supprimer les données stockées par un site web resté longtemps inutilisé. C'est une raison de plus d'activer la **synchronisation par Gist** (chapitre 10) : elle garantit que vos repas sont conservés en dehors du téléphone.

---

## 6.4 Ordinateur (Windows, macOS, Linux)

Avec **Chrome** ou **Edge** :

1. Ouvrez l'adresse de votre FollowDIA.
2. Dans la barre d'adresse, à droite, cliquez sur l'icône d'installation (un écran avec une flèche), **ou** menu **⋮** → **Installer FollowDIA…**
3. L'application s'ouvre dans sa propre fenêtre et s'ajoute au menu Démarrer / au Launchpad.

Avec **Firefox** ou **Safari sur Mac** : l'installation n'est pas proposée, mais l'application fonctionne parfaitement dans un onglet. Mettez-la simplement en favori.

---

## 6.5 Vérifier que tout est en place

Ouvrez l'application et contrôlez :

- [ ] les quatre repas s'affichent (Petit-déj, Déjeuner, Goûter, Dîner) ;
- [ ] les onglets sont visibles : Repas, Glycémie, Synthèse, Tableau de bord, Aliments, Assistant ;
- [ ] l'engrenage ⚙ en haut à droite ouvre les paramètres ;
- [ ] tout en bas des paramètres, un numéro de version s'affiche (par exemple `202607261650-02ed11f`).

L'application n'est pas encore reliée à vos données : c'est l'objet du chapitre suivant.

---

## 6.6 Fonctionnement hors ligne

Une fois ouverte au moins une fois, l'application fonctionne **sans connexion** :

| Fonctionne hors ligne | Nécessite Internet |
|---|---|
| Saisie des repas et calculs de bolus | Récupération des glycémies (Nightscout) |
| Consultation des repas déjà enregistrés | Synchronisation entre appareils (Gist) |
| Base des aliments | Récupération myDiabby |
| Génération du rapport PDF | Analyse par l'IA |

Les modifications faites hors ligne sont conservées sur l'appareil et repartiront à la synchronisation dès le retour du réseau.

---

## 6.7 Mises à jour

L'application vérifie sa version au démarrage. Quand une nouvelle version est publiée, elle se met à jour toute seule au prochain lancement.

Pour forcer une mise à jour immédiatement : **⚙ Paramètres → Application → Forcer la mise à jour**. Cela vide le cache et recharge la dernière version. Vos données ne sont pas touchées.

➡️ Chapitre suivant : **[7. Configurer l'application](07-configuration.md)**
