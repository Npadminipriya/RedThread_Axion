const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: 'Transport/commute expense' },
  receiptUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  adminNote: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

expenseSchema.index({ donorId: 1, createdAt: -1 });
expenseSchema.index({ status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
