const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
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
    // 'file'    → self-hosted video in /uploads/videos (+ optional poster image)
    // 'youtube' → embedded via youtube-nocookie, only the ID is stored
    type: { type: String, enum: ['file', 'youtube'], required: true },
    videoPath: { type: String, default: '' },
    posterPath: { type: String, default: '' },
    youtubeId: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

videoSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
