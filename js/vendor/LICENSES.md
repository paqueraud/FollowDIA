# Bibliothèques tierces embarquées

Ces deux bibliothèques sont **hébergées localement** (et non chargées depuis un CDN) afin que FollowDIA fonctionne entièrement hors ligne et ne dépende d'aucun service externe pour le partage de configuration par QR code.

Elles ne sont utilisées que par cette fonction : la génération et la lecture des QR codes de configuration.

---

## qrcode-generator 1.4.4

- **Rôle** : génération des QR codes de configuration
- **Auteur** : Kazuhiko Arase — <https://github.com/kazuhikoarase/qrcode-generator>
- **Licence** : MIT
- **Fichier** : `qrcode-generator.js` (copie non modifiée de la distribution npm)

```
Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## jsQR 1.4.0

- **Rôle** : lecture des QR codes (caméra et image)
- **Auteur** : Cosmo Wolfe — <https://github.com/cozmo/jsQR>
- **Licence** : Apache License 2.0
- **Fichier** : `jsQR.min.js` (build minifié de la distribution npm, avec l'en-tête d'attribution restitué — la minification l'avait supprimé)

Extrait des conditions ; le texte intégral est disponible à <https://www.apache.org/licenses/LICENSE-2.0> :

```
Copyright (c) Cosmo Wolfe

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Mise à jour de ces fichiers

Ces copies sont figées volontairement. Pour les mettre à jour :

```bash
curl -sL -o js/vendor/qrcode-generator.js \
  https://cdn.jsdelivr.net/npm/qrcode-generator@<version>/qrcode.js
curl -sL -o js/vendor/jsQR.min.js \
  https://cdn.jsdelivr.net/npm/jsqr@<version>/dist/jsQR.min.js
```

Pensez ensuite à **restituer l'en-tête d'attribution de jsQR** (la minification le retire) et à vérifier que le partage par QR code fonctionne toujours.
