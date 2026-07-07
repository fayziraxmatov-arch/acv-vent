/* Renders every view with realistic mock data. Any EJS error = exit 1. */
const ejs = require('ejs');
const path = require('path');
const { t: rawT } = require('../utils/i18n');

const lang = 'uz';
const ML = (o) => (o ? (o[lang] || o.uz || '') : '');
const mockSettings = {
  phone: '+998 90 000 00 00', phone2: '+998 71 200 00 00', email: 'info@acv.uz',
  address: { uz: 'Toshkent', ru: 'Ташкент', en: 'Tashkent' },
  workHours: { uz: 'Du–Sha 9–18', ru: 'Пн–Сб 9–18', en: 'Mon–Sat 9–18' },
  telegram: 'https://t.me/acv', instagram: 'https://instagram.com/acv',
  facebook: '', youtube: '',
  mapEmbed: 'https://www.google.com/maps/embed?pb=test',
  stats: { years: 8, projects: 320, area: 45000, responseHours: 24 }
};

const base = {
  lang, langs: ['uz', 'ru', 'en'],
  t: (k) => rawT(lang, k),
  ml: ML,
  path: '/', currentUrl: '/',
  isActive: (p) => p === '/',
  settings: mockSettings,
  flash: { type: 'success', msg: 'Test flash' },
  year: 2026,
  pageTitle: null, pageDesc: null,
  csrf: 'test-csrf-token'
};

const svc = {
  _id: '665f00000000000000000001', icon: 'fan', order: 1, active: true,
  title: { uz: 'Ventilyatsiya', ru: 'Вентиляция', en: 'Ventilation' },
  description: { uz: 'Tavsif', ru: 'Описание', en: 'Description' }
};
const gal = {
  _id: '665f00000000000000000002', imagePath: '/img/samples/sample-1.jpg',
  category: 'ventilation', order: 1, isSample: true, createdAt: new Date(),
  title: { uz: 'Obyekt', ru: 'Объект', en: 'Project' },
  description: { uz: 'Izoh', ru: 'Комментарий', en: 'Note' }
};
const vidYt = {
  _id: '665f00000000000000000003', type: 'youtube', youtubeId: 'dQw4w9WgXcQ',
  videoPath: '', posterPath: '', order: 1, createdAt: new Date(),
  title: { uz: 'Video UZ', ru: 'Видео RU', en: 'Video EN' },
  description: { uz: 'Izoh', ru: '', en: '' }
};
const vidFile = { ...vidYt, _id: '665f00000000000000000004', type: 'file', youtubeId: '', videoPath: '/uploads/videos/x.mp4', posterPath: '/uploads/posters/x.jpg' };
const msg = {
  _id: '665f00000000000000000005', name: 'Aziz', phone: '+998 90 123 45 67',
  email: 'aziz@mail.uz', text: 'Salom, narx kerak', read: false, lang: 'uz', createdAt: new Date()
};

const categories = ['ventilation', 'conditioning', 'coldroom', 'installation', 'service', 'office'];
const icons = ['fan', 'snowflake', 'thermometer', 'blueprint', 'wrench', 'shield', 'duct', 'building'];

const cases = [
  ['public/home', { ...base, services: [svc, svc], gallery: [gal, gal, gal], videos: [vidYt, vidFile] }],
  ['public/home (empty)', { ...base, services: [], gallery: [], videos: [] }, 'public/home'],
  ['public/services', { ...base, services: [svc] }],
  ['public/gallery', { ...base, items: [gal, gal], categories, category: 'ventilation' }],
  ['public/gallery (all/empty)', { ...base, items: [], categories, category: null }, 'public/gallery'],
  ['public/videos', { ...base, videos: [vidYt, vidFile] }],
  ['public/about', base],
  ['public/contact', { ...base, formError: 'Test error', old: { name: 'A', phone: '+998', email: '', text: 'x' } }],
  ['public/contact (clean)', { ...base, formError: null, old: {} }, 'public/contact'],
  ['public/404', base],
  ['public/error', base],
  ['admin/login', { ...base, error: 'Wrong password' }],
  ['admin/dashboard', { ...base, active: 'dashboard', galleryCount: 6, videoCount: 2, serviceCount: 6, unreadCount: 1, latestMessages: [msg], latestGallery: [gal, gal] }],
  ['admin/dashboard (empty)', { ...base, active: 'dashboard', galleryCount: 0, videoCount: 0, serviceCount: 0, unreadCount: 0, latestMessages: [], latestGallery: [] }, 'admin/dashboard'],
  ['admin/gallery-list', { ...base, active: 'gallery', items: [gal], categories, category: null }],
  ['admin/gallery-form (new)', { ...base, active: 'gallery', item: null, categories }, 'admin/gallery-form'],
  ['admin/gallery-form (edit)', { ...base, active: 'gallery', item: gal, categories }, 'admin/gallery-form'],
  ['admin/video-list', { ...base, active: 'videos', videos: [vidYt, vidFile] }],
  ['admin/video-form (new)', { ...base, active: 'videos', video: null }, 'admin/video-form'],
  ['admin/video-form (edit yt)', { ...base, active: 'videos', video: vidYt }, 'admin/video-form'],
  ['admin/video-form (edit file)', { ...base, active: 'videos', video: vidFile }, 'admin/video-form'],
  ['admin/service-list', { ...base, active: 'services', services: [svc] }],
  ['admin/service-form (new)', { ...base, active: 'services', service: null, icons }, 'admin/service-form'],
  ['admin/service-form (edit)', { ...base, active: 'services', service: svc, icons }, 'admin/service-form'],
  ['admin/messages', { ...base, active: 'messages', messages: [msg, { ...msg, read: true, text: '', email: '' }], filter: null }],
  ['admin/settings', { ...base, active: 'settings', s: mockSettings }]
];

const viewsDir = path.join(__dirname, '..', 'views');
let failed = 0;

(async () => {
  for (const [label, locals, fileOverride] of cases) {
    const file = path.join(viewsDir, (fileOverride || label) + '.ejs');
    try {
      const html = await ejs.renderFile(file, locals, { views: [viewsDir] });
      if (!html || html.length < 200) throw new Error('suspiciously short output');
      console.log(`✓ ${label}  (${html.length} chars)`);
    } catch (err) {
      failed++;
      const lines = err.message.trim().split('\n');
      console.error(`✗ ${label}\n   ${lines[lines.length - 1]}`);
    }
  }
  console.log(failed ? `\n${failed} view(s) FAILED` : '\nAll views render cleanly.');
  process.exit(failed ? 1 : 0);
})();
