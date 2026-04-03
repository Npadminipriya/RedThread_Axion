const mongoose = require('mongoose');

const bloodBankSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [0, 0] },
    address: { type: String, default: '' }
  },
  licenseNumber: { type: String, default: '' },
  inventory: [{
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true
    },
    units: { type: Number, default: 0, min: 0 }
  }]
}, { timestamps: true });

bloodBankSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('BloodBank', bloodBankSchema);
