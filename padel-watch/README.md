# Padel — compteur de points pour Redmi Watch 4

Compteur de points de padel qui tourne **sur la montre**, **100 % en local** :
aucun compte, aucun réseau, aucune soumission à un store. Le score est gardé
dans le stockage de la montre, donc il survit à l'extinction de l'écran et au
redémarrage de l'application.

La Redmi Watch 4 tourne sous **HyperOS / Vela** (et non Wear OS) : les
applications tierces y prennent la forme d'une *quick app* Xiaomi, empaquetée
dans un fichier `.rpk` que l'on installe en local via le mode développeur.
C'est ce que produit ce dépôt.

```
                 ┌──────────────────────────┐
                 │        SET 3             │
                 │  SETS 1-1   6-4  6-7(5)  │
                 │                          │
                 │   ● NOUS        EUX      │
                 │                          │
                 │     40           15      │
                 │      5            4      │
                 │                          │
                 │     BALLE DE MATCH       │
                 │ ANNULER NOUVEAU REGLAGES │
                 └──────────────────────────┘
```

## Ce que fait l'application

- **Une moitié d'écran = une équipe.** On tape à gauche pour NOUS, à droite pour
  EUX. Rien d'autre à viser en plein match.
- **Gros chiffres** : le point courant occupe la moitié de la dalle, lisible à
  bout de bras entre deux échanges.
- **Point de service** : une pastille de couleur indique l'équipe au service,
  y compris pendant le jeu décisif (rotation 1 point puis 2).
- **Alertes** : `BALLE DE JEU` / `BALLE DE SET` / `BALLE DE MATCH`,
  `POINT EN OR` à 40-40, et `CHANGEMENT DE COTE` au bon moment.
- **Annulation point par point**, y compris à travers une fin de jeu ou de set.
- **Vibration** courte sur un point, longue sur un jeu, un set ou le match.
- **Écran maintenu allumé** pendant la partie (désactivable).
- **Reprise automatique** : le match en cours est relu au démarrage.

## Règles gérées

| Règle | Détail |
|---|---|
| Points | 0 / 15 / 30 / 40 |
| 40-40 | **point en or** (défaut) ou avantages classiques |
| Set | 6 jeux avec 2 jeux d'écart |
| 6-6 | jeu décisif en 7 points, 2 points d'écart |
| Match | 2 sets gagnants (défaut) ou 1 set sec |
| Set décisif | set normal (défaut) ou **super tie-break en 10 points** |
| Service | alterne à chaque jeu ; 1 puis 2 points en jeu décisif ; le premier serveur du tie-break reçoit au set suivant |
| Côtés | jeux impairs cumulés, et tous les 6 points en jeu décisif |

Tout est réglable depuis l'écran **REGLAGES** de la montre. Un changement de
règle s'applique au **prochain** match — sauf si l'on utilise le bouton
`APPLIQUER + NOUVEAU MATCH`, qui relance immédiatement.

## Essayer tout de suite, sans la montre

Le simulateur reprend le moteur de score **et** la maquette exacte
(390 × 450 px, la dalle de la Redmi Watch 4) :

```bash
npm run web          # puis ouvrir http://localhost:8080/
```

`web/index.html` s'ouvre aussi directement dans un navigateur. Clavier :
`←`/`A` pour NOUS, `→`/`P` pour EUX, `Z` annuler, `N` nouveau match. Les trois
boutons sous le cadre permettent de tester les variantes de règles.

## Construire le `.rpk`

```bash
npm install
npm run verify       # contrôle des .ux + 21 tests du moteur
npm run build        # -> dist/com.padel.compteur.debug.1.0.0.rpk
```

La compilation utilise **`aiot-toolkit`**, la chaîne d'outils officielle Xiaomi
pour les quick apps Vela (`aiot build`) — c'est elle qui génère le bytecode
`jsc`, le `manifest-watch.json` et la signature attendus par la montre. Le
paquet est signé avec le certificat de debug intégré, ce qui suffit pour une
installation personnelle.

Le `.rpk` déjà compilé est versionné dans **`dist/`** : on peut le récupérer
directement depuis GitHub sans rien installer.

## Installer sur la Redmi Watch 4

Il n'y a pas de store à passer, mais pas non plus de bouton officiel : on
passe par le **menu de debug caché de Mi Fitness**, sur le téléphone appairé.

### 1. Mettre le `.rpk` sur le téléphone

Télécharger `dist/com.padel.compteur.debug.1.0.0.rpk` depuis ce dépôt (ou le
recompiler) et l'enregistrer dans les fichiers du téléphone — n'importe quel
dossier accessible par le sélecteur de fichiers.

### 2. Ouvrir le menu de debug de Mi Fitness

Dans l'application **Mi Fitness** (téléphone) :

```
Moi  ->  À propos  ->  Debug  ->  Applications tierces
```

Il s'agit du **À propos de l'application**, pas du « À propos de l'appareil »
de la montre. Sur la plupart des versions, l'entrée `Debug` n'apparaît qu'après
plusieurs appuis successifs sur le logo ou le numéro de version.

### 3. Installer

1. `Cliquer pour saisir le nom du paquet` → saisir **`com.padel.compteur`**
   (le nom exact n'est nécessaire que pour désinstaller plus tard).
2. `Installer une application tierce`.
3. Choisir le fichier `.rpk` enregistré à l'étape 1.
4. Un message de confirmation apparaît ; **Padel** arrive dans la liste des
   applications de la montre.

### Si le menu Debug n'existe pas

Il est absent de certaines versions, notamment **hors de Chine** et sur
**iOS** — l'installation d'applications tierces sur les montres Vela est une
fonction pensée d'abord pour l'application chinoise 小米运动健康, sur Android.
Deux contournements, tous deux sur Android :

- **Gadgetbridge** (libre, F-Droid) : son *App Manager* sait envoyer un `.rpk`
  aux montres Xiaomi « protobuf ». Support des Redmi Watch encore expérimental,
  et il faut extraire l'*AuthKey* de l'application officielle.
- **Outils de la communauté BandBBS** : installation Bluetooth en un clic, avec
  l'AuthKey lue via Shizuku dans les journaux de Mi Fitness.

> **Non vérifié sur appareil.** Le projet compile avec la chaîne officielle
> Xiaomi et produit un `.rpk` Vela signé ; le moteur de score est couvert par
> 21 tests et l'interface a été rendue et pilotée au pixel dans un navigateur à
> 390 × 450. Mais je n'ai ni Redmi Watch 4 ni accès à l'émulateur Vela
> (`npx aiot initEmulatorEnv`, à lancer depuis une machine ayant accès au CDN
> Xiaomi) pour confirmer le rendu et l'installation sur le vrai runtime.
> Les chemins de menus ci-dessus proviennent de documentations tierces et
> varient selon la version de Mi Fitness.

## Structure du projet

```
padel-watch/
├── src/
│   ├── manifest.json          déclaration de l'app (pages, features, écran)
│   ├── app.ux                 point d'entrée
│   ├── common/
│   │   ├── padel-engine.js    moteur de score, sans dépendance (UMD)
│   │   ├── store.js           persistance @system.storage
│   │   ├── device.js          vibration + écran allumé, appels protégés
│   │   └── logo.png           icône, générée par tools/make-icon.js
│   └── pages/
│       ├── Index/index.ux     tableau de score
│       └── Settings/index.ux  réglages
├── web/index.html             simulateur 390 × 450 (même moteur)
├── test/engine.test.js        21 tests du moteur
└── tools/
    ├── check-ux.js            vérifie les .ux avant compilation
    ├── make-icon.js           génère l'icône PNG
    └── serve.js               serveur statique pour le simulateur
```

Le moteur (`padel-engine.js`) est volontairement isolé de l'interface : il ne
connaît ni la montre ni le DOM, ce qui permet de le tester sous Node et de le
réutiliser tel quel dans le simulateur.

## Vérifications

```bash
npm test       # 21 tests : points, avantages, point en or, tie-break,
               # super tie-break, service, côtés, annulation, sauvegarde
npm run check  # blocs .ux bien formés, classes CSS et gestionnaires existants
```

## Dépannage

| Symptôme | Piste |
|---|---|
| La montre refuse le `.rpk` | `minPlatformVersion` est à `1000` dans `src/manifest.json`, la valeur du projet de démonstration officiel Xiaomi. Si le refus persiste, vérifier que `deviceTypeList` contient bien `"watch"`. |
| L'app s'installe mais l'écran reste noir | Passer `config.logLevel` à `"debug"` dans `src/manifest.json` et relire les journaux via Mi Fitness. Le suspect le plus probable est la page Réglages : remplacer `<list>`/`<list-item>` par des `<div>` dans `src/pages/Settings/index.ux`. |
| Pas de vibration | Vérifier le réglage `VIBRATION`, puis retirer `system.vibrator` de `features` si Vela le refuse — les appels sont déjà protégés, l'app fonctionne sans. |
| L'écran s'éteint en plein match | Réglage `ECRAN ALLUME`. Si Vela ne fournit pas `system.brightness`, augmenter la temporisation d'écran dans les réglages de la montre. |
| Texte tronqué ou décalé | La maquette suppose 390 px de large (`config.designWidth` dans `src/manifest.json`). Ajuster cette valeur pour un autre écran. |
| Désinstaller | Même menu Debug, `Applications tierces`, avec le nom de paquet `com.padel.compteur`. |

## Licence

Usage personnel, pas de distribution prévue.
