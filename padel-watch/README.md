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
        ┌─────────────────────────────────────┐
        │  SET 3                  6-4 · 6-7(5)│
        ├──────────────────┬──────────────────┤
        │   NOUS  [1]      ╎      EUX  [1]    │
        │                  ╎                  │
        │       40         ╎        15        │
        │      5 JEUX      ╎       4 JEUX     │
        ├──────────────────┴──────────────────┤
        │           BALLE DE MATCH            │
        │  ANNULER      NOUVEAU     RÉGLAGES  │
        └─────────────────────────────────────┘
```

L'écran est un **terrain vu du dessus** : deux camps séparés par un filet,
sur la résine bleue sous les projecteurs. Le camp au service s'éclaire — la
pastille de quelques pixels devient un demi-écran, lisible à bout de bras.
Le jaune est celui de la balle, le bleu celui du terrain ; ce couple reste
distinguable en cas de daltonisme rouge-vert, contrairement au vert-orange.

Aucune police n'est chargée depuis le réseau : sur un terrain sans signal,
une police qui échoue en silence est pire qu'une pile système travaillée —
chiffres tabulaires, graisse haute, chasse resserrée sur le score, capitales
espacées pour les étiquettes.

## Ce que fait l'application

- **Une moitié d'écran = une équipe.** On tape à gauche pour NOUS, à droite pour
  EUX. Rien d'autre à viser en plein match.
- **Gros chiffres** : le point courant occupe la moitié de la dalle, lisible à
  bout de bras entre deux échanges.
- **Point de service** : une pastille de couleur indique l'équipe au service,
  y compris pendant le jeu décisif (rotation 1 point puis 2).
- **Alertes** : `BALLE DE JEU` / `BALLE DE SET` / `BALLE DE MATCH`,
  `POINT EN OR` à 40-40, et `CHANGEMENT DE COTE` au bon moment. En mode
  avantages, `ÉGALITÉ` et `AVANTAGE NOUS` / `AVANTAGE EUX` : sans ce libellé,
  voir le chiffre adverse retomber de `AV` à `40` après son propre point donne
  l'impression que les côtés sont inversés.
- **Annulation point par point**, y compris à travers une fin de jeu ou de set.
- **Vibration** courte sur un point, longue sur un jeu, un set ou le match.
- **Écran maintenu allumé** pendant la partie (désactivable).
- **Reprise automatique** : le match en cours est relu au démarrage.

## L'écran de la montre

390 × 450, regardé une seconde entre deux échanges, souvent en plein soleil,
manipulé une raquette à la main. La contrainte n'est pas celle du téléphone,
la mise en page non plus.

- **Le camp au service porte sa plaque pleine**, dans sa couleur. À bout de
  bras un aplat se voit, une pastille de dix pixels non.
- **Deux commandes, pas trois.** « Nouveau match » vit dans les réglages :
  sur une dalle de 1,97 pouce, une action destructive n'a rien à faire à côté
  d'ANNULER, qu'on touche à chaque erreur.
- **Le score et l'état de la balle forment un bloc**, centré d'un seul tenant.
  Séparés, l'œil traversait deux vides avant d'atteindre l'information.
- Le bandeau d'historique tient en 30 px : la phase et les sets joués sont
  utiles une fois par set, pas à chaque point.

```bash
npm run preview      # -> dist/preview-montre.html
```

Faute d'appareil et d'accès à l'émulateur Vela, c'est ainsi que cet écran a
été dessiné : l'outil rend le vrai `.ux` dans un navigateur, à la taille de la
dalle, en reproduisant ce qui décide de la mise en page — les `<div>` en flex
ligne par défaut, les `<text>` en bloc, `border-width` sans `border-style`.
Ce n'est pas l'appareil, mais c'est la géométrie de l'appareil.

## Règles gérées

| Règle | Détail |
|---|---|
| Points | 0 / 15 / 30 / 40 |
| 40-40 | **avantages** (défaut) : `40-40`, puis `40-AV`, puis le jeu — et retour à `40-40` si l'adversaire reprend le point. Le **point en or** (un seul point à 40-40) est disponible dans les réglages. |
| Set | 6 jeux avec 2 jeux d'écart |
| 6-6 | jeu décisif en 7 points, 2 points d'écart |
| Match | 2 sets gagnants (défaut) ou 1 set sec |
| Set décisif | set normal (défaut) ou **super tie-break en 10 points** |
| Service | alterne à chaque jeu ; 1 puis 2 points en jeu décisif ; le premier serveur du tie-break reçoit au set suivant |
| Côtés | jeux impairs cumulés, et tous les 6 points en jeu décisif |

Tout est réglable depuis l'écran **REGLAGES** de la montre. Un changement de
règle s'applique au **prochain** match — sauf si l'on utilise le bouton
`APPLIQUER + NOUVEAU MATCH`, qui relance immédiatement.

## La même app sur téléphone

`web/index.html` fait tourner **le même moteur de score** dans un navigateur.
Sur un grand écran il rend la maquette exacte de la montre (390 × 450 px), ce
qui sert à travailler l'interface ; sur téléphone il passe en plein écran, avec
les deux moitiés comme grandes cibles tactiles. C'est un compteur pleinement
utilisable au bord du terrain — et le seul recours quand la montre est
inaccessible (voir « Installer » plus bas).

```bash
npm run web            # http://localhost:8080/
npm run web:build      # -> dist/padel-web.html, page autonome d'un seul fichier
npm run web:artifact   # -> dist/padel-artifact.html, à publier comme Artifact
```

Sur téléphone : plein écran en portrait comme en paysage (appareil posé de
chant au bord du terrain), zoom au double-tap et rebond élastique désactivés,
et l'écran est maintenu allumé pendant le match via l'API Wake Lock quand le
navigateur l'autorise — sinon le bouton correspondant disparaît et il faut
régler le verrouillage automatique du téléphone sur « Jamais ».

Clavier : `←`/`A` pour NOUS, `→`/`P` pour EUX, `Z` annuler, `N` nouveau match.
Le bouton `REGLAGES` ouvre les variantes de règles.

## Le score sur la montre sans installer l'application

La montre n'a pas besoin de l'application pour afficher le score. Appairée à
l'iPhone, elle reçoit déjà les notifications du téléphone par **ANCS**, un
service Bluetooth d'Apple qui ne demande aucune application côté téléphone :
une fois la montre autorisée, tout ce que l'iPhone notifie lui parvient. Depuis
iOS 26.3, un réglage « Transfert de notifications » dédié aux montres tierces
permet même de choisir app par app — il est réservé à l'Europe.

Le compteur pousse donc le score **à chaque jeu, set et match** — pas à chaque
point, qui ferait vibrer le poignet septante fois par match :

```
Padel — Jeu NOUS · 4-3
Padel — Set NOUS · 6-4 — sets 1-0
Padel — Match NOUS · 2-1
```

Les notifications portent toutes la même étiquette : la montre en affiche une
seule, remplacée à chaque fois, au lieu d'en empiler quinze.

### Savoir lequel des maillons lâche

`REGLAGES` affiche un diagnostic en direct, mis à jour chaque seconde tant que
la feuille est ouverte. Chaque ligne est verte quand elle va, orange sinon :

```
page installée  : oui
service worker  : actif
notifications   : actives
écran allumé    : tenu
audio           : en lecture
média montre    : actif — 40 - 30
```

C'est ce bloc qu'il faut lire quand quelque chose ne marche pas : il distingue
une permission refusée d'un mode silencieux ou d'une page ouverte depuis Safari
plutôt que depuis son icône.

### Marquer depuis la montre (expérimental)

Le sens inverse existe aussi, par un seul canal : **les commandes musique**.
La montre les envoie à l'iPhone via AMS, iOS les route vers l'application qui
tient la lecture en cours, et une page web les reçoit par l'API MediaSession.

```
piste précédente  (bouton de gauche)  ->  point pour NOUS   (colonne de gauche)
piste suivante    (bouton de droite)  ->  point pour EUX    (colonne de droite)
```

Les deux boutons suivent la position des colonnes à l'écran. L'inverse
paraît arbitraire au poignet : on appuie à droite et le chiffre de gauche
monte.

En retour, le titre de la lecture en cours porte le score : l'écran musique de
la montre devient un tableau d'affichage.

```
0 - 15                 (titre)
NOUS 1 · 0 EUX         (artiste)
Sets 0 - 0             (album)
```

À activer par `REGLAGES → Boutons montre (essai)`, puis ouvrir l'écran musique
de la montre.

**Ses conditions, qui sont réelles.** La page doit tenir la lecture en cours,
donc jouer un son — un flux d'une seconde à un niveau inaudible, généré à la
volée, iOS ignorant l'attribut `volume`. Or iOS coupe l'audio web si le
téléphone est en **mode silencieux** ou si l'**écran se verrouille**, d'où le
maintien de l'écran allumé. Et cela prend la main sur la lecture en cours : la
musique s'arrête. À réserver au match, pas à l'échauffement en musique.

Vérifié en navigateur : les quatre gestionnaires se posent, quatre « suivant »
donnent bien un jeu, « précédent » marque pour l'adversaire, les métadonnées
suivent le score et le réglage survit à un rechargement. Non testé sur
appareil — les contournements audio d'iOS ont une réputation d'irrégularité,
c'est le point à éprouver sur le terrain.

### Publier la page pour que ça marche

iOS n'autorise les notifications web que depuis une page **ajoutée à l'écran
d'accueil** et servie **par son propre domaine** en HTTPS. D'où la variante
installable :

```bash
npm run web:pwa      # -> docs/ : page + service worker + manifeste + icônes
```

Le dossier `docs/` est prêt pour GitHub Pages. Côté dépôt, dans
`Settings → Pages`, choisir `Deploy from a branch`, la branche de travail et le
dossier `/docs`. Le site sort alors sur `https://<compte>.github.io/studia/`.

Sur l'iPhone : ouvrir cette adresse dans Safari, `Partager → Sur l'écran
d'accueil`, lancer l'app depuis l'icône, puis `REGLAGES → Notifs montre` pour
accorder la permission. Le bouton reste masqué là où le navigateur ne le permet
pas — page locale, page embarquée — plutôt que de promettre dans le vide.

Le service worker met la page en cache : elle démarre et fonctionne sans
réseau, ce qui est la règle plutôt que l'exception sur un terrain.

> Non testé sur appareil : je n'ai ni iPhone ni montre. Ce que j'ai vérifié en
> navigateur, c'est que le service worker s'enregistre, que les notifications
> partent bien au jeu et au set avec le bon libellé, et que la page se sert du
> cache hors ligne. L'inconnue restante est de savoir si une web app apparaît
> dans la liste des applications autorisées de Mi Fitness.

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

### Depuis un iPhone

Le menu Debug n'existe pas sur iOS : l'installation d'applications tierces sur
les montres Vela n'est outillée que côté Android. Mais la montre n'a pas besoin
d'être ré-appairée pour autant — et c'est ce qui rend la chose faisable.

**Ne jamais dissocier la montre.** Le support Xiaomi est explicite : après une
dissociation, *« la montre est restaurée aux réglages d'usine et toutes les
données sont effacées »*. Appairer la montre à un Android puis revenir à
l'iPhone la réinitialiserait deux fois et effacerait l'application. La méthode
ci-dessous laisse la montre liée à l'iPhone du début à la fin.

#### Étape 1 — récupérer la clé Bluetooth (sur l'ordinateur, sans Android)

Les clés d'appairage sont stockées sur les serveurs Xiaomi. La montre étant
déjà liée au compte via l'iPhone, la sienne est déjà là :

```bash
pip install huami-token
huami-token -m xiaomi -b
```

L'outil demande l'e-mail et le mot de passe du compte Xiaomi (saisie masquée,
jamais en argument de ligne de commande), puis liste les appareils liés :

```
Device 0: Redmi Watch 4
  MAC: 54:2F:04:A8:54:DD
  Key: 0x............................
```

Garder la ligne dont l'adresse MAC est celle de la montre — elle est lisible
dans Mi Fitness, `À propos de l'appareil`.

> Le paquet est libre et s'adresse directement aux serveurs Xiaomi depuis la
> machine : les identifiants ne passent par aucun tiers. Éviter les équivalents
> en ligne, qui demandent le mot de passe du compte à un site inconnu.

#### Étape 2 — installer (n'importe quel Android emprunté, ~20 minutes)

Le téléphone n'est ni appairé à la montre ni lié au compte : il sert de radio
Bluetooth pilotable, le temps du transfert.

**Outil retenu : Notify for Xiaomi** (Play Store, `com.mc.xiaomi1`). La
Redmi Watch 4 figure explicitement dans ses appareils pris en charge, et il
expose une commande dédiée à l'installation d'un `.rpk`.

1. Copier `dist/com.padel.compteur.debug.1.0.0.rpk` sur le téléphone
   (courriel, Drive, câble — peu importe).
2. Installer **Notify for Xiaomi**, puis lui donner la clé de l'étape 1
   pendant l'assistant d'appairage. L'application sait aussi la récupérer
   seule via un bouton `Get`, mais cela suppose de lui confier les
   identifiants du compte Xiaomi : coller la clé obtenue à l'étape 1 évite
   ce détour.
3. Connecter la montre depuis Notify. Mi Fitness perd la connexion pendant
   ce temps — c'est normal, une seule application peut parler à la montre à
   la fois, et le lien avec l'iPhone n'est pas rompu pour autant.
4. `Device` → `firmware update` → `Third party app` → choisir le `.rpk`.
5. Fermer Notify et resynchroniser la montre avec Mi Fitness sur l'iPhone.

**Repli : Gadgetbridge** (libre, F-Droid), qui prend aussi en charge les
montres Xiaomi « protobuf » dont la Redmi Watch 4 : appui long sur l'appareil
→ `Auth key` → coller la clé, puis `App Manager` → installer le `.rpk`. Son
support est marqué récent et expérimental, et son gestionnaire RPK plus jeune
que celui de Notify — d'où le second rang.

Dans les deux cas, la règle est la même : **ne jamais dissocier la montre**,
sous peine d'invalider la clé et de tout réinitialiser.

#### Variante sans téléphone : émulateur Android + dongle Bluetooth USB

Un émulateur seul ne suffit pas. Le Bluetooth de l'émulateur Android est
*RootCanal*, un contrôleur virtuel : il ne relie que des émulateurs entre eux
et ne voit aucun appareil réel. Et le Bluetooth intégré d'un Mac ne peut pas
lui être prêté — Darwin interdit à l'espace utilisateur de parler directement
au contrôleur, y compris en `sudo` ; tout passe par CoreBluetooth, qui
n'expose pas les paquets HCI.

Il faut donc fournir une **seconde radio physique** : un dongle Bluetooth USB,
ponté vers l'émulateur avec *Bumble*, la pile Bluetooth Python de Google.

Le piège est que macOS s'empare de tout contrôleur Bluetooth USB avec sa
propre pile. Bumble documente le réglage qui l'en empêche :

```bash
sudo nvram bluetoothHostControllerSwitchBehavior="never"   # puis redémarrer
brew install libusb
pip install bumble

# AVD API 33+ démarré, dongle branché
sudo python3 -m bumble.apps.hci_bridge \
     android-netsim:_:8554,mode=controller usb:0
```

Puis, dans l'émulateur, **Gadgetbridge** plutôt que Notify : c'est un APK
autonome installable via `adb install`, là où Notify vient du Play Store et
exigerait une image système avec les services Google et une connexion à un
compte.

`npm run doctor` passe en revue les sept prérequis de cette variante — paquet,
clé Bluetooth, dongle, réglage nvram, bumble et libusb, émulateur,
Gadgetbridge — et indique lequel manque, avec la commande pour le combler. Le
script ne modifie rien, il constate.

J'ai écarté la variante machine virtuelle Android-x86 sous UTM : la capture
USB par macOS y empêche une réinitialisation matérielle propre du
périphérique, et le passage d'un dongle y est notoirement instable. Le pont
Bumble est le montage le mieux documenté.

Chaîne non testée de mon côté — je n'ai ici ni dongle ni montre. Le point le
plus capricieux reste l'appairage netsim entre le pont et l'émulateur.


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
