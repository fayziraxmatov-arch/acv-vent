const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Admin = require('../models/Admin');
const Service = require('../models/Service');
const GalleryItem = require('../models/GalleryItem');
const Video = require('../models/Video');
const Message = require('../models/Message');
const Settings = require('../models/Settings');

const { requireAuth, csrfToken, verifyCsrf } = require('../middleware/auth');
const { imageUpload, videoUpload, handleUploadError } = require('../middleware/upload');
const { invalidateSettingsCache } = require('../middleware/locals');
const { extractYoutubeId, deleteUpload, mlFromBody } = require('../utils/helpers');

const GALLERY_CATEGORIES = ['ventilation', 'conditioning', 'coldroom', 'installation', 'service', 'office'];
const SERVICE_ICONS = ['fan', 'snowflake', 'thermometer', 'blueprint', 'wrench', 'shield', 'duct', 'building'];

function flash(req, type, msg) {
  req.session.flash = { type, msg };
}

// ── Login / logout ───────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Try again in 15 minutes.',
});

router.get('/acvvent', csrfToken, (req, res) => {
  if (req.session.adminId) return res.redirect('/acvvent');
  res.render('acvvent/login', { error: null });
});

router.post('/acvvent', loginLimiter, csrfToken, async (req, res, next) => {
  try {
    const { username = '', password = '' } = req.body;
    const admin = await Admin.findOne({ username: String(username).trim().toLowerCase() });
    const ok = admin && (await admin.comparePassword(String(password)));
    if (!ok) {
      return res.status(401).render('acvvent/login', { error: 'Wrong username or password.' });
    }
    // Prevent session fixation: new session after privilege change.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = admin._id.toString();
      req.session.adminName = admin.username;
      res.redirect('/acvvent');
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/acvvent/login'));
});

// Everything below requires a logged-in admin + CSRF token available in views.
router.use(requireAuth, csrfToken);

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [galleryCount, videoCount, serviceCount, unreadCount, latestMessages, latestGallery] =
      await Promise.all([
        GalleryItem.countDocuments(),
        Video.countDocuments(),
        Service.countDocuments(),
        Message.countDocuments({ read: false }),
        Message.find().sort({ createdAt: -1 }).limit(5).lean(),
        GalleryItem.find().sort({ createdAt: -1 }).limit(6).lean(),
      ]);
    res.render('acvvent/dashboard', {
      active: 'dashboard',
      galleryCount,
      videoCount,
      serviceCount,
      unreadCount,
      latestMessages,
      latestGallery,
    });
  } catch (err) {
    next(err);
  }
});

// ── Gallery CRUD ─────────────────────────────────────────────────────
router.get('/gallery', async (req, res, next) => {
  try {
    const category = GALLERY_CATEGORIES.includes(req.query.category) ? req.query.category : null;
    const items = await GalleryItem.find(category ? { category } : {})
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.render('acvvent/gallery-list', { active: 'gallery', items, category, categories: GALLERY_CATEGORIES });
  } catch (err) {
    next(err);
  }
});

router.get('/gallery/new', (req, res) => {
  res.render('acvvent/gallery-form', { active: 'gallery', item: null, categories: GALLERY_CATEGORIES });
});

router.post('/gallery', imageUpload.single('image'), verifyCsrf, async (req, res, next) => {
  try {
    if (!req.file) {
      flash(req, 'error', 'Please choose an image file.');
      return res.redirect('/acvvent/gallery/new');
    }
    if (!(req.body.title_uz || '').trim()) {
      await deleteUpload(`/uploads/images/${req.file.filename}`);
      flash(req, 'error', 'Title (UZ) is required.');
      return res.redirect('/acvvent/gallery/new');
    }
    await GalleryItem.create({
      title: mlFromBody(req.body, 'title'),
      description: mlFromBody(req.body, 'description'),
      category: GALLERY_CATEGORIES.includes(req.body.category) ? req.body.category : 'ventilation',
      order: Number(req.body.order) || 0,
      imagePath: `/uploads/images/${req.file.filename}`,
    });
    flash(req, 'success', 'Photo added to the gallery.');
    res.redirect('/acvvent/gallery');
  } catch (err) {
    next(err);
  }
});

router.get('/gallery/:id/edit', async (req, res, next) => {
  try {
    const item = await GalleryItem.findById(req.params.id).lean();
    if (!item) return res.redirect('/acvvent/gallery');
    res.render('acvvent/gallery-form', { active: 'gallery', item, categories: GALLERY_CATEGORIES });
  } catch (err) {
    next(err);
  }
});

router.post('/gallery/:id', imageUpload.single('image'), verifyCsrf, async (req, res, next) => {
  try {
    const item = await GalleryItem.findById(req.params.id);
    if (!item) return res.redirect('/acvvent/gallery');

    item.title = mlFromBody(req.body, 'title');
    item.description = mlFromBody(req.body, 'description');
    if (GALLERY_CATEGORIES.includes(req.body.category)) item.category = req.body.category;
    item.order = Number(req.body.order) || 0;

    if (req.file) {
      await deleteUpload(item.imagePath); // replace: remove the old file from disk
      item.imagePath = `/uploads/images/${req.file.filename}`;
      item.isSample = false;
    }
    await item.save();
    flash(req, 'success', 'Photo updated.');
    res.redirect('/acvvent/gallery');
  } catch (err) {
    next(err);
  }
});

router.post('/gallery/:id/delete', verifyCsrf, async (req, res, next) => {
  try {
    const item = await GalleryItem.findByIdAndDelete(req.params.id);
    if (item && !item.isSample) await deleteUpload(item.imagePath);
    if (item && item.isSample && item.imagePath.startsWith('/uploads/')) await deleteUpload(item.imagePath);
    flash(req, 'success', 'Photo deleted.');
    res.redirect('/acvvent/gallery');
  } catch (err) {
    next(err);
  }
});

// ── Videos CRUD ──────────────────────────────────────────────────────
const videoFields = videoUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'poster', maxCount: 1 },
]);

router.get('/videos', async (req, res, next) => {
  try {
    const videos = await Video.find().sort({ order: 1, createdAt: -1 }).lean();
    res.render('acvvent/video-list', { active: 'videos', videos });
  } catch (err) {
    next(err);
  }
});

router.get('/videos/new', (req, res) => {
  res.render('acvvent/video-form', { active: 'videos', video: null });
});

router.post('/videos', videoFields, verifyCsrf, async (req, res, next) => {
  try {
    const type = req.body.type === 'youtube' ? 'youtube' : 'file';
    const doc = {
      title: mlFromBody(req.body, 'title'),
      description: mlFromBody(req.body, 'description'),
      type,
      order: Number(req.body.order) || 0,
    };

    if (!doc.title.uz) {
      flash(req, 'error', 'Title (UZ) is required.');
      return res.redirect('/acvvent/videos/new');
    }

    if (type === 'youtube') {
      const id = extractYoutubeId(req.body.youtubeUrl);
      if (!id) {
        flash(req, 'error', 'Could not read a YouTube link. Paste a full video URL.');
        return res.redirect('/acvvent/videos/new');
      }
      doc.youtubeId = id;
    } else {
      const file = req.files?.video?.[0];
      if (!file) {
        flash(req, 'error', 'Please choose a video file (MP4, WebM or MOV).');
        return res.redirect('/acvvent/videos/new');
      }
      doc.videoPath = `/uploads/videos/${file.filename}`;
      const poster = req.files?.poster?.[0];
      if (poster) doc.posterPath = `/uploads/posters/${poster.filename}`;
    }

    await Video.create(doc);
    flash(req, 'success', 'Video added.');
    res.redirect('/acvvent/videos');
  } catch (err) {
    next(err);
  }
});

router.get('/videos/:id/edit', async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).lean();
    if (!video) return res.redirect('/acvvent/videos');
    res.render('acvvent/video-form', { active: 'videos', video });
  } catch (err) {
    next(err);
  }
});

router.post('/videos/:id', videoFields, verifyCsrf, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.redirect('/acvvent/videos');

    video.title = mlFromBody(req.body, 'title');
    video.description = mlFromBody(req.body, 'description');
    video.order = Number(req.body.order) || 0;

    const newType = req.body.type === 'youtube' ? 'youtube' : 'file';

    if (newType === 'youtube') {
      const id = extractYoutubeId(req.body.youtubeUrl);
      if (id) {
        // Switching to (or updating) YouTube: drop any stored files.
        if (video.videoPath) await deleteUpload(video.videoPath);
        if (video.posterPath) await deleteUpload(video.posterPath);
        video.videoPath = '';
        video.posterPath = '';
        video.youtubeId = id;
        video.type = 'youtube';
      } else if (video.type !== 'youtube') {
        flash(req, 'error', 'Could not read a YouTube link — the video was not changed.');
        return res.redirect(`/acvvent/videos/${video._id}/edit`);
      }
    } else {
      const file = req.files?.video?.[0];
      if (file) {
        if (video.videoPath) await deleteUpload(video.videoPath);
        video.videoPath = `/uploads/videos/${file.filename}`;
        video.youtubeId = '';
        video.type = 'file';
      }
      const poster = req.files?.poster?.[0];
      if (poster) {
        if (video.posterPath) await deleteUpload(video.posterPath);
        video.posterPath = `/uploads/posters/${poster.filename}`;
      }
      if (video.type !== 'file' && !file) {
        flash(req, 'error', 'To switch this video to an uploaded file, choose a file first.');
        return res.redirect(`/acvvent/videos/${video._id}/edit`);
      }
    }

    await video.save();
    flash(req, 'success', 'Video updated.');
    res.redirect('/acvvent/videos');
  } catch (err) {
    next(err);
  }
});

router.post('/videos/:id/delete', verifyCsrf, async (req, res, next) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (video) {
      if (video.videoPath) await deleteUpload(video.videoPath);
      if (video.posterPath) await deleteUpload(video.posterPath);
    }
    flash(req, 'success', 'Video deleted.');
    res.redirect('/acvvent/videos');
  } catch (err) {
    next(err);
  }
});

// ── Services CRUD ────────────────────────────────────────────────────
router.get('/services', async (req, res, next) => {
  try {
    const services = await Service.find().sort({ order: 1, createdAt: -1 }).lean();
    res.render('acvvent/service-list', { active: 'services', services });
  } catch (err) {
    next(err);
  }
});

router.get('/services/new', (req, res) => {
  res.render('acvvent/service-form', { active: 'services', service: null, icons: SERVICE_ICONS });
});

router.post('/services', express.urlencoded({ extended: true }), verifyCsrf, async (req, res, next) => {
  try {
    const title = mlFromBody(req.body, 'title');
    if (!title.uz) {
      flash(req, 'error', 'Title (UZ) is required.');
      return res.redirect('/acvvent/services/new');
    }
    await Service.create({
      title,
      description: mlFromBody(req.body, 'description'),
      icon: SERVICE_ICONS.includes(req.body.icon) ? req.body.icon : 'fan',
      order: Number(req.body.order) || 0,
      active: req.body.active === 'on',
    });
    flash(req, 'success', 'Service created.');
    res.redirect('/acvvent/services');
  } catch (err) {
    next(err);
  }
});

router.get('/services/:id/edit', async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).lean();
    if (!service) return res.redirect('/acvvent/services');
    res.render('acvvent/service-form', { active: 'services', service, icons: SERVICE_ICONS });
  } catch (err) {
    next(err);
  }
});

router.post('/services/:id', express.urlencoded({ extended: true }), verifyCsrf, async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.redirect('/acvvent/services');
    service.title = mlFromBody(req.body, 'title');
    service.description = mlFromBody(req.body, 'description');
    if (SERVICE_ICONS.includes(req.body.icon)) service.icon = req.body.icon;
    service.order = Number(req.body.order) || 0;
    service.active = req.body.active === 'on';
    await service.save();
    flash(req, 'success', 'Service updated.');
    res.redirect('/acvvent/services');
  } catch (err) {
    next(err);
  }
});

router.post('/services/:id/delete', verifyCsrf, async (req, res, next) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    flash(req, 'success', 'Service deleted.');
    res.redirect('/acvvent/services');
  } catch (err) {
    next(err);
  }
});

// ── Messages ─────────────────────────────────────────────────────────
router.get('/messages', async (req, res, next) => {
  try {
    const filter = req.query.filter === 'unread' ? { read: false } : {};
    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.render('acvvent/messages', { active: 'messages', messages, filter: req.query.filter || 'all' });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/:id/toggle', verifyCsrf, async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (msg) {
      msg.read = !msg.read;
      await msg.save();
    }
    res.redirect('/acvvent/messages');
  } catch (err) {
    next(err);
  }
});

router.post('/messages/:id/delete', verifyCsrf, async (req, res, next) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    flash(req, 'success', 'Message deleted.');
    res.redirect('/acvvent/messages');
  } catch (err) {
    next(err);
  }
});

// ── Settings + password ──────────────────────────────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await Settings.getMain();
    res.render('acvvent/settings', { active: 'settings', s: settings });
  } catch (err) {
    next(err);
  }
});

router.post('/settings', express.urlencoded({ extended: true }), verifyCsrf, async (req, res, next) => {
  try {
    const s = await Settings.getMain();
    const b = req.body;

    s.phone = (b.phone || '').trim();
    s.phone2 = (b.phone2 || '').trim();
    s.email = (b.email || '').trim();
    s.address = mlFromBody(b, 'address');
    s.workHours = mlFromBody(b, 'workHours');
    s.telegram = (b.telegram || '').trim();
    s.instagram = (b.instagram || '').trim();
    s.facebook = (b.facebook || '').trim();
    s.youtube = (b.youtube || '').trim();
    s.mapEmbed = (b.mapEmbed || '').trim();
    s.stats = {
      years: Number(b.stat_years) || 0,
      projects: Number(b.stat_projects) || 0,
      area: Number(b.stat_area) || 0,
      responseHours: Number(b.stat_response) || 0,
    };

    await s.save();
    invalidateSettingsCache();
    flash(req, 'success', 'Settings saved.');
    res.redirect('/acvvent/settings');
  } catch (err) {
    next(err);
  }
});

router.post('/password', express.urlencoded({ extended: true }), verifyCsrf, async (req, res, next) => {
  try {
    const { current = '', password = '', confirm = '' } = req.body;
    const admin = await Admin.findById(req.session.adminId);
    if (!admin || !(await admin.comparePassword(current))) {
      flash(req, 'error', 'Current password is wrong.');
      return res.redirect('/acvvent/settings');
    }
    if (password.length < 8) {
      flash(req, 'error', 'New password must be at least 8 characters.');
      return res.redirect('/acvvent/settings');
    }
    if (password !== confirm) {
      flash(req, 'error', 'New password and confirmation do not match.');
      return res.redirect('/acvvent/settings');
    }
    admin.passwordHash = await Admin.hashPassword(password);
    await admin.save();
    flash(req, 'success', 'Password changed.');
    res.redirect('/acvvent/settings');
  } catch (err) {
    next(err);
  }
});

// Multer errors (size/type) → flash instead of crash
router.use(handleUploadError);

module.exports = router;
