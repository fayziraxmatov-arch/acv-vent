const { t, SUPPORTED, DEFAULT_LANG } = require('../utils/i18n');
const { ml } = require('../utils/helpers');
const Settings = require('../models/Settings');

// Settings are read on almost every request → cache for 60 s.
let settingsCache = null;
let settingsCachedAt = 0;
const SETTINGS_TTL = 60 * 1000;

async function getSettings(force = false) {
  const now = Date.now();
  if (!force && settingsCache && now - settingsCachedAt < SETTINGS_TTL) return settingsCache;
  settingsCache = await Settings.getMain();
  settingsCachedAt = now;
  return settingsCache;
}

function invalidateSettingsCache() {
  settingsCachedAt = 0;
}

/** Everything EJS templates need on every page. */
async function locals(req, res, next) {
  try {
    // Language: session choice → default (Uzbek)
    const lang = SUPPORTED.includes(req.session?.lang) ? req.session.lang : DEFAULT_LANG;

    res.locals.lang = lang;
    res.locals.langs = SUPPORTED;
    res.locals.t = (key) => t(lang, key);
    res.locals.ml = (field) => ml(field, lang);
    res.locals.path = req.path;
    res.locals.currentUrl = req.originalUrl || req.path;
    res.locals.isActive = (p) => (p === '/' ? req.path === '/' : req.path.startsWith(p));
    res.locals.year = new Date().getFullYear();

    // One-shot flash message (set by any handler, shown once)
    res.locals.flash = req.session?.flash || null;
    if (req.session?.flash) delete req.session.flash;

    res.locals.settings = await getSettings();
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { locals, invalidateSettingsCache };
