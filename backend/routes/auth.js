const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const { generateToken } = require('../middleware/auth');
const { generateOTP, sendOTP } = require('../services/twilioService');
const upload = require('../middleware/upload');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', upload.single('document'), async (req, res) => {
  try {
    const { name, email, phone, password, role, bloodGroup, address, latitude, longitude, licenseNumber } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }

    // Set status based on role
    const status = role === 'donor' ? 'approved' : 'pending';
    const isVerified = role === 'donor';

    // Create user
    const user = await User.create({
      name, email, phone, password, role,
      status,
      isVerified,
      documentUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });

    // Create role-specific profile
    const coords = [parseFloat(longitude) || 0, parseFloat(latitude) || 0];

    if (role === 'donor') {
      await Donor.create({
        userId: user._id,
        bloodGroup: bloodGroup || 'O+',
        location: { type: 'Point', coordinates: coords, address: address || '' },
      });
    } else if (role === 'hospital') {
      await Hospital.create({
        userId: user._id,
        location: { type: 'Point', coordinates: coords, address: address || '' },
        licenseNumber: licenseNumber || '',
      });
    } else if (role === 'bloodbank') {
      await BloodBank.create({
        userId: user._id,
        location: { type: 'Point', coordinates: coords, address: address || '' },
        licenseNumber: licenseNumber || '',
        inventory: [
          { bloodGroup: 'A+', units: 0 }, { bloodGroup: 'A-', units: 0 },
          { bloodGroup: 'B+', units: 0 }, { bloodGroup: 'B-', units: 0 },
          { bloodGroup: 'AB+', units: 0 }, { bloodGroup: 'AB-', units: 0 },
          { bloodGroup: 'O+', units: 0 }, { bloodGroup: 'O-', units: 0 },
        ]
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: role === 'donor'
        ? 'Registration successful'
        : 'Registration successful. Awaiting admin approval.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to phone number
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this phone number' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const result = await sendOTP(phone, otp);

    res.json({
      message: 'OTP sent successfully',
      ...(result.demoOtp && { demoOtp: result.demoOtp }), // Include OTP in demo mode
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Clear OTP and mark phone as verified
    user.otp = null;
    user.otpExpiry = null;
    user.isPhoneVerified = true;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
const { protect } = require('../middleware/auth');
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpiry');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
