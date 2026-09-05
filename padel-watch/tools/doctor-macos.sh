#!/usr/bin/env bash
# Vérifie, étape par étape, ce qui manque encore pour installer le .rpk sur la
# montre depuis un Mac, sans téléphone Android : émulateur Android + dongle
# Bluetooth USB ponté par Bumble.
#
# Ce script ne modifie rien. Il constate et dit quoi faire ensuite.
#
#   bash tools/doctor-macos.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ok=0; todo=0

green() { printf '  \033[32mOK\033[0m   %s\n' "$1"; ok=$((ok + 1)); }
todo()  { printf '  \033[33mÀ FAIRE\033[0m  %s\n' "$1"; todo=$((todo + 1)); }
info()  { printf '         %s\n' "$1"; }
step()  { printf '\n\033[1m%s\033[0m\n' "$1"; }

if [ "$(uname -s)" != "Darwin" ]; then
  printf 'Ce script est prévu pour macOS ; ici : %s. Les vérifications vont surtout échouer.\n' "$(uname -s)"
fi

step "1. Le paquet à installer"
RPK="$(ls "$ROOT"/dist/*.rpk 2>/dev/null | head -1)"
if [ -n "$RPK" ]; then
  green "$(basename "$RPK") ($(wc -c < "$RPK" | tr -d ' ') octets)"
else
  todo "aucun .rpk dans dist/ — lancer : npm install && npm run build"
fi

step "2. La clé Bluetooth de la montre"
if command -v huami-token >/dev/null 2>&1; then
  green "huami-token est installé"
  info  "la récupérer avec : huami-token -m xiaomi -b"
  info  "puis garder la ligne dont la MAC est celle de la montre"
else
  todo "huami-token absent — installer : pip install huami-token"
  info  "puis : huami-token -m xiaomi -b   (compte Xiaomi, saisie masquée)"
fi
info "ne jamais dissocier la montre de l'iPhone : cela invalide la clé"

step "3. Le dongle Bluetooth USB"
if command -v system_profiler >/dev/null 2>&1; then
  if system_profiler SPUSBDataType 2>/dev/null | grep -qi "bluetooth"; then
    green "un périphérique USB Bluetooth est branché"
  else
    todo "aucun dongle Bluetooth USB détecté — en brancher un"
  fi
else
  todo "system_profiler indisponible (hors macOS) : impossible de vérifier le dongle"
fi

step "4. macOS doit laisser le dongle à Bumble"
if command -v nvram >/dev/null 2>&1; then
  behavior="$(nvram bluetoothHostControllerSwitchBehavior 2>/dev/null | awk '{print $2}')"
  if [ "$behavior" = "never" ]; then
    green "bluetoothHostControllerSwitchBehavior=never"
  else
    todo "macOS accapare encore le dongle avec sa propre pile Bluetooth"
    info  'corriger : sudo nvram bluetoothHostControllerSwitchBehavior="never"'
    info  "puis redémarrer le Mac"
  fi
else
  todo "nvram indisponible (hors macOS)"
fi

step "5. Bumble et libusb"
if python3 -c "import bumble" >/dev/null 2>&1; then
  green "le module Python bumble est disponible"
else
  todo "bumble absent — installer : pip install bumble"
fi
if [ -e /opt/homebrew/lib/libusb-1.0.dylib ] || [ -e /usr/local/lib/libusb-1.0.dylib ]; then
  green "libusb est présent"
else
  todo "libusb absent — installer : brew install libusb"
fi

step "6. L'émulateur Android"
if command -v adb >/dev/null 2>&1; then
  green "adb est dans le PATH"
  devices="$(adb devices 2>/dev/null | sed '1d' | grep -c 'device$' || true)"
  if [ "${devices:-0}" -gt 0 ]; then
    green "$devices appareil(s) connecté(s) à adb"
  else
    todo "aucun émulateur démarré — en lancer un, image API 33 ou plus"
  fi
else
  todo "adb absent — installer Android Studio, puis ajouter platform-tools au PATH"
fi

step "7. Gadgetbridge dans l'émulateur"
if command -v adb >/dev/null 2>&1 && adb shell pm list packages 2>/dev/null | grep -q freeyourgadget; then
  green "Gadgetbridge est installé dans l'émulateur"
else
  todo "installer l'APK Gadgetbridge depuis F-Droid : adb install Gadgetbridge.apk"
fi

printf '\n%d vérifié(s), %d à faire.\n' "$ok" "$todo"
if [ "$todo" -eq 0 ]; then
  cat <<'NEXT'

Tout est en place. Dernière ligne droite :

  1. Ouvrir le pont, dans un terminal à part :
       sudo python3 -m bumble.apps.hci_bridge \
            android-netsim:_:8554,mode=controller usb:0
  2. Dans Gadgetbridge : rechercher les appareils, appui long sur la montre,
     « Auth key », y coller la clé de l'étape 2.
  3. Se connecter, puis App Manager, puis installer le .rpk de dist/.
  4. Fermer Gadgetbridge et resynchroniser la montre avec Mi Fitness.
NEXT
fi
