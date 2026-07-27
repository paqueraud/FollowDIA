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

Application libre, **fournie gratuitement, en l'état, sans garantie d'aucune sorte**, à titre bénévole et non lucratif. Son utilisation vaut acceptation pleine et entière des conditions, et se fait **aux seuls risques et périls de l'utilisateur**.

### ➡️ **[LIRE LES CONDITIONS D'UTILISATION COMPLÈTES](docs/AVERTISSEMENT.md)**

---

## 📖 Documentation

**➡️ [Ouvrir la documentation complète](docs/README.md)** — installation pas à pas, configuration, utilisation, FAQ et dépannage.

| Pour… | Aller à |
|---|---|
| Comprendre comment tout s'articule | [Vue d'ensemble](docs/01-vue-ensemble.md) |
| Installer de zéro | [Prérequis](docs/02-prerequis.md) → [Nightscout](docs/03-nightscout.md) → [xDrip+](docs/04-xdrip.md) → [Déploiement](docs/05-deploiement.md) |
| Déployer votre propre instance | [Chapitre 5](docs/05-deploiement.md) |
| Utiliser l'application au quotidien | [Chapitre 8](docs/08-utilisation.md) |
| Réviser les réglages avec l'IA | [Chapitre 9](docs/09-assistant-ia.md) |
| Résoudre un problème | [Dépannage](docs/13-depannage.md) · [FAQ](docs/12-faq.md) |

## Fonctionnalités

- **Bolus repas** à partir des aliments réellement consommés (masse servie − masse restante), base de 540 aliments extensible
- **Bolus de correction** tenant compte de la glycémie, de la tendance du capteur, de la cible et de l'insuline active
- **Suivi du réalisé** : pourcentage de bolus effectivement injecté, par repas et au global
- **Glycémies du capteur** depuis Nightscout : courbe, dérivée, delta, sélection d'un point
- **Statistiques cliniques** : temps dans la cible (ATTD 2019), HbA1c estimée (GMI), coefficient de variation
- **Assistant IA** : analyse des données de pompe (myDiabby) et proposition argumentée de révision des plages, ratios et sensibilités, avec rapport PDF
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

---

> ## ⚠️ Rappel final
>
> ### Cette application ne remplace aucun dispositif médical.
> ### Vous êtes seul responsable de l'insuline administrée et des paramètres modifiés.
> ### Vérifiez tout. Validez avec votre équipe de diabétologie. Utilisez à vos risques et périls.
>
> **[Conditions d'utilisation](docs/AVERTISSEMENT.md)**
