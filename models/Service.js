const mongoose = require('mongoose');

// Multilingual string: every piece of content exists in Uzbek, Russian and English.
const mlString = (required = false) => ({
  uz: { type: String, trim: true, required, default: '' },
  ru: { type: String, trim: true, default: '' },
  en: { type: String, trim: true, default: '' },
});

const serviceSchema = new mongoose.Schema(
  {
    title: mlString(true),
    description: mlString(),
    icon: {
      type: String,
      enum: ['fan', 'snowflake', 'thermometer', 'blueprint', 'wrench', 'shield', 'duct', 'building'],
      default: 'fan',
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('Service', serviceSchema);
