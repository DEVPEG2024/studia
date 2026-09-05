/**
 * Acces aux capacites de la montre (vibration, ecran allume).
 * Tout est protege : sur un appareil ou la fonctionnalite manque,
 * l'appel echoue silencieusement au lieu de casser l'application.
 */
import vibrator from '@system.vibrator'
import brightness from '@system.brightness'

function safe(fn) {
  try {
    fn()
  } catch (e) {
    console.info('Padel : fonctionnalite indisponible - ' + e)
  }
}

export default {
  /** mode : 'short' (point marque) ou 'long' (jeu / set / match). */
  vibrate(mode) {
    safe(function () {
      vibrator.vibrate({ mode: mode === 'long' ? 'long' : 'short' })
    })
  },

  keepScreenOn(on) {
    safe(function () {
      brightness.setKeepScreenOn({ keepScreenOn: !!on })
    })
  }
}
