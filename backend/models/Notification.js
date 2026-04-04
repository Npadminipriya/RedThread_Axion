const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'request_alert',      // New blood request matched to donor
      'approval',           // Account approved by admin
      'rejection',          // Account rejected by admin
      'donation_confirm',   // Donation confirmed by hospital
      'donation_complete',  // Donation marked complete
      'expense_submitted',  // Expense submitted by donor
      'expense_approved',   // Expense approved by admin
      'expense_rejected',   // Expense rejected by admin
      'ivr_accepted',       // Donor accepted via IVR call
      'ivr_rejected',       // Donor rejected via IVR call
      'escalation',         // Request escalated to blood banks
      'cooldown_started',   // Cooldown period started
      'false_accept_flag',  // Donor flagged for false acceptance
      'general',            // General notification
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }, // links to request, expense, etc.
  relatedModel: { type: String, enum: ['Request', 'Expense', 'User', 'Donor', null], default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
