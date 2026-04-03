const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const { protect, authorize } = require('../middleware/auth');

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
// @desc    Approve or reject a user
router.put('/verify/:id', async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.isVerified = status === 'approved';
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
      }
    });
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

module.exports = router;
