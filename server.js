require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/db');
const { locals } = require('./middleware/locals');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Make sure upload folders exist before multer needs them.
for (const dir of ['images', 'videos', 'posters']) {
  fs.mkdirSync(path.join(__dirname, 'public', 'uploads', dir), { recursive: true });
}

async function start() {
  await connectDB();

  // Behind nginx/Cloudflare in production → trust the first proxy for secure cookies & IPs.
  if (IS_PROD) app.set('trust proxy', 1);

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ── Security headers ───────────────────────────────────────────────
  // No inline <script> anywhere in the project → script-src stays 'self'.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://img.youtube.com', 'https://i.ytimg.com'],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://www.google.com'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // allow YouTube / Maps iframes
    })
  );

  app.use(compression());
  app.use(morgan(IS_PROD ? 'combined' : 'dev'));

  // Static assets (uploads live here too)
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: IS_PROD ? '7d' : 0 }));

  // Body parsing — multipart forms are handled by multer inside the routes.
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Sessions stored in the same MongoDB Atlas cluster ──────────────
  app.use(
    session({
      name: 'acv.sid',
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 * 24 * 14, // 14 days
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: IS_PROD,
        maxAge: 1000 * 60 * 60 * 24 * 14,
      },
    })
  );

  // Per-request template locals: t(), lang, settings, flash, …
  app.use(locals);

  // ── Routes ─────────────────────────────────────────────────────────
  app.use('/admin', adminRoutes);
  app.use('/', publicRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).render('public/404', { pageTitle: '404 — ACV', pageDesc: '' });
  });

  // 500
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).render('public/error', { pageTitle: 'Error — ACV', pageDesc: '' });
  });

  app.listen(PORT, () => {
    console.log(`✓ ACV site running → http://localhost:${PORT}`);
    console.log(`  Admin panel      → http://localhost:${PORT}/admin`);
  });
}

start();
