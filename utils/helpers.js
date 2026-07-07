const fs = require('fs/promises');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** Extract a YouTube video ID from any common URL form (or accept a bare ID). */
function extractYoutubeId(input = '') {
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * Delete an uploaded file given its public path (e.g. /uploads/images/x.jpg).
 * Silently ignores missing files; refuses anything outside /public/uploads.
 */
async function deleteUpload(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const abs = path.join(PUBLIC_DIR, path.normalize(publicPath));
  if (!abs.startsWith(path.join(PUBLIC_DIR, 'uploads'))) return; // path traversal guard
  try {
    await fs.unlink(abs);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('deleteUpload:', err.message);
  }
}

/** Pick the best available translation of a multilingual field for a language. */
function ml(field, lang) {
  if (!field) return '';
  return field[lang] || field.uz || field.ru || field.en || '';
}

/** Read multilingual inputs from a form body: title_uz, title_ru, title_en → {uz,ru,en}. */
function mlFromBody(body, base) {
  return {
    uz: (body[`${base}_uz`] || '').trim(),
    ru: (body[`${base}_ru`] || '').trim(),
    en: (body[`${base}_en`] || '').trim(),
  };
}

module.exports = { extractYoutubeId, deleteUpload, ml, mlFromBody };
