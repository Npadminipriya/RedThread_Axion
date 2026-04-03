const mongoose = require('mongoose');

const coinTransactionSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  type: { type: String, enum: ['earned', 'penalty', 'bonus'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', default: null },
}, { timestamps: true });

module.exports = mongoose.model('CoinTransaction', coinTransactionSchema);
