const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');
const Request = require('../models/Request');
const { protect, authorize, requireApproval } = require('../middleware/auth');

router.use(protect, authorize('donor'), requireApproval);

// @route   GET /api/donor/profile
// @desc    Get donor profile
router.get('/profile', async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id }).populate('userId', 'name email phone');
    if (!donor) return res.status(404).json({ message: 'Donor profile not found' });
    res.json({ donor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/donor/profile
// @desc    Update donor profile
router.put('/profile', async (req, res) => {
  try {
    const { bloodGroup, address, latitude, longitude } = req.body;
    const update = {};
    if (bloodGroup) update.bloodGroup = bloodGroup;
    if (address || latitude || longitude) {
      const donor = await Donor.findOne({ userId: req.user._id });
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude) || donor.location.coordinates[0], parseFloat(latitude) || donor.location.coordinates[1]],
        address: address || donor.location.address
      };
    }
    const donor = await Donor.findOneAndUpdate({ userId: req.user._id }, update, { new: true });
    res.json({ donor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/donor/availability
// @desc    Toggle availability
router.put('/availability', async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    // Check cooldown
    if (donor.isInCooldown()) {
      return res.status(400).json({
        message: 'You are in cooldown period',
        cooldownUntil: donor.cooldownUntil
      });
    }

    donor.availability = req.body.availability !== undefined ? req.body.availability : !donor.availability;
    await donor.save();
    res.json({ availability: donor.availability, donor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donor/history
// @desc    Get donation history
router.get('/history', async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const requests = await Request.find({
      'matchedDonors.donorId': donor._id
    }).populate('hospitalId', 'name').sort({ createdAt: -1 });

    res.json({ history: requests, blockchainRecords: donor.blockchainRecords });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donor/coins
// @desc    Get coin balance and transactions
router.get('/coins', async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const transactions = await CoinTransaction.find({ donorId: donor._id })
      .sort({ createdAt: -1 }).limit(50);

    res.json({ coins: donor.coins, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/donor/respond/:requestId
// @desc    Accept or reject a blood request
router.post('/respond/:requestId', async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'rejected'
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Update donor response in request
    const matchIdx = request.matchedDonors.findIndex(
      m => m.donorId.toString() === donor._id.toString()
    );
    if (matchIdx === -1) {
      return res.status(400).json({ message: 'You are not matched to this request' });
    }

    request.matchedDonors[matchIdx].status = response;
    request.matchedDonors[matchIdx].respondedAt = new Date();

    if (response === 'accepted') {
      request.status = 'matched';
      request.fulfilledBy = { type: 'donor', id: donor._id };

      // Award coins
      const coinAmount = donor.isRareBloodGroup() ? 100 : 50;
      donor.coins += coinAmount;
      donor.donationCount += 1;
      donor.lastDonationDate = new Date();
      donor.cooldownUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
      donor.availability = false;

      // Create blockchain record
      const { createDonationHash } = require('../services/blockchainService');
      const blockchainData = createDonationHash({
        donorId: donor._id,
        requestId: request._id,
        bloodGroup: request.bloodGroup,
        hospitalId: request.hospitalId,
      });
      donor.blockchainRecords.push({
        hash: blockchainData.hash,
        donationDate: new Date(),
        requestId: request._id,
      });
      request.blockchainHash = blockchainData.hash;

      await CoinTransaction.create({
        donorId: donor._id,
        type: 'earned',
        amount: coinAmount,
        reason: donor.isRareBloodGroup()
          ? `Rare blood group donation (+${coinAmount} coins)`
          : `Blood donation (+${coinAmount} coins)`,
        requestId: request._id,
      });

      // Add badge
      if (donor.donationCount >= 10 && !donor.badges.includes('Gold Donor')) {
        donor.badges.push('Gold Donor');
      } else if (donor.donationCount >= 5 && !donor.badges.includes('Silver Donor')) {
        donor.badges.push('Silver Donor');
      } else if (donor.donationCount >= 1 && !donor.badges.includes('First Donor')) {
        donor.badges.push('First Donor');
      }

      await donor.save();
    }

    await request.save();

    res.json({ message: `Request ${response}`, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donor/requests
// @desc    Get pending requests for this donor
router.get('/requests', async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const requests = await Request.find({
      'matchedDonors.donorId': donor._id,
      status: { $in: ['pending', 'matching', 'matched'] }
    }).populate('hospitalId', 'name').sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donor/leaderboard
// @desc    Get top donors
router.get('/leaderboard', async (req, res) => {
  try {
    const topDonors = await Donor.find()
      .populate('userId', 'name')
      .sort({ coins: -1 })
      .limit(20);

    const leaderboard = topDonors.map((d, i) => ({
      rank: i + 1,
      name: d.userId?.name || 'Anonymous',
      coins: d.coins,
      donations: d.donationCount,
      badges: d.badges,
      bloodGroup: d.bloodGroup,
    }));

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
