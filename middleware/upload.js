const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '..', 'public', 'uploads');

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const VIDEO_TYPES = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function makeStorage(subdir, extMap) {
  return multer.diskStorage({
    destination: path.join(UPLOADS_ROOT, subdir),
    filename(req, file, cb) {
      // Never trust the original filename — generate our own.
      const ext = extMap[file.mimetype] || path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  });
}

function typeFilter(extMap, label) {
  return (req, file, cb) => {
    if (extMap[file.mimetype]) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `${label}: ${file.mimetype}`));
  };
}

// Gallery images (and video posters): jpeg / png / webp, up to 10 MB
const imageUpload = multer({
  storage: makeStorage('images', IMAGE_TYPES),
  fileFilter: typeFilter(IMAGE_TYPES, 'Only JPG, PNG or WebP images are allowed'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Poster images go to their own folder
const posterUpload = multer({
  storage: makeStorage('posters', IMAGE_TYPES),
  fileFilter: typeFilter(IMAGE_TYPES, 'Only JPG, PNG or WebP images are allowed'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Self-hosted videos: mp4 / webm / mov, up to 300 MB
const videoUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const isPoster = file.fieldname === 'poster';
      cb(null, path.join(UPLOADS_ROOT, isPoster ? 'posters' : 'videos'));
    },
    filename(req, file, cb) {
      const map = file.fieldname === 'poster' ? IMAGE_TYPES : VIDEO_TYPES;
      const ext = map[file.mimetype] || path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  fileFilter(req, file, cb) {
    const map = file.fieldname === 'poster' ? IMAGE_TYPES : VIDEO_TYPES;
    if (map[file.mimetype]) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE',
      file.fieldname === 'poster' ? 'Poster must be JPG, PNG or WebP' : 'Only MP4, WebM or MOV videos are allowed'));
  },
  limits: { fileSize: 300 * 1024 * 1024 },
});

/** Turn multer errors into a flash message instead of a crash page. */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large (images ≤ 10 MB, videos ≤ 300 MB).'
        : err.field || err.message;
    req.session.flash = { type: 'error', msg };
    return res.redirect(req.get('Referrer') || '/admin');
  }
  next(err);
}

module.exports = { imageUpload, posterUpload, videoUpload, handleUploadError };
