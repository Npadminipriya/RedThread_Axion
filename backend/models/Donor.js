const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    address: { type: String, default: '' }
  },
  availability: { type: Boolean, default: true },
  coins: { type: Number, default: 0 },
  donationCount: { type: Number, default: 0 },
  lastDonationDate: { type: Date, default: null },
  cooldownUntil: { type: Date, default: null },
  badges: [{ type: String }],
  blockchainRecords: [{
    hash: String,
    donationDate: Date,
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    verified: { type: Boolean, default: true }
  }]
}, { timestamps: true });

donorSchema.index({ 'location': '2dsphere' });

// Check if donor is in cooldown
donorSchema.methods.isInCooldown = function () {
  if (!this.cooldownUntil) return false;
  return new Date() < this.cooldownUntil;
};

// Check if blood group is rare
donorSchema.methods.isRareBloodGroup = function () {
  return ['AB-', 'B-', 'A-', 'O-'].includes(this.bloodGroup);
};

module.exports = mongoose.model('Donor', donorSchema);
