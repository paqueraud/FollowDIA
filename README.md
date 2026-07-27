# FollowDIA

Application de suivi de l'**insulinothérapie fonctionnelle** pour un enfant vivant avec un diabète de type 1 : calcul des bolus repas, suivi des glycémies du capteur, statistiques cliniques (temps dans la cible, GMI, variabilité) et assistance à la révision des paramètres de la pompe.

---

> # ⚠️ AVERTISSEMENT
>
> # FollowDIA n'est pas un dispositif médical.
>
> # L'utilisateur est seul responsable de l'administration de l'insuline et de toute modification des paramètres de sa pompe.
>
> # Le développeur ne peut être tenu responsable d'aucun dommage résultant de l'utilisation de cette application.

Aucun marquage CE, aucune certification, aucune validation clinique. Cet outil ne remplace ni votre lecteur de glycémie, ni votre pompe, ni l'avis de votre équipe de diabétologie. Vérifiez chaque calcul avant administration ; ne modifiez aucun réglage de pompe sans validation médicale.

Application libre sous licence MIT, **fournie gratuitement, en l'état, sans garantie d'aucune sorte**, à titre bénévole et non lucratif. Son utilisation vaut acceptation pleine et entière des conditions, et se fait **aux seuls risques et périls de l'utilisateur**.

### ➡️ **[LIRE L'AVERTISSEMENT ET LES CONDITIONS D'UTILISATION](docs/AVERTISSEMENT.md)**

---

## 📖 Documentation

Toute la documentation est en français, dans le dossier [`docs/`](docs/). Si vous partez de zéro, suivez les chapitres **dans l'ordre** : chaque étape produit une information dont la suivante a besoin.

| # | Chapitre | Contenu | Durée |
|---|---|---|---|
| ⚠️ | **[Avertissement et conditions d'utilisation](docs/AVERTISSEMENT.md)** | **à lire avant toute utilisation** | 5 min |
| — | [Sommaire de la documentation](docs/README.md) | point d'entrée, aide-mémoire des informations à conserver | — |
| 1 | [Vue d'ensemble](docs/01-vue-ensemble.md) | ce que fait l'application, schéma des flux, où vivent les données | 10 min |
| 2 | [Prérequis et coûts](docs/02-prerequis.md) | comptes, matériel, budget, ordre d'installation | 10 min |
| 3 | [Mettre en place Nightscout](docs/03-nightscout.md) | service hébergé ou auto-hébergé, jetons, vérification | 15 min |
| 4 | [Installer et configurer xDrip+](docs/04-xdrip.md) | téléphone porteur, téléphones suiveurs, alarmes, batterie | 45 min |
| 5 | [Déployer votre instance](docs/05-deploiement.md) | fork GitHub, GitHub Pages, mises à jour | 15 min |
| 6 | [Installer l'application](docs/06-installation-app.md) | Android, iPhone, ordinateur, mode hors ligne | 2 min |
| 7 | [Configurer l'application](docs/07-configuration.md) | tous les réglages, un par un | 15 min |
| 8 | [Utiliser l'application](docs/08-utilisation.md) | chaque onglet, les formules de calcul, une journée type | — |
| 9 | [Assistant IA](docs/09-assistant-ia.md) | données de pompe, coûts réels, lecture du rapport, PDF | — |
| 10 | [Synchronisation multi-appareils](docs/10-synchronisation.md) | Gist privé, QR de configuration, sauvegarde | 10 min |
| 11 | [Sécurité et données personnelles](docs/11-securite-donnees.md) | où vont les données, ce qui est protégé, RGPD | — |
| 12 | [Questions fréquentes](docs/12-faq.md) | les réponses aux questions courantes | — |
| 13 | [Dépannage](docs/13-depannage.md) | par symptôme : glycémies, sync, assistant, affichage | — |

### Parcours express

Déjà équipé de Nightscout et xDrip ? [Déployez votre instance](docs/05-deploiement.md) → [installez-la](docs/06-installation-app.md) → [saisissez l'adresse Nightscout](docs/07-configuration.md). C'est utilisable ; le reste peut attendre.

---

## Fonctionnalités

- **Bolus repas** à partir des aliments réellement consommés (masse servie − masse restante), base de 540 aliments extensible
- **Bolus de correction** tenant compte de la glycémie, de la tendance du capteur, de la cible et de l'insuline active
- **Suivi du réalisé** : pourcentage de bolus effectivement injecté, par repas et au global
- **Glycémies du capteur** depuis Nightscout : courbe, dérivée, delta, sélection d'un point
- **Statistiques cliniques** : temps dans la cible (ATTD 2019), HbA1c estimée (GMI), coefficient de variation
- **Assistant IA** : analyse des données de pompe (myDiabby) et proposition argumentée de révision des plages, ratios et sensibilités, avec rapport PDF généré localement
- **Synchronisation multi-appareils** par Gist GitHub privé
- **Fonctionne hors ligne**, installable comme une application native (PWA)

## Architecture

Application web statique, sans backend : un fichier HTML, une feuille de style, un fichier JavaScript. Aucun framework, graphiques dessinés à la main sur `canvas`. Les seules dépendances externes sont deux bibliothèques de QR code, mises en cache pour l'usage hors ligne.

```
index.html                      interface
css/app.css                     styles (thèmes clair/sombre, 4 tailles de police)
js/app.js                       logique complète
foods.json                      base de 540 aliments {n, g, s}
manifest.json                   déclaration PWA
sw.js                           cache hors ligne
version.json                    version publiée
docs/                           documentation utilisateur
LICENSE                         licence MIT + avertissement médical
.github/workflows/deploy.yml    publication automatique sur GitHub Pages
```

Services utilisés à l'exécution : votre serveur **Nightscout** (glycémies), l'API **GitHub** (synchronisation), et — pour l'assistant uniquement — **myDiabby** (données de pompe) et l'**API Anthropic** (analyse).

## Installation rapide

1. **Fork** de ce dépôt
2. Settings → Pages → Source : **GitHub Actions**
3. Ouvrir `https://VOTRE-COMPTE.github.io/FollowDIA/` et l'installer sur vos appareils
4. Renseigner l'adresse et le jeton Nightscout dans ⚙ Paramètres

Le détail figure au [chapitre 5](docs/05-deploiement.md).

## Vie privée

Aucun serveur central, aucun compte, aucune mesure d'audience. Les données restent dans votre navigateur, dans votre Gist privé et sur votre Nightscout. Voir [Sécurité et données personnelles](docs/11-securite-donnees.md).

## Licence

Distribué sous **[licence MIT](LICENSE)** — usage, modification et redistribution libres, **sans aucune garantie**. Le fichier de licence rappelle également que ce logiciel n'est pas un dispositif médical.

---

> ## ⚠️ Rappel final
>
> ### Cette application ne remplace aucun dispositif médical.
> ### Vous êtes seul responsable de l'insuline administrée et des paramètres modifiés.
> ### Vérifiez tout. Validez avec votre équipe de diabétologie. Utilisez à vos risques et périls.
>
> **[Conditions d'utilisation](docs/AVERTISSEMENT.md)** · **[Licence MIT](LICENSE)**
