const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Donor = require('../models/Donor');
const DonationCompletion = require('../models/DonationCompletion');
const { protect, authorize, requireApproval } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { notifyExpenseSubmitted } = require('../services/notificationService');

// Donor expense routes
router.use(protect);

// @route   POST /api/expense/submit
// @desc    Submit a transport expense claim
router.post('/submit', authorize('donor'), requireApproval, upload.single('receipt'), async (req, res) => {
  try {
    const { amount, requestId, description } = req.body;
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    if (!amount || !requestId) {
      return res.status(400).json({ message: 'Amount and requestId are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Receipt upload is required' });
    }

    // Verify donation was confirmed by hospital
    const completion = await DonationCompletion.findOne({
      donorId: donor._id,
      requestId,
      donorShowedUp: true,
    });

    if (!completion) {
      return res.status(400).json({ message: 'Only verified donations are eligible for transport reimbursement. The hospital must confirm your donation first.' });
    }

    // Check 24-hour window from donation completion
    const hoursSinceCompletion = (Date.now() - new Date(completion.completedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCompletion > 24) {
      return res.status(400).json({ message: 'Expense claims must be submitted within 24 hours of donation completion.' });
    }

    // Check for duplicate
    const existingExpense = await Expense.findOne({ donorId: donor._id, requestId });
    if (existingExpense) {
      return res.status(400).json({ message: 'You have already submitted an expense for this donation.' });
    }

    const expense = await Expense.create({
      donorId: donor._id,
      userId: req.user._id,
      requestId,
      amount: parseFloat(amount),
      description: description || 'Transport/commute expense',
      receiptUrl: `/uploads/${req.file.filename}`,
    });

    await notifyExpenseSubmitted(req.user._id, expense._id);

    res.status(201).json({ message: 'Expense submitted successfully', expense });
  } catch (error) {
    console.error('Expense submit error:', error);
    res.status(500).json({ message: 'Failed to submit expense', error: error.message });
  }
});

// @route   GET /api/expense/my-expenses
// @desc    Get donor's expense history
router.get('/my-expenses', authorize('donor'), requireApproval, async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const expenses = await Expense.find({ donorId: donor._id })
      .populate('requestId', 'bloodGroup urgency createdAt')
      .sort({ createdAt: -1 });

    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/expense/wallet
// @desc    Get donor's wallet summary
router.get('/wallet', authorize('donor'), requireApproval, async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const expenses = await Expense.find({ donorId: donor._id });

    const wallet = {
      pendingAmount: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
      approvedAmount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
      rejectedAmount: expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0),
      totalClaims: expenses.length,
      pendingClaims: expenses.filter(e => e.status === 'pending').length,
      approvedClaims: expenses.filter(e => e.status === 'approved').length,
    };

    res.json({ wallet });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
