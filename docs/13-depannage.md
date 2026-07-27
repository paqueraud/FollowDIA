# 13. Dépannage

> ### ⚠️ FollowDIA n'est pas un dispositif médical
>
> **Vous êtes seul responsable de l'administration de l'insuline et de toute modification des paramètres de votre pompe.** Vérifiez chaque calcul, faites valider tout changement de réglage par votre équipe de diabétologie. Application fournie gratuitement, en l'état, sans garantie : le développeur ne peut être tenu responsable d'aucun dommage lié à son utilisation.
>
> ➡️ **[Lire les conditions d'utilisation complètes](AVERTISSEMENT.md)**


Ce chapitre est organisé **par symptôme**. Trouvez celui qui correspond, puis suivez les vérifications dans l'ordre : elles vont de la cause la plus fréquente à la plus rare.

---

## 13.1 Les premiers réflexes

Avant tout diagnostic, ces trois gestes règlent la majorité des situations :

1. **Fermer complètement l'application et la rouvrir** (pas seulement la mettre en arrière-plan).
2. **Forcer la mise à jour** : ⚙ Paramètres → Application → *Forcer la mise à jour*. Vos données ne sont pas touchées.
3. **Vérifier la connexion** : ouvrez n'importe quel site pour confirmer qu'Internet fonctionne.

---

## 13.2 L'application ne s'ouvre pas, ou l'écran est vide

**Un bandeau rouge d'erreur s'affiche en bas**

L'application a détecté une erreur et vous propose plusieurs boutons. Essayez-les **dans cet ordre** :

1. **Recharger** : cela suffit dans la plupart des cas.
2. **Restaurer la dernière sauvegarde** (ce bouton n'apparaît que s'il existe un instantané) : remplace les données de l'appareil par le dernier instantané automatique intact. C'est la bonne réponse quand les données locales sont corrompues — vous ne perdez au pire que les dernières minutes de saisie.
3. **Réinitialiser les données locales**, en dernier recours : efface les données de **cet appareil seulement**. Si la synchronisation est configurée, tout redescend du Gist ensuite ; **sinon, les données de cet appareil sont perdues**.

> Pour éviter d'en arriver là : activez la [synchronisation](10-synchronisation.md) et exportez de temps en temps un fichier JSON (⚙ Paramètres → Sauvegarde et export).

**Écran blanc ou seuls les onglets s'affichent**

1. Forcez la mise à jour (13.1).
2. Si rien n'y fait : menu du navigateur → Paramètres → Confidentialité → **Effacer les données du site** pour l'adresse de FollowDIA, puis rouvrez.

**Erreur 404 sur l'adresse GitHub Pages**

1. Vérifiez l'orthographe de l'adresse, **barre oblique finale comprise**.
2. Dans le dépôt : Settings → Pages → la source doit être **GitHub Actions**.
3. Onglet Actions : la dernière exécution doit être verte (✓).
4. Après la toute première publication, comptez jusqu'à **10 minutes** avant que l'adresse réponde.

---

## 13.3 La glycémie ne s'affiche pas

**Message « Erreur CORS ou réseau »**

C'est le cas le plus fréquent. Dans l'ordre :

1. **Vérifiez l'adresse** : elle doit commencer par `https://` et ne pas contenir de faute de frappe.
2. **Testez le serveur** dans un navigateur :
   ```
   https://VOTRE-SITE/api/v1/status.json?token=VOTRE-JETON
   ```
   - Réponse contenant `"status":"ok"` → le serveur va bien, le problème est dans la saisie côté application.
   - `{"status":"unauthorized"}` → le jeton est faux ou n'a pas le rôle `readable`.
   - Rien ne répond → le serveur est arrêté ou l'adresse est erronée.
3. **Ajoutez un jeton** s'il est vide : certaines instances refusent les requêtes venant d'un autre site sans authentification.

**Message « Connecté mais aucune glycémie trouvée »**

L'adresse et le jeton sont bons, mais Nightscout est vide : le problème est **en amont**, du côté d'xDrip+. Passez à la section 13.4.

**La courbe s'arrête à une certaine heure**

xDrip+ a cessé d'envoyer à ce moment-là. Voir 13.4.

**Le bouton CGM reste orange**

Il ne verdit que si la mesure a **moins de 5 minutes**. Le message indique l'ancienneté réelle. Si elle dépasse quelques minutes en permanence, la remontée est en cause (13.4).

---

## 13.4 Les glycémies n'arrivent pas sur Nightscout

Le problème est entre le capteur et Nightscout.

**Étape 1 — xDrip+ voit-il le capteur ?**

Ouvrez xDrip+ : une valeur récente doit s'afficher.

- **Non** : problème de capteur ou de Bluetooth. Vérifiez que le Bluetooth est actif, que le téléphone est à portée, et qu'aucun autre appareil ne monopolise la connexion au capteur.
- **Oui** : passez à l'étape 2.

**Étape 2 — xDrip+ arrive-t-il à envoyer ?**

Menu ☰ → **System Status** → onglet **Uploader**. Les erreurs y sont listées.

- **Erreur d'authentification** : le jeton de dépôt est faux, ou son sujet n'a pas les droits d'écriture. Recréez-le (chapitre 3.3.3).
- **Erreur réseau** : le téléphone n'a pas d'accès Internet, ou l'adresse est erronée.
- **Aucune tentative d'envoi** : l'option d'envoi n'est pas activée (chapitre 4.4).

**Étape 3 — Est-ce la batterie ?**

C'est la cause n°1 des arrêts nocturnes.

1. Paramètres Android → Applications → xDrip+ → Batterie → **Sans restriction**.
2. Sur Samsung, Xiaomi, Huawei, Oppo : autorisez aussi le fonctionnement en arrière-plan dans l'outil maison de la marque. Voir <https://dontkillmyapp.com>.
3. Désactivez tout mode économie d'énergie programmé la nuit.

---

## 13.5 La synchronisation ne fonctionne pas

**L'icône ⟳ devient rouge**

1. **Vérifiez le jeton GitHub** : il doit avoir la portée **`gist`**. Un jeton sans cette portée échoue systématiquement.
2. **Vérifiez qu'il n'a pas expiré** : <https://github.com/settings/tokens>. Un jeton expiré doit être recréé, puis ressaisi sur chaque appareil.
3. **Vérifiez l'identifiant du Gist** : il doit être identique sur tous les appareils. Pour repartir proprement, videz le champ sur **un seul** appareil et laissez l'application recréer un Gist ; recopiez ensuite le nouvel identifiant sur les autres.

**Les données ne remontent pas d'un appareil à l'autre**

1. Appuyez sur ⟳ sur les **deux** appareils (la lecture automatique n'a lieu que toutes les 2 minutes).
2. Vérifiez que le Gist existe bien : <https://gist.github.com/>.
3. Vérifiez que les deux appareils sont réglés sur **la même date** (barre supérieure).

**Une modification a disparu**

Deux appareils ont modifié **le même repas du même jour** : la dernière modification enregistrée écrase l'autre. Voir [10.5](10-synchronisation.md#105-comment-les-conflits-sont-résolus).

---

## 13.6 L'assistant IA ne fonctionne pas

**« Identifiant ou mot de passe myDiabby incorrect »**

1. Testez-les sur <https://app.mydiabby.com> dans un navigateur.
2. ⚠️ **N'enchaînez pas les tentatives** : myDiabby bloque le compte environ 15 minutes après plusieurs échecs. Le message renvoyé par myDiabby est affiché tel quel dans l'application.

**« Format myDiabby non reconnu » ou import incomplet**

L'application affiche alors un **diagnostic** décrivant la structure reçue (uniquement des noms de champs, aucune donnée de santé). Copiez ce message pour le signaler : il permet d'identifier précisément le problème.

**« Aucune glycémie capteur reçue »**

Les données de pompe ont bien été récupérées, mais sans glycémies. Vérifiez sur myDiabby que le capteur est bien associé au compte et que le dernier transfert contenait les glycémies.

**« Réponse encore tronquée »**

L'analyse a dépassé le budget de réponse, même après la reprise automatique. **Choisissez la période de 7 jours** en haut de l'onglet et relancez.

**« Clé API invalide »**

1. Vérifiez la clé sur <https://console.anthropic.com> (section API Keys).
2. Vérifiez que le compte dispose bien de **crédit** : une clé valide sans crédit échoue également.
3. Recopiez la clé sans espace avant ni après.

**Le PDF ne se génère pas**

1. Sur ordinateur, vérifiez le dossier **Téléchargements** : le fichier s'y trouve peut-être déjà.
2. Sur téléphone, si la feuille de partage ne s'ouvre pas, le fichier est téléchargé — cherchez `FollowDIA_analyse_AAAA-MM-JJ.pdf` dans vos téléchargements.
3. Le bouton n'apparaît que **s'il existe une analyse** : lancez-en une d'abord.

---

## 13.7 Problèmes d'affichage

**Le texte est trop petit / trop grand**

⚙ Paramètres → Taille du texte : quatre niveaux disponibles. Le réglage agit aussi sur les graphiques.

**L'écran est illisible en plein soleil**

⚙ Paramètres → Apparence → **☀️ Clair (plein soleil)**, un thème à contraste élevé.

**Des éléments débordent de l'écran**

Cela peut arriver en taille « Très grand » sur un écran étroit. Les marges sont réduites automatiquement à ces tailles ; si le problème persiste, passez à la taille inférieure et signalez-le.

**Le navigateur propose d'enregistrer un mot de passe sur un champ de saisie**

Si un mot de passe enregistré est proposé sur des champs numériques, c'est qu'il reste un ancien mot de passe mémorisé pour ce site dans votre navigateur. Supprimez-le : Chrome → Paramètres → Gestionnaire de mots de passe → recherchez l'adresse de FollowDIA → Supprimer.

---

## 13.8 La publication GitHub échoue

**Le workflow apparaît en rouge (✗)**

1. Onglet **Actions** → ouvrez l'exécution en échec → lisez l'étape en rouge.
2. Erreur de permissions : Settings → Actions → General → **Workflow permissions** → *Read and write permissions*.
3. Erreur sur `actions/deploy-pages` : la source de publication n'est pas réglée sur **GitHub Actions** (Settings → Pages).

**Aucune exécution ne se déclenche**

1. Onglet Actions : un bandeau demande peut-être d'activer les workflows. Cliquez sur **I understand my workflows, go ahead and enable them**.
2. Le workflow ne se déclenche que sur la branche **`main`**. Vérifiez le nom de votre branche par défaut.

**L'application ne se met pas à jour sur les appareils**

1. ⚙ Paramètres → Application → **Forcer la mise à jour**.
2. Comparez le numéro de version affiché avec celui de `version.json` sur votre site :
   ```
   https://VOTRE-COMPTE.github.io/FollowDIA/version.json
   ```
3. S'ils diffèrent encore après un forçage, videz les données du site dans le navigateur.

---

## 13.9 Comment signaler un problème utilement

Rassemblez :

1. le **numéro de version** (⚙ Paramètres → Application) ;
2. l'**appareil et le navigateur** (par exemple : Android 14, Chrome ; ou iPhone, Safari) ;
3. le **message d'erreur exact**, recopié ou photographié ;
4. **ce que vous faisiez** au moment du problème ;
5. si le problème est **reproductible** et sur **quels appareils**.

> **Ne joignez jamais** de capture contenant un jeton, une clé API ou un mot de passe. Masquez-les avant tout envoi.


---

> ⚠️ **Rappel** — Rien de ce qui précède ne constitue un avis médical. **Vous êtes seul responsable** de l'insuline administrée et des réglages modifiés ; le développeur ne peut être tenu responsable d'aucun dommage. → **[Conditions d'utilisation](AVERTISSEMENT.md)**

⬅️ Retour au **[sommaire](README.md)**
