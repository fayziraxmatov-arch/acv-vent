const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const SUPPORTED = ['uz', 'ru', 'en'];
const DEFAULT_LANG = 'uz';

const dictionaries = {};
for (const code of SUPPORTED) {
  const file = path.join(LOCALES_DIR, `${code}.json`);
  dictionaries[code] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolve(dict, dottedKey) {
  return dottedKey.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

/**
 * Translate a dotted key ("nav.home") for the given language.
 * Falls back to the default language, then to the key itself,
 * so a missing translation never crashes a page.
 */
function t(lang, key) {
  const primary = resolve(dictionaries[lang] || {}, key);
  if (primary !== undefined) return primary;
  const fallback = resolve(dictionaries[DEFAULT_LANG], key);
  return fallback !== undefined ? fallback : key;
}

module.exports = { t, SUPPORTED, DEFAULT_LANG };
