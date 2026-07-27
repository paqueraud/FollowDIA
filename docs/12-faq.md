# 12. Questions fréquentes

Pour un problème précis avec un message d'erreur, allez plutôt au **[chapitre 13, Dépannage](13-depannage.md)**.

---

## Général

**Faut-il payer pour utiliser FollowDIA ?**
Non. L'application, son hébergement et la synchronisation sont gratuits. Deux dépenses seulement, toutes deux facultatives ou externes : l'abonnement Nightscout (1 à 5 €/mois, ou 0 € si vous l'auto-hébergez) et l'assistant IA (environ 0,20 à 0,50 € par analyse, uniquement si vous l'utilisez).

**Faut-il une connexion Internet permanente ?**
Non. Une fois ouverte, l'application fonctionne hors ligne pour la saisie des repas et les calculs. Internet est nécessaire pour récupérer les glycémies, synchroniser et utiliser l'assistant.

**Puis-je l'utiliser sans Nightscout ?**
Oui, mais vous perdez l'affichage des glycémies, l'onglet Synthèse et les courbes post-bolus. Il faudra saisir les glycémies à la main. L'essentiel du calcul de bolus reste disponible.

**Puis-je l'utiliser sans capteur, avec des glycémies capillaires ?**
Oui, en saisissant la glycémie à la main dans l'onglet Repas et en réglant la tendance sur →.

**Mes données sont-elles envoyées quelque part sans que je le sache ?**
Non. L'application ne contient aucun outil de mesure d'audience. Elle ne communique qu'avec les services que vous avez configurés. Le détail est au [chapitre 11](11-securite-donnees.md).

**Que se passe-t-il si le projet d'origine disparaît ?**
Rien pour vous : votre copie est sur **votre** compte GitHub et continue de fonctionner. C'est la raison d'être du chapitre 5.

---

## Installation et appareils

**Faut-il un iPhone ou un Android ?**
FollowDIA fonctionne sur les deux, ainsi que sur ordinateur. En revanche, **xDrip+ n'existe que sur Android** : le téléphone qui lit le capteur doit être un Android.

**Combien d'appareils puis-je utiliser ?**
Autant que vous voulez. Ils partagent le même Gist.

**L'application ne s'installe pas sur mon iPhone.**
L'installation doit se faire depuis **Safari** (bouton Partager → Sur l'écran d'accueil). Chrome sur iOS ne sait pas installer d'application web.

**Puis-je l'utiliser sans l'installer ?**
Oui, dans un simple onglet du navigateur. L'installation apporte le plein écran, l'icône et un fonctionnement hors ligne plus fiable.

---

## Glycémies et capteur

**Pourquoi le bouton CGM reste-t-il orange ?**
Il ne devient vert que si la glycémie récupérée date de **moins de 5 minutes**. Orange signifie que la donnée est trop ancienne pour servir à un calcul de correction — le plus souvent parce que xDrip+ n'envoie plus, ou que le capteur a perdu la connexion.

**Pourquoi la glycémie de l'application diffère-t-elle de celle de la pompe ?**
Elles ne viennent pas du même chemin : l'application lit Nightscout, alimenté par xDrip+. Un décalage de quelques minutes et de quelques mg/dl est normal. Un écart important signale un problème de remontée.

**Combien de temps d'historique l'application affiche-t-elle ?**
3 jours dans l'onglet Glycémie, 30 jours dans l'onglet Synthèse. Nightscout, lui, conserve tout l'historique.

**L'onglet Synthèse indique « Données insuffisantes ».**
Il faut au moins une heure de mesures sur la période concernée. C'est normal en début de journée ou après une pose de capteur.

---

## Calculs et saisie

**Pourquoi la correction proposée est-elle à 0 alors que la glycémie est haute ?**
Trois causes possibles : la glycémie est inférieure à la cible ; l'insuline active saisie couvre déjà l'écart ; ou la tendance à la baisse (↓, ↓↓) réduit la valeur calculée. C'est un garde-fou volontaire contre le sur-dosage.

**À quoi sert « Je veux XX % » ?**
À ne délivrer qu'une partie du bolus repas, par exemple avant une activité physique. L'application indique ce qu'il reste à injecter, en unités et en grammes de glucides.

**Quelle différence entre « Bolus repas effectué » et le pourcentage du bilan ?**
« Bolus repas effectué » compare ce qui a été injecté à **100 % du bolus repas**, correction exclue. Le bilan détaille séparément la correction, le repas, et leur somme.

**Que signifient les couleurs des pourcentages ?**
Rouge en dessous de 80 %, vert entre 80 et 120 %, orange au-dessus de 120 %.

**J'ai supprimé un aliment par erreur.**
Ajoutez-le de nouveau avec le même nom (onglet Aliments → Ajouter un aliment) : il sort automatiquement de la liste des aliments masqués.

**Les valeurs par défaut des ratios sont-elles fiables ?**
Non, ce sont de simples valeurs de départ. **Reportez celles de l'ordonnance de votre diabétologue** (chapitre 7.2).

---

## Synchronisation

**Mes deux téléphones n'ont pas les mêmes données.**
Vérifiez que les deux ont le **même identifiant de Gist**, puis appuyez sur ⟳. La lecture automatique a lieu toutes les 2 minutes.

**Que se passe-t-il si nous saisissons au même moment ?**
Pour deux repas différents, aucun problème. Pour le même repas du même jour, la dernière modification enregistrée l'emporte.

**Mon Gist est-il visible publiquement ?**
Non, il est créé en mode privé (« Secret »). Il n'apparaît pas dans les recherches. Il reste toutefois lisible par quiconque accède à votre compte GitHub.

**Puis-je synchroniser sans compte GitHub ?**
Non. C'est le seul mécanisme de synchronisation prévu. Sans lui, chaque appareil garde ses propres données.

---

## Assistant IA

**Suis-je obligé de l'utiliser ?**
Non. C'est une fonction optionnelle. Sans clé API, tout le reste fonctionne, y compris la synthèse locale par plage horaire.

**Combien cela coûte-t-il vraiment ?**
Entre 0,20 et 0,50 € par analyse. À raison d'une analyse hebdomadaire, comptez 1 à 2 € par mois. Le coût estimé est affiché **avant** chaque lancement, et rien n'est facturé si vous refusez.

**Pourquoi mes données de pompe sont-elles anciennes ?**
myDiabby n'est alimenté que lorsque vous transférez les données de la pompe. Faites un transfert, puis relancez la récupération. L'application prévient au-delà de 7 jours d'ancienneté.

**Puis-je appliquer directement les réglages proposés ?**
**Non.** Ce sont des propositions à discuter avec votre diabétologue. Le rapport PDF est fait pour cela.

**Le rapport PDF nécessite-t-il Internet ?**
Non. Il est fabriqué entièrement dans l'application, sans appel à l'IA ni au réseau.

**Puis-je utiliser un autre modèle d'IA ?**
Pas depuis les réglages. Le modèle est fixé dans le code (`claude-opus-5`) ; le modifier suppose d'éditer votre copie du dépôt.

---

## Nightscout et xDrip

**Puis-je utiliser un Nightscout déjà en place ?**
Oui, c'est même préférable. Il vous suffit de créer un jeton de lecture (chapitre 3.3.3).

**xDrip est-il obligatoire sur tous les téléphones ?**
Non. Il est indispensable **uniquement** sur le téléphone qui lit le capteur. Sur les autres, il n'est utile que pour les alarmes ; pour la simple consultation, FollowDIA suffit.

**Les glycémies s'arrêtent la nuit.**
Presque toujours l'optimisation de batterie d'Android qui met xDrip+ en veille. Voir le chapitre 4.2 et le site <https://dontkillmyapp.com>.

**Puis-je utiliser un capteur Libre ?**
xDrip+ prend en charge plusieurs capteurs. Du côté de FollowDIA, seule compte la présence des glycémies dans Nightscout : la source est indifférente.

➡️ Chapitre suivant : **[13. Dépannage](13-depannage.md)**
