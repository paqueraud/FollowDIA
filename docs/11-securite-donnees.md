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
| **Identifiants myDiabby** | mémoire du navigateur, **cet appareil uniquement** | quiconque a accès à l'appareil déverrouillé |
| **Clé API Anthropic** | idem | idem |
| **Données de pompe importées** | idem | idem |
| **Agrégats envoyés à l'IA** | transmis à Anthropic le temps de l'analyse | Anthropic, selon sa politique de conservation |
| **Rapports d'analyse** | mémoire du navigateur (5 derniers) | quiconque a accès à l'appareil |

### Ce qui n'est jamais transmis

- Le **nom** et la **date de naissance** de l'enfant : l'application ne les demande à aucun moment.
- Les identifiants myDiabby, la clé Anthropic et les données de pompe **ne partent jamais** dans le Gist.
- Aucune donnée n'est envoyée à un service d'analyse d'audience : l'application n'en contient aucun.

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
| Gist de synchronisation | **privé** (non listé, non indexé) mais **non chiffré** : lisible par quiconque a accès à votre compte GitHub |
| Données dans le navigateur | **non chiffrées** : lisibles par quiconque a accès à l'appareil déverrouillé |
| Identifiants myDiabby stockés | **non chiffrés**, en clair sur l'appareil |
| QR code de configuration | chiffré (AES-GCM), **mais avec une clé présente dans le code public** |

### Sur le QR code — soyez lucide

Le contenu du QR est chiffré, ce qui empêche une lecture accidentelle par un scanner quelconque. Mais la clé de chiffrement est **écrite dans le code JavaScript de l'application, qui est public**. Quelqu'un qui connaît le projet peut donc déchiffrer un QR qu'il aurait intercepté.

**Traitez ce QR exactement comme un mot de passe :** ne le publiez pas, ne l'envoyez pas sur un groupe de discussion, et supprimez la capture d'écran après usage.

### Sur le jeton Nightscout dans le Gist

Le Gist contient vos réglages, dont **l'adresse et le jeton Nightscout**. C'est nécessaire pour qu'un nouvel appareil se configure tout seul, mais cela signifie que quiconque accède à votre compte GitHub accède aussi à vos glycémies. Le jeton GitHub, lui, n'est jamais écrit dans le Gist.

---

## 11.5 Les six règles à respecter

1. **Authentification à deux facteurs sur GitHub.** C'est le compte qui protège l'ensemble de vos données de suivi.
2. **Verrouillage par code ou biométrie sur chaque téléphone.** Les identifiants myDiabby et la clé API y sont en clair.
3. **Un jeton par usage, à la portée minimale.** Pour GitHub : uniquement `gist`. Pour Nightscout : un jeton de lecture pour l'application, un jeton de dépôt pour xDrip, jamais l'API secret administrateur.
4. **`AUTH_DEFAULT_ROLES=denied` sur Nightscout** si vous l'auto-hébergez, afin que l'adresse seule ne suffise pas à lire les glycémies.
5. **Aucune clé dans le dépôt GitHub.** Le dépôt est public, et l'historique conserve tout : une clé publiée une fois doit être révoquée, même si vous la supprimez ensuite.
6. **Choisissez une adresse Nightscout discrète**, sans le nom complet de l'enfant : elle circulera entre plusieurs appareils et applications.

---

## 11.6 En cas de perte ou de vol d'un appareil

Dans l'ordre :

1. **Révoquez le jeton GitHub** : <https://github.com/settings/tokens> → **Delete**. La synchronisation de l'appareil perdu s'arrête aussitôt.
2. **Révoquez le jeton Nightscout** : Admin Tools → supprimez le sujet correspondant → recréez-en un.
3. **Changez le mot de passe myDiabby** s'il était enregistré sur cet appareil.
4. **Révoquez la clé API Anthropic** depuis la console, si elle y était.
5. Ressaisissez les nouveaux jetons sur les appareils que vous conservez.

C'est précisément pour rendre cette opération simple qu'il est conseillé de créer **un jeton par appareil**.

---

## 11.7 Statut réglementaire — à dire clairement

- **FollowDIA n'est pas un dispositif médical** et ne porte aucun marquage CE. Il n'a fait l'objet d'aucune validation clinique.
- **Nightscout et xDrip+ non plus** : ce sont des projets communautaires libres.
- Ces outils sont utilisés **sous votre responsabilité**, en complément — et non en remplacement — des dispositifs prescrits.
- Les décisions thérapeutiques doivent s'appuyer sur les dispositifs validés et sur l'avis de votre équipe de diabétologie.

### RGPD

Vous êtes responsable du traitement des données de votre enfant dans un cadre strictement familial et privé — ce qui relève de l'exception domestique du RGPD. Cela change si vous partagez ces données au-delà du cercle familial et soignant. Le rapport PDF contient des données de santé : partagez-le avec discernement.

➡️ Chapitre suivant : **[12. Questions fréquentes](12-faq.md)**
