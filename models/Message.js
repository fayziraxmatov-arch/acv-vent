const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 120 },
    phone: { type: String, trim: true, required: true, maxlength: 40 },
    email: { type: String, trim: true, default: '', maxlength: 160 },
    text: { type: String, trim: true, required: true, maxlength: 3000 },
    read: { type: Boolean, default: false, index: true },
    lang: { type: String, default: 'uz' }, // interface language the visitor used
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
