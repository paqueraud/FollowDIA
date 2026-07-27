# Documentation de FollowDIA

FollowDIA est une application de suivi de l'**insulinothérapie fonctionnelle**, conçue pour accompagner au quotidien un enfant vivant avec un diabète de type 1 : calcul des bolus repas, suivi des glycémies du capteur, statistiques cliniques, et assistance à la révision des paramètres de la pompe.

> ## ⚠️ Avertissement important
>
> **FollowDIA n'est pas un dispositif médical.** C'est un outil d'aide au calcul et au suivi, développé pour un usage familial. Il ne remplace ni votre lecteur de glycémie, ni votre pompe, ni l'avis de votre équipe de diabétologie.
>
> - Vérifiez toujours un calcul de bolus avant de l'administrer.
> - Ne modifiez **jamais** les paramètres de la pompe (ratios, sensibilités, basal) sans validation de votre diabétologue.
> - Les recommandations produites par l'assistant IA sont une **aide à la décision**, jamais une prescription.
> - En cas de doute sur une glycémie affichée, faites un contrôle capillaire.

---

## Par où commencer ?

Si vous partez de zéro, suivez les chapitres **dans l'ordre**. Chaque étape produit une information dont la suivante a besoin.

| # | Étape | Durée | Ce que vous obtenez |
|---|---|---|---|
| 1 | [Vue d'ensemble](01-vue-ensemble.md) | 10 min de lecture | comprendre comment tout s'articule |
| 2 | [Prérequis et coûts](02-prerequis.md) | 10 min | la liste de ce qu'il faut réunir |
| 3 | [Mettre en place Nightscout](03-nightscout.md) | 15 min | l'adresse du serveur + les jetons |
| 4 | [Installer et configurer xDrip+](04-xdrip.md) | 45 min | les glycémies remontent automatiquement |
| 5 | [Déployer votre instance](05-deploiement.md) | 15 min | l'adresse de **votre** FollowDIA |
| 6 | [Installer l'application](06-installation-app.md) | 2 min/appareil | l'icône sur chaque téléphone |
| 7 | [Configurer l'application](07-configuration.md) | 15 min | l'application reliée à vos données |
| 8 | [Utiliser l'application](08-utilisation.md) | à votre rythme | la saisie quotidienne |

Puis, quand vous le souhaitez :

| Chapitre | Sujet |
|---|---|
| [9. Assistant IA](09-assistant-ia.md) | révision des ratios et sensibilités assistée par l'intelligence artificielle |
| [10. Synchronisation multi-appareils](10-synchronisation.md) | partager les mêmes données entre parents |
| [11. Sécurité et données personnelles](11-securite-donnees.md) | où vont vos données, ce qui est protégé |
| [12. Questions fréquentes](12-faq.md) | les réponses aux questions courantes |
| [13. Dépannage](13-depannage.md) | quand quelque chose ne fonctionne pas |

---

## Parcours express

Vous êtes pressé et déjà équipé de Nightscout et xDrip ?

1. [Déployez votre instance](05-deploiement.md) → vous obtenez une adresse `https://VOTRE-COMPTE.github.io/FollowDIA/`
2. [Installez-la](06-installation-app.md) sur votre téléphone
3. [Renseignez l'adresse Nightscout et le jeton](07-configuration.md#71-nightscout--xdrip)
4. C'est utilisable. Le reste (synchronisation, assistant) peut attendre.

---

## Aide-mémoire des informations à conserver

Gardez ces valeurs dans un gestionnaire de mots de passe — jamais dans un fichier public ni sur le dépôt GitHub :

```
Adresse Nightscout ......... https://________________________
Jeton lecture (FollowDIA) .. ______________________________
Jeton dépôt (xDrip) ........ ______________________________
API secret Nightscout ...... ______________________________
Adresse de votre FollowDIA . https://________.github.io/FollowDIA/
Jeton GitHub (portée gist) . ______________________________
Identifiant du Gist ........ ______________________________
Identifiants myDiabby ...... ______________________________
Clé API Anthropic .......... ______________________________
```

---

## En cas de problème

1. Consultez le **[chapitre 13, Dépannage](13-depannage.md)** : il est organisé par symptôme.
2. Vérifiez la **[FAQ](12-faq.md)**.
3. Si l'application affiche un bandeau rouge d'erreur, le bouton **Recharger** suffit dans la grande majorité des cas.

---

*Cette documentation décrit l'application telle qu'elle est réellement implémentée. Les valeurs chiffrées qui y figurent (seuils, intervalles, tarifs) sont celles du code.*
