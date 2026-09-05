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

`npm run build` utilise `hap-toolkit` et signe le paquet avec un certificat de
debug généré automatiquement — parfait pour un usage personnel. `npm run release`
produit une version signée par un certificat à soi, utile seulement pour une
distribution, dont on n'a pas besoin ici.

## Installer sur la Redmi Watch 4

L'installation d'une quick app se fait par l'application **Mi Fitness /
Xiaomi Wear** du téléphone appairé, pas par un store :

1. Téléphone et montre sur le **même réseau Wi-Fi**, montre appairée et
   connectée à Mi Fitness.
2. Dans Mi Fitness, activer le **mode développeur** (section « À propos » /
   « Paramètres du laboratoire » selon la version — il faut généralement taper
   plusieurs fois sur le numéro de version).
3. Lancer le serveur de debug local :
   ```bash
   npm run server            # affiche une URL et un QR code
   ```
4. Depuis le mode développeur de Mi Fitness, **scanner le QR code** (ou saisir
   l'adresse affichée) pour envoyer `dist/*.rpk` à la montre.
5. L'application **Padel** apparaît dans la liste des applications de la montre.

Sur certaines versions de HyperOS, le mode développeur n'accepte que les paquets
poussés depuis l'**outil de développement Xiaomi pour objets connectés**
(*Xiaomi Wearable Quick App IDE*, à télécharger sur le site développeur Xiaomi).
Dans ce cas : ouvrir ce dossier comme projet dans l'IDE — la structure
(`src/manifest.json`, `src/app.ux`, `src/pages/**`) est la structure standard
d'une quick app — puis utiliser sa commande d'installation sur appareil connecté.
Le code source ne change pas, seul l'outil qui empaquette change.

> **Non vérifié sur appareil.** Le projet compile et produit un `.rpk` signé,
> le moteur de score est couvert par des tests et l'interface a été validée au
> pixel dans le simulateur — mais je n'ai pas de Redmi Watch 4 pour confirmer
> l'installation. Voir « Dépannage » si la montre refuse le paquet.

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
| La montre refuse le `.rpk` | Baisser `minPlatformVersion` dans `src/manifest.json` (essayer `1000`, `1010`) : la valeur doit être ≤ à la version de plateforme de la montre. |
| Pas de vibration | Vérifier le réglage `VIBRATION`, puis retirer `system.vibrator` de `features` si Vela le refuse — les appels sont déjà protégés, l'app fonctionne sans. |
| L'écran s'éteint en plein match | Réglage `ECRAN ALLUME`. Si Vela ne fournit pas `system.brightness`, augmenter la temporisation d'écran dans les réglages de la montre. |
| La page Réglages ne s'affiche pas | Certaines versions de Vela ne gèrent pas `<list>` : remplacer `<list>`/`<list-item>` par des `<div>` dans `src/pages/Settings/index.ux`. |
| Texte tronqué | La maquette suppose 390 px de large (`designWidth` dans `manifest.json`). Ajuster cette valeur pour un autre écran. |

## Licence

Usage personnel, pas de distribution prévue.
