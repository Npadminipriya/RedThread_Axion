// Centralized Notification Service
// Creates in-app notifications and optionally sends SMS via Twilio

const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSMS } = require('./twilioService');

// Create a notification and optionally send SMS
const createNotification = async (userId, type, title, message, relatedId = null, relatedModel = null, sendSmsFlag = true) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
    });

    // Send SMS for all notifications
    if (sendSmsFlag) {
      try {
        const user = await User.findById(userId).select('phone');
        if (user?.phone) {
          await sendSMS(user.phone, `🩸 RedThread: ${title} — ${message}`);
        }
      } catch (smsErr) {
        console.error('Notification SMS failed:', smsErr.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error.message);
    return null;
  }
};

// Create notifications for multiple users
const createBulkNotifications = async (userIds, type, title, message, relatedId = null, relatedModel = null) => {
  const results = [];
  for (const userId of userIds) {
    const notif = await createNotification(userId, type, title, message, relatedId, relatedModel);
    if (notif) results.push(notif);
  }
  return results;
};

// Notification templates
const notifyApproval = (userId) =>
  createNotification(userId, 'approval', 'Account Approved', 'Your account has been approved by admin. You can now access all features.', userId, 'User');

const notifyRejection = (userId, reason) =>
  createNotification(userId, 'rejection', 'Account Rejected', `Your account has been rejected. Reason: ${reason || 'Not specified'}`, userId, 'User');

const notifyDonorMatched = (userId, requestId, bloodGroup) =>
  createNotification(userId, 'request_alert', 'Blood Request Alert', `Emergency: ${bloodGroup} blood is urgently needed. Please respond to the request.`, requestId, 'Request');

const notifyDonationConfirmed = (userId, requestId) =>
  createNotification(userId, 'donation_confirm', 'Donation Confirmed', 'The hospital has confirmed your donation. Thank you for saving a life!', requestId, 'Request');

const notifyFalseAcceptFlag = (userId, requestId) =>
  createNotification(userId, 'false_accept_flag', 'No-Show Flagged', 'You were flagged for not showing up after accepting a donation request. Your trust score has been reduced.', requestId, 'Request');

const notifyCooldownStarted = (userId, cooldownUntil) =>
  createNotification(userId, 'cooldown_started', 'Cooldown Started', `You are now in a cooldown period until ${new Date(cooldownUntil).toLocaleDateString()}. Thank you for donating!`, null, null);

const notifyExpenseSubmitted = (userId, expenseId) =>
  createNotification(userId, 'expense_submitted', 'Expense Submitted', 'Your transport expense has been submitted and is pending admin approval.', expenseId, 'Expense');

const notifyExpenseApproved = (userId, expenseId, amount) =>
  createNotification(userId, 'expense_approved', 'Expense Approved', `Your transport expense claim of ₹${amount} has been approved.`, expenseId, 'Expense');

const notifyExpenseRejected = (userId, expenseId, reason) =>
  createNotification(userId, 'expense_rejected', 'Expense Rejected', `Your transport expense has been rejected. Reason: ${reason || 'Not specified'}`, expenseId, 'Expense');

const notifyEscalation = (userId, requestId, bloodGroup) =>
  createNotification(userId, 'escalation', 'Request Escalated', `A ${bloodGroup} blood request has been escalated to your blood bank. Please check your requests.`, requestId, 'Request');

const notifyIVRAccepted = (userId, requestId) =>
  createNotification(userId, 'ivr_accepted', 'Request Accepted via Call', 'You accepted a blood donation request via phone. Please proceed to the hospital.', requestId, 'Request', false);

const notifyIVRRejected = (userId, requestId) =>
  createNotification(userId, 'ivr_rejected', 'Request Declined via Call', 'You declined a blood donation request via phone.', requestId, 'Request', false);

module.exports = {
  createNotification,
  createBulkNotifications,
  notifyApproval,
  notifyRejection,
  notifyDonorMatched,
  notifyDonationConfirmed,
  notifyFalseAcceptFlag,
  notifyCooldownStarted,
  notifyExpenseSubmitted,
  notifyExpenseApproved,
  notifyExpenseRejected,
  notifyEscalation,
  notifyIVRAccepted,
  notifyIVRRejected,
};
