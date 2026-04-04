const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [0, 0] },
    address: { type: String, default: '' }
  },
  licenseNumber: { type: String, default: '' },
  documentUrl: { type: String, default: null }

}, { timestamps: true });

hospitalSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
