const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema(
  {
    title: {
      uz: { type: String, trim: true, required: true },
      ru: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    description: {
      uz: { type: String, trim: true, default: '' },
      ru: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    category: {
      type: String,
      enum: ['ventilation', 'conditioning', 'coldroom', 'installation', 'service', 'office'],
      default: 'ventilation',
      index: true,
    },
    // Path relative to /public, e.g. /uploads/images/xxxx.jpg
    imagePath: { type: String, required: true },
    order: { type: Number, default: 0 },
    isSample: { type: Boolean, default: false }, // seeded demo images, easy to bulk-remove
  },
  { timestamps: true }
);

galleryItemSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('GalleryItem', galleryItemSchema);
