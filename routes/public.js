const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Service = require('../models/Service');
const GalleryItem = require('../models/GalleryItem');
const Video = require('../models/Video');
const Message = require('../models/Message');
const { SUPPORTED } = require('../utils/i18n');

const GALLERY_CATEGORIES = ['ventilation', 'conditioning', 'coldroom', 'installation', 'service', 'office'];

// ── Language switch ──────────────────────────────────────────────────
router.get('/lang/:code', (req, res) => {
  const { code } = req.params;
  if (SUPPORTED.includes(code)) req.session.lang = code;
  const back = typeof req.query.back === 'string' && req.query.back.startsWith('/') ? req.query.back : '/';
  res.redirect(back);
});

// ── Home ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const [services, gallery, videos] = await Promise.all([
      Service.find({ active: true }).sort({ order: 1, createdAt: -1 }).limit(6).lean(),
      GalleryItem.find().sort({ order: 1, createdAt: -1 }).limit(8).lean(),
      Video.find().sort({ order: 1, createdAt: -1 }).limit(3).lean(),
    ]);
    res.render('public/home', {
      services,
      gallery,
      videos,
      pageTitle: res.locals.t('meta.homeTitle'),
      pageDesc: res.locals.t('meta.homeDesc'),
    });
  } catch (err) {
    next(err);
  }
});

// ── Services ─────────────────────────────────────────────────────────
router.get('/services', async (req, res, next) => {
  try {
    const services = await Service.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.render('public/services', {
      services,
      pageTitle: `${res.locals.t('services.pageTitle')} — ACV`,
      pageDesc: res.locals.t('services.lead'),
    });
  } catch (err) {
    next(err);
  }
});

// ── Gallery (with server-side category filter) ───────────────────────
router.get('/gallery', async (req, res, next) => {
  try {
    const category = GALLERY_CATEGORIES.includes(req.query.category) ? req.query.category : null;
    const filter = category ? { category } : {};
    const items = await GalleryItem.find(filter).sort({ order: 1, createdAt: -1 }).lean();
    res.render('public/gallery', {
      items,
      category,
      categories: GALLERY_CATEGORIES,
      pageTitle: `${res.locals.t('gallery.pageTitle')} — ACV`,
      pageDesc: res.locals.t('gallery.lead'),
    });
  } catch (err) {
    next(err);
  }
});

// ── Videos ───────────────────────────────────────────────────────────
router.get('/videos', async (req, res, next) => {
  try {
    const videos = await Video.find().sort({ order: 1, createdAt: -1 }).lean();
    res.render('public/videos', {
      videos,
      pageTitle: `${res.locals.t('videos.pageTitle')} — ACV`,
      pageDesc: res.locals.t('videos.lead'),
    });
  } catch (err) {
    next(err);
  }
});

// ── About ────────────────────────────────────────────────────────────
router.get('/about', (req, res) => {
  res.render('public/about', {
    pageTitle: `${res.locals.t('about.pageTitle')} — ACV`,
    pageDesc: res.locals.t('about.lead'),
  });
});

// ── Contact ──────────────────────────────────────────────────────────
router.get('/contact', (req, res) => {
  res.render('public/contact', {
    pageTitle: `${res.locals.t('contact.pageTitle')} — ACV`,
    pageDesc: res.locals.t('contact.lead'),
    formError: null,
    old: {},
  });
});

// 20 submissions per 15 min per IP — stops basic form spam floods.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/contact', contactLimiter, async (req, res, next) => {
  try {
    const { name = '', phone = '', email = '', message = '', website = '' } = req.body;

    // Honeypot: real visitors never see or fill this field.
    if (website.trim() !== '') return res.redirect('/contact');

    const clean = {
      name: String(name).trim().slice(0, 120),
      phone: String(phone).trim().slice(0, 40),
      email: String(email).trim().slice(0, 160),
      text: String(message).trim().slice(0, 3000),
    };

    if (!clean.name || !clean.phone || !clean.text) {
      return res.status(422).render('public/contact', {
        pageTitle: `${res.locals.t('contact.pageTitle')} — ACV`,
        pageDesc: res.locals.t('contact.lead'),
        formError: res.locals.t('contact.errRequired'),
        old: clean,
      });
    }

    await Message.create({ ...clean, lang: res.locals.lang });
    req.session.flash = { type: 'success', msg: res.locals.t('contact.success') };
    res.redirect('/contact');
  } catch (err) {
    next(err);
  }
});

// Short request form on the home page (name + phone only)
router.post('/quick-request', contactLimiter, async (req, res, next) => {
  try {
    const { name = '', phone = '', website = '' } = req.body;
    if (website.trim() !== '') return res.redirect('/');
    const clean = {
      name: String(name).trim().slice(0, 120),
      phone: String(phone).trim().slice(0, 40),
      text: '— quick request from the home page —',
    };
    if (clean.name && clean.phone) {
      await Message.create({ ...clean, lang: res.locals.lang });
      req.session.flash = { type: 'success', msg: res.locals.t('contact.success') };
    }
    res.redirect('/#request');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
