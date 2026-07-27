# 11. Sécurité et données personnelles

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


**Objectif de ce chapitre :** savoir précisément où vont les données de santé de votre enfant, ce qui est protégé, ce qui ne l'est pas, et comment limiter les risques.

Ce chapitre est volontairement franc, y compris sur les limites de l'application.

---

## 11.1 Principe général

FollowDIA **n'a pas de serveur**. Il n'existe aucune base de données centrale, aucun compte utilisateur, aucun opérateur qui verrait passer vos données. L'application est un ensemble de fichiers servis par GitHub Pages, exécutés dans votre navigateur.

En conséquence : **c'est vous qui hébergez tout**, et la sécurité de l'ensemble dépend des comptes que vous créez et de la façon dont vous protégez leurs accès.

---

## 11.2 Où va chaque donnée

| Donnée | Où elle est stockée | Qui peut y accéder |
|---|---|---|
| **Glycémies du capteur** | votre serveur Nightscout | vous, et quiconque possède un jeton valide |
| **Repas, bolus, glucides** | mémoire du navigateur + votre **Gist privé** | vous, via votre compte GitHub |
| **Aliments personnalisés** | idem | idem |
| **Identifiants myDiabby** | mémoire du navigateur, **cet appareil uniquement**, mot de passe **chiffré** | quiconque a accès à l'appareil déverrouillé |
| **Clé API Anthropic** | idem, **chiffrée** | idem |
| **Données de pompe importées** | idem | idem |
| **Agrégats envoyés à l'IA** | transmis à Anthropic le temps de l'analyse | Anthropic, selon sa politique de conservation |
| **Rapports d'analyse** | mémoire du navigateur (5 derniers) | quiconque a accès à l'appareil |

### Ce qui n'est jamais transmis

- Le **nom** et la **date de naissance** de l'enfant : l'application ne les demande à aucun moment.
- Les identifiants myDiabby, la clé Anthropic et les données de pompe **ne partent jamais** dans le Gist.
- Aucune donnée n'est envoyée à un service d'analyse d'audience : l'application n'en contient aucun.
- L'application ne charge **aucune ressource depuis un service tiers** : toutes ses bibliothèques sont hébergées avec elle. Aucun CDN n'apprend donc que vous l'utilisez, ni quand.

---

## 11.3 Ce qui est envoyé à l'intelligence artificielle

Quand vous lancez une analyse, l'application transmet à Anthropic **uniquement des agrégats statistiques** — jamais le détail brut :

- les réglages du profil de pompe (plages, ratios, sensibilités, basal, cible) ;
- par plage horaire : temps dans la cible, hypoglycémies, glycémie moyenne, ratio observé, écart de basal ;
- les statistiques globales (TIR, GMI, CV) et la médiane par heure ;
- le pourcentage de bolus repas réalisé par repas ;
- la période analysée et l'ancienneté des données.

Le paquet est très compact — de l'ordre de **1 à 3 kilo-octets**, quelle que soit la période choisie, puisqu'il ne contient que des moyennes et des pourcentages. Il ne comporte **ni nom, ni date de naissance, ni identifiant** — mais il contient des **données de santé**, qui restent des données personnelles au sens du RGPD.

Consultez la politique de confidentialité et de conservation d'Anthropic avant de décider d'utiliser cette fonction : <https://www.anthropic.com/legal/privacy>.

> Si vous préférez ne rien transmettre à un tiers, **n'utilisez pas l'onglet Assistant**. Tout le reste de l'application — y compris la synthèse locale par plage horaire, qui est déjà très informative — fonctionne sans aucun appel à l'IA.

---

## 11.4 Ce qui est chiffré, ce qui ne l'est pas

| Élément | Protection réelle |
|---|---|
| Échanges avec Nightscout, GitHub, myDiabby, Anthropic | **HTTPS** : chiffrés en transit |
| Gist de synchronisation | **chiffré** (AES-GCM 256) par votre phrase secrète, si vous en avez défini une |
| QR code de configuration | **chiffré** (AES-GCM 256) par la même phrase secrète |
| Mot de passe myDiabby, clé API Anthropic | **chiffrés** sur l'appareil par une clé non exportable |
| Repas, glycémies et réglages dans le navigateur | **non chiffrés** : lisibles par qui accède à l'appareil déverrouillé |
| Sauvegardes automatiques locales | **non chiffrées**, dans un stockage distinct des données courantes |
| Fichier de sauvegarde exporté | **non chiffré** ; contient l'adresse et le **jeton Nightscout**, mais ni le jeton GitHub, ni le mot de passe myDiabby, ni la clé API |

### La phrase secrète de synchronisation

Elle se définit dans **Paramètres → Sécurité**, et c'est le seul réglage de sécurité que vous ayez à faire.

- Elle chiffre **le contenu du Gist** et **le QR code**, en AES-GCM 256 bits. La clé est dérivée de votre phrase par PBKDF2-SHA256, 210 000 itérations, avec un sel aléatoire de 128 bits — le nombre d'itérations recommandé par l'OWASP, choisi pour rendre une attaque par dictionnaire coûteuse.
- **Elle n'est enregistrée nulle part**, ni sur l'appareil, ni chez GitHub. Seule la clé dérivée est conservée, dans un coffre local d'où elle ne peut pas être extraite. **Notez-la** : personne ne peut vous la redonner, et sans elle les données déjà chiffrées sont définitivement illisibles.
- Saisissez **la même phrase sur chaque appareil**. Un appareil qui ne l'a pas voit un Gist illisible : il refuse alors de synchroniser plutôt que d'écraser les données des autres.

Une fois la phrase en place, GitHub héberge un fichier dont il ne peut rien lire, et une photo du QR code ne sert à rien sans la phrase.

> ⚠️ **Mettez à jour tous vos appareils avant de définir la phrase secrète** — **⚙ Paramètres → Application → Forcer la mise à jour** sur chacun. Un appareil resté sur une version antérieure ne sait pas lire un Gist chiffré : à la première saisie, il le réécrirait en clair avec ses propres données, effaçant au passage ce qui n'existait que sur les autres appareils. Les versions à jour, elles, refusent d'écrire quand elles ne savent pas lire.

> **Tant qu'aucune phrase n'est définie :** le Gist reste en clair, mais l'application **n'y écrit plus le jeton Nightscout** — il se transmet alors par QR code ou à la main — et **refuse de générer un QR code**, en expliquant pourquoi.

### Les QR codes générés avant la version de juillet 2026

Ils utilisaient une clé de chiffrement **écrite dans le code public** de l'application : c'était de l'obfuscation, pas une protection. L'application sait encore les lire, pour ne pas vous bloquer, mais elle vous avertit alors qu'ils sont à considérer comme lisibles par tous. **Détruisez-les et régénérez-en un** après avoir défini une phrase secrète.

### Le coffre de l'appareil

Le mot de passe myDiabby et la clé API Anthropic sont chiffrés par une clé AES-GCM 256 générée sur l'appareil, marquée **non exportable** : le navigateur interdit à tout script d'en lire la matière. Une copie du stockage du navigateur — sauvegarde du téléphone, profil recopié, coup d'œil dans les outils de développement — ne livre plus que du chiffré. La migration est automatique : une valeur encore en clair est chiffrée au premier démarrage suivant la mise à jour.

**Ce que cela ne protège pas, et il faut le savoir :** un code exécuté dans l'application elle-même peut se servir de cette clé sans jamais la lire. Aucune application web ne peut faire mieux ; c'est la limite du navigateur. Le verrouillage de l'appareil reste la première protection.

---

## 11.5 Les sept règles à respecter

1. **Définissez une phrase secrète de synchronisation** dès le premier appareil, et notez-la ailleurs que dans l'application.
2. **Authentification à deux facteurs sur GitHub.** C'est le compte qui protège l'ensemble de vos données de suivi.
3. **Verrouillage par code ou biométrie sur chaque téléphone.** Le chiffrement local ne protège pas d'un appareil déverrouillé.
4. **Un jeton par usage, à la portée minimale.** Pour GitHub : uniquement `gist`. Pour Nightscout : un jeton de lecture pour l'application, un jeton de dépôt pour xDrip, jamais l'API secret administrateur.
5. **`AUTH_DEFAULT_ROLES=denied` sur Nightscout** si vous l'auto-hébergez, afin que l'adresse seule ne suffise pas à lire les glycémies.
6. **Aucune clé dans le dépôt GitHub.** Le dépôt est public, et l'historique conserve tout : une clé publiée une fois doit être révoquée, même si vous la supprimez ensuite.
7. **Choisissez une adresse Nightscout discrète**, sans le nom complet de l'enfant : elle circulera entre plusieurs appareils et applications.

---

## 11.6 En cas de perte ou de vol d'un appareil

Dans l'ordre :

1. **Révoquez le jeton GitHub** : <https://github.com/settings/tokens> → **Delete**. La synchronisation de l'appareil perdu s'arrête aussitôt.
2. **Révoquez le jeton Nightscout** : Admin Tools → supprimez le sujet correspondant → recréez-en un.
3. **Changez le mot de passe myDiabby** s'il était enregistré sur cet appareil.
4. **Révoquez la clé API Anthropic** depuis la console, si elle y était.
5. Ressaisissez les nouveaux jetons sur les appareils que vous conservez.

C'est précisément pour rendre cette opération simple qu'il est conseillé de créer **un jeton par appareil**.

> **Faut-il changer la phrase secrète ?** Elle ne sert à rien à qui n'a pas aussi le jeton GitHub ou le QR code : révoquer le jeton suffit à couper l'accès. Si vous voulez tout de même en changer, définissez la nouvelle phrase sur un appareil que vous avez gardé : le Gist est aussitôt réécrit avec elle, et il faudra la saisir sur les autres appareils.

---

## 11.7 Statut réglementaire — à dire clairement

- **FollowDIA n'est pas un dispositif médical** et ne porte aucun marquage CE. Il n'a fait l'objet d'aucune validation clinique.
- **Nightscout et xDrip+ non plus** : ce sont des projets communautaires libres.
- Ces outils sont utilisés **sous votre responsabilité**, en complément — et non en remplacement — des dispositifs prescrits.
- Les décisions thérapeutiques doivent s'appuyer sur les dispositifs validés et sur l'avis de votre équipe de diabétologie.

### RGPD

Vous êtes responsable du traitement des données de votre enfant dans un cadre strictement familial et privé — ce qui relève de l'exception domestique du RGPD. Cela change si vous partagez ces données au-delà du cercle familial et soignant. Le rapport PDF contient des données de santé : partagez-le avec discernement.

➡️ Chapitre suivant : **[12. Questions fréquentes](12-faq.md)**
