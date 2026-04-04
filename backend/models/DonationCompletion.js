const mongoose = require('mongoose');

const donationCompletionSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  confirmedByHospital: { type: Boolean, default: false },
  donorShowedUp: { type: Boolean, default: null }, // null = not yet confirmed, true = showed up, false = no-show
  completedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });

donationCompletionSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
donationCompletionSchema.index({ donorId: 1 });

module.exports = mongoose.model('DonationCompletion', donationCompletionSchema);
