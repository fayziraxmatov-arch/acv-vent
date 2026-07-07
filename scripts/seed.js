/**
 * Seed script — run once after setting up .env:
 *   npm run seed
 *
 * Creates (idempotently):
 *  1. The admin user  (from ADMIN_USERNAME / ADMIN_PASSWORD in .env)
 *  2. Default site settings (phones, address, work hours, stats)
 *  3. Six services in UZ / RU / EN
 *  4. Six sample gallery photos (only if the gallery is empty)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const Settings = require('../models/Settings');
const Service = require('../models/Service');
const GalleryItem = require('../models/GalleryItem');

const SERVICES = [
  {
    icon: 'fan', order: 1,
    title: {
      uz: 'Ventilyatsiya tizimlari',
      ru: 'Системы вентиляции',
      en: 'Ventilation systems'
    },
    description: {
      uz: "Ofis, ishlab chiqarish va savdo binolari uchun kirish-chiqish ventilyatsiyasini loyihalash va montaj qilish. Havo almashinuvi me'yorlar bo'yicha aniq hisoblanadi.",
      ru: 'Проектирование и монтаж приточно-вытяжной вентиляции для офисов, производств и торговых помещений. Воздухообмен рассчитывается точно по нормам.',
      en: 'Design and installation of supply-and-exhaust ventilation for offices, industrial and retail buildings. Air exchange is calculated precisely to code.'
    }
  },
  {
    icon: 'snowflake', order: 2,
    title: {
      uz: 'Konditsionerlash',
      ru: 'Кондиционирование',
      en: 'Air conditioning'
    },
    description: {
      uz: "Split, multi-split va VRF tizimlari — tanlashdan tortib ishga tushirishgacha. Har bir xona uchun quvvat alohida hisoblanadi.",
      ru: 'Сплит, мульти-сплит и VRF-системы — от подбора до пусконаладки. Мощность рассчитывается отдельно для каждого помещения.',
      en: 'Split, multi-split and VRF systems — from selection to commissioning. Capacity is calculated per room, not by guesswork.'
    }
  },
  {
    icon: 'thermometer', order: 3,
    title: {
      uz: 'Sovuq xonalar',
      ru: 'Холодильные камеры',
      en: 'Cold rooms'
    },
    description: {
      uz: "Oziq-ovqat, farmatsevtika va omborlar uchun sovuq xonalar qurilishi: sendvich-panellar, agregatlar, haroratni nazorat qilish.",
      ru: 'Строительство холодильных камер для продуктов, фармацевтики и складов: сэндвич-панели, агрегаты, контроль температуры.',
      en: 'Cold room construction for food, pharma and warehousing: sandwich panels, refrigeration units, temperature monitoring.'
    }
  },
  {
    icon: 'blueprint', order: 4,
    title: {
      uz: 'Loyihalash',
      ru: 'Проектирование',
      en: 'Engineering design'
    },
    description: {
      uz: "OVK bo'limi loyihalari: hisob-kitoblar, chizmalar, smeta va kelishuvlar. Loyiha montajga tayyor holda topshiriladi.",
      ru: 'Проекты раздела ОВиК: расчёты, чертежи, смета и согласования. Проект сдаётся готовым к монтажу.',
      en: 'Full HVAC design packages: calculations, drawings, budget and approvals. Delivered ready for installation.'
    }
  },
  {
    icon: 'duct', order: 5,
    title: {
      uz: 'Montaj ishlari',
      ru: 'Монтажные работы',
      en: 'Installation works'
    },
    description: {
      uz: "Havo kanallari, izolyatsiya, avtomatika va ishga tushirish — o'z brigadalarimiz bilan, subpudratsiz. Muddat va sifat shartnomada qayd etiladi.",
      ru: 'Воздуховоды, изоляция, автоматика и пусконаладка — своими бригадами, без субподряда. Сроки и качество фиксируются в договоре.',
      en: 'Ductwork, insulation, automation and commissioning — with our own crews, no subcontracting. Deadlines and quality fixed by contract.'
    }
  },
  {
    icon: 'wrench', order: 6,
    title: {
      uz: 'Servis va texnik xizmat',
      ru: 'Сервис и обслуживание',
      en: 'Service & maintenance'
    },
    description: {
      uz: "Rejali texnik ko'rik, filtrlarni almashtirish, freon bilan to'ldirish va ta'mirlash. Shartnoma bo'yicha 24 soat ichida javob beramiz.",
      ru: 'Плановое ТО, замена фильтров, заправка фреоном и ремонт. По договору отвечаем в течение 24 часов.',
      en: 'Scheduled maintenance, filter replacement, refrigerant charging and repairs. Contract clients get a response within 24 hours.'
    }
  }
];

const SAMPLES = [
  {
    imagePath: '/img/samples/sample-1.jpg', category: 'ventilation', order: 1, isSample: true,
    title: { uz: 'Ventkanallar tarmog\u02bbi (namuna)', ru: 'Сеть воздуховодов (образец)', en: 'Duct network (sample)' },
    description: {
      uz: 'Namuna rasm — admin-panel orqali o\u02bbz loyihangiz fotosuratlariga almashtiring.',
      ru: 'Образец — замените фотографиями своих объектов через админ-панель.',
      en: 'Placeholder image — replace with your own project photos via the admin panel.'
    }
  },
  {
    imagePath: '/img/samples/sample-2.jpg', category: 'ventilation', order: 2, isSample: true,
    title: { uz: 'Havo tayyorlash qurilmasi (namuna)', ru: 'Приточная установка (образец)', en: 'Air handling unit (sample)' },
    description: { uz: 'Namuna rasm.', ru: 'Образец.', en: 'Placeholder image.' }
  },
  {
    imagePath: '/img/samples/sample-3.jpg', category: 'coldroom', order: 3, isSample: true,
    title: { uz: 'Sovuq xona (namuna)', ru: 'Холодильная камера (образец)', en: 'Cold room (sample)' },
    description: { uz: 'Namuna rasm.', ru: 'Образец.', en: 'Placeholder image.' }
  },
  {
    imagePath: '/img/samples/sample-4.jpg', category: 'conditioning', order: 4, isSample: true,
    title: { uz: 'VRF tizimi sxemasi (namuna)', ru: 'Схема VRF-системы (образец)', en: 'VRF system layout (sample)' },
    description: { uz: 'Namuna rasm.', ru: 'Образец.', en: 'Placeholder image.' }
  },
  {
    imagePath: '/img/samples/sample-5.jpg', category: 'installation', order: 5, isSample: true,
    title: { uz: 'Havo taqsimoti rejasi (namuna)', ru: 'План воздухораспределения (образец)', en: 'Airflow plan (sample)' },
    description: { uz: 'Namuna rasm.', ru: 'Образец.', en: 'Placeholder image.' }
  },
  {
    imagePath: '/img/samples/sample-6.jpg', category: 'service', order: 6, isSample: true,
    title: { uz: 'Bosimni tekshirish (namuna)', ru: 'Проверка давления (образец)', en: 'Pressure check (sample)' },
    description: { uz: 'Namuna rasm.', ru: 'Образец.', en: 'Placeholder image.' }
  }
];

(async () => {
  await connectDB();

  // 1 — admin user
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!password || password.length < 8) {
    console.error('✗ Set ADMIN_PASSWORD in .env (at least 8 characters) before seeding.');
    process.exit(1);
  }
  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) {
    console.log(`• Admin "${username}" already exists — skipped.`);
  } else {
    const passwordHash = await Admin.hashPassword(password);
    await Admin.create({ username, passwordHash });
    console.log(`✓ Admin "${username}" created.`);
  }

  // 2 — settings singleton with sensible Tashkent defaults
  const s = await Settings.getMain();
  let touched = false;
  if (!s.phone) { s.phone = '+998 90 000 00 00'; touched = true; }
  if (!s.email) { s.email = 'info@acv.uz'; touched = true; }
  if (!s.address.uz) {
    s.address = {
      uz: "Toshkent sh., Yashnobod tumani, Boyqaro ko'chasi",
      ru: 'г. Ташкент, Яшнабадский район, ул. Байкаро',
      en: 'Tashkent, Yashnabad district, Boyqaro street'
    };
    touched = true;
  }
  if (!s.workHours.uz) {
    s.workHours = {
      uz: 'Du–Sha 9:00 – 18:00',
      ru: 'Пн–Сб 9:00 – 18:00',
      en: 'Mon–Sat 9:00 – 18:00'
    };
    touched = true;
  }
  if (touched) { await s.save(); console.log('✓ Default settings written.'); }
  else console.log('• Settings already filled — skipped.');

  // 3 — services
  const serviceCount = await Service.countDocuments();
  if (serviceCount === 0) {
    await Service.insertMany(SERVICES);
    console.log(`✓ ${SERVICES.length} services seeded.`);
  } else {
    console.log(`• ${serviceCount} services already exist — skipped.`);
  }

  // 4 — sample gallery
  const galleryCount = await GalleryItem.countDocuments();
  if (galleryCount === 0) {
    await GalleryItem.insertMany(SAMPLES);
    console.log(`✓ ${SAMPLES.length} sample gallery photos seeded (marked "sample").`);
  } else {
    console.log(`• Gallery already has ${galleryCount} items — skipped.`);
  }

  await mongoose.disconnect();
  console.log('\nDone. Start the site with:  npm run dev');
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
