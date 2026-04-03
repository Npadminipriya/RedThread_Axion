const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  units: { type: Number, required: true, min: 1 },
  urgency: { type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' },
  location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [0, 0] },
    address: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['pending', 'matching', 'matched', 'fulfilled', 'escalated', 'cancelled'],
    default: 'pending'
  },
  matchedDonors: [{
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'called', 'accepted', 'rejected', 'no_response'], default: 'pending' },
    calledAt: Date,
    respondedAt: Date,
    callSid: String,
  }],
  matchedBloodBanks: [{
    bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'called', 'accepted', 'rejected', 'no_response'], default: 'pending' },
    unitsAvailable: Number,
    calledAt: Date,
    respondedAt: Date,
    callSid: String,
  }],
  fulfilledBy: {
    type: { type: String, enum: ['donor', 'bloodbank'], default: null },
    id: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  blockchainHash: { type: String, default: null },
  escalatedToBloodBanks: { type: Boolean, default: false },
  notes: { type: String, default: '' },
}, { timestamps: true });

requestSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('Request', requestSchema);
