const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const Request = require('../models/Request');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');
const { notifyApproval, notifyRejection, notifyExpenseApproved, notifyExpenseRejected } = require('../services/notificationService');

// All admin routes require admin role
router.use(protect, authorize('admin'));

// @route   GET /api/admin/pending
// @desc    Get all pending verification requests
router.get('/pending', async (req, res) => {
  try {
    const pendingUsers = await User.find({
      status: 'pending',
      role: { $in: ['hospital', 'bloodbank'] }
    }).select('-password -otp -otpExpiry').sort({ createdAt: -1 });

    // Enrich with role-specific data
    const enriched = await Promise.all(pendingUsers.map(async (user) => {
      let details = null;
      if (user.role === 'hospital') {
        details = await Hospital.findOne({ userId: user._id });
      } else if (user.role === 'bloodbank') {
        details = await BloodBank.findOne({ userId: user._id });
      }
      return { user, details };
    }));

    res.json({ pendingRequests: enriched });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/all-users
// @desc    Get all users
router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find().select('-password -otp -otpExpiry').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/verify/:id
// @desc    Approve or reject a user (with rejection reason)
router.put('/verify/:id', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.isVerified = status === 'approved';

    if (status === 'rejected') {
      user.rejectionReason = rejectionReason || 'No reason provided';
      user.rejectedAt = new Date();
      await notifyRejection(user._id, user.rejectionReason);
    } else {
      user.rejectionReason = null;
      user.rejectedAt = null;
      await notifyApproval(user._id);
    }

    await user.save();

    res.json({
      message: `User ${status} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        rejectionReason: user.rejectionReason,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/document/:id
// @desc    Get document URL for viewing
router.get('/document/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('documentUrl name role');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.documentUrl) {
      return res.status(404).json({ message: 'No document uploaded' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const fullUrl = user.documentUrl.startsWith('http') ? user.documentUrl : `${baseUrl}${user.documentUrl}`;

    res.json({ documentUrl: fullUrl, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/stats
// @desc    Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalDonors, totalHospitals, totalBloodBanks, pendingCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'hospital' }),
      User.countDocuments({ role: 'bloodbank' }),
      User.countDocuments({ status: 'pending', role: { $in: ['hospital', 'bloodbank'] } }),
    ]);

    res.json({
      stats: { totalUsers, totalDonors, totalHospitals, totalBloodBanks, pendingCount }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/expenses
// @desc    Get all pending expenses for admin approval
router.get('/expenses', async (req, res) => {
  try {
    const statusFilter = req.query.status || 'pending';
    const filter = statusFilter === 'all' ? {} : { status: statusFilter };

    const expenses = await Expense.find(filter)
      .populate('userId', 'name email phone')
      .populate('requestId', 'bloodGroup urgency createdAt')
      .sort({ createdAt: -1 });

    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/expense/:id
// @desc    Approve or reject an expense
router.put('/expense/:id', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    expense.status = status;
    expense.adminNote = adminNote || '';
    expense.processedAt = new Date();
    expense.processedBy = req.user._id;
    await expense.save();

    if (status === 'approved') {
      await notifyExpenseApproved(expense.userId, expense._id, expense.amount);
    } else {
      await notifyExpenseRejected(expense.userId, expense._id, adminNote);
    }

    res.json({ message: `Expense ${status} successfully`, expense });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/emergency-stats
// @desc    Live emergency dashboard data
router.get('/emergency-stats', async (req, res) => {
  try {
    const [
      activeRequests,
      matchedRequests,
      fulfilledRequests,
      escalatedRequests,
      availableDonors,
      totalDonors,
      recentRequests,
    ] = await Promise.all([
      Request.countDocuments({ status: { $in: ['pending', 'matching'] } }),
      Request.countDocuments({ status: 'matched' }),
      Request.countDocuments({ status: 'fulfilled' }),
      Request.countDocuments({ status: 'escalated' }),
      Donor.countDocuments({
        availability: true,
        $or: [{ cooldownUntil: null }, { cooldownUntil: { $lt: new Date() } }],
      }),
      Donor.countDocuments(),
      Request.find({ status: { $in: ['pending', 'matching', 'matched', 'escalated'] } })
        .populate('hospitalId', 'name')
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    const totalRequests = activeRequests + matchedRequests + fulfilledRequests + escalatedRequests;
    const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;

    res.json({
      emergency: {
        activeRequests,
        matchedRequests,
        fulfilledRequests,
        escalatedRequests,
        availableDonors,
        totalDonors,
        fulfillmentRate,
        recentRequests,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
