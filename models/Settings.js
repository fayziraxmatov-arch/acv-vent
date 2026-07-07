const mongoose = require('mongoose');

const ml = () => ({
  uz: { type: String, trim: true, default: '' },
  ru: { type: String, trim: true, default: '' },
  en: { type: String, trim: true, default: '' },
});

/**
 * Singleton document (key: 'main') holding everything shown in the header,
 * footer and contact page, plus the hero stats — all editable from the admin
 * panel so nothing is hard-coded in templates.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },

    phone: { type: String, trim: true, default: '+998 90 000 00 00' },
    phone2: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: 'info@acv.uz' },

    address: ml(),
    workHours: ml(),

    telegram: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    facebook: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },

    // src of a Google Maps <iframe> embed
    mapEmbed: { type: String, trim: true, default: '' },

    stats: {
      years: { type: Number, default: 8 },
      projects: { type: Number, default: 320 },
      area: { type: Number, default: 45000 }, // m² of serviced premises
      responseHours: { type: Number, default: 24 },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getMain = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) doc = await this.create({ key: 'main' });
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
