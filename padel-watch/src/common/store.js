/**
 * Persistance locale : reglages + match en cours.
 * Rien ne sort de la montre, tout passe par @system.storage.
 */
import storage from '@system.storage'

const KEY_SETTINGS = 'padel.settings.v1'
const KEY_MATCH = 'padel.match.v1'
const KEY_RESET = 'padel.reset.v1'

const DEFAULT_SETTINGS = {
  goldenPoint: false,
  superTieBreak: false,
  setsToWin: 2,
  vibration: true,
  keepScreenOn: true
}

function read(key, callback) {
  try {
    storage.get({
      key: key,
      default: '',
      success: function (value) {
        callback(value || '')
      },
      fail: function () {
        callback('')
      }
    })
  } catch (e) {
    callback('')
  }
}

function write(key, value) {
  try {
    storage.set({ key: key, value: value })
  } catch (e) {
    console.info('Padel : ecriture impossible - ' + e)
  }
}

function remove(key) {
  try {
    storage.delete({ key: key })
  } catch (e) {
    write(key, '')
  }
}

export default {
  DEFAULT_SETTINGS: DEFAULT_SETTINGS,

  loadSettings(callback) {
    read(KEY_SETTINGS, function (raw) {
      const settings = {}
      for (const k in DEFAULT_SETTINGS) settings[k] = DEFAULT_SETTINGS[k]
      if (raw) {
        try {
          const saved = JSON.parse(raw)
          for (const k in DEFAULT_SETTINGS) {
            if (saved[k] !== undefined && saved[k] !== null) settings[k] = saved[k]
          }
        } catch (e) {
          console.info('Padel : reglages illisibles, retour aux valeurs par defaut')
        }
      }
      callback(settings)
    })
  },

  saveSettings(settings) {
    write(KEY_SETTINGS, JSON.stringify(settings))
  },

  loadMatch(callback) {
    read(KEY_MATCH, callback)
  },

  saveMatch(serialized) {
    write(KEY_MATCH, serialized)
  },

  clearMatch() {
    remove(KEY_MATCH)
  },

  /** Pose par la page Reglages pour demander un nouveau match a l'ecran principal. */
  requestReset() {
    write(KEY_RESET, '1')
  },

  /** Lit puis efface le drapeau de redemarrage. */
  takeReset(callback) {
    read(KEY_RESET, function (value) {
      if (value) remove(KEY_RESET)
      callback(!!value)
    })
  }
}
