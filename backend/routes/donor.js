const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');
const Request = require('../models/Request');
const DonationCompletion = require('../models/DonationCompletion');
const { protect, authorize, requireApproval } = require('../middleware/auth');
const { notifyCooldownStarted } = require('../services/notificationService');

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
// @desc    Update donor profile (including user details)
router.put('/profile', async (req, res) => {
  try {
    const { bloodGroup, address, latitude, longitude, name, phone, availability } = req.body;
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const update = {};
    if (bloodGroup) update.bloodGroup = bloodGroup;
    if (availability !== undefined) update.availability = availability;

    if (address || latitude || longitude) {
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude) || donor.location.coordinates[0], parseFloat(latitude) || donor.location.coordinates[1]],
        address: address || donor.location.address
      };
    }

    const updatedDonor = await Donor.findOneAndUpdate({ userId: req.user._id }, update, { new: true })
      .populate('userId', 'name email phone');

    // Also update User model fields if provided
    if (name || phone) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (phone) userUpdate.phone = phone;
      await User.findByIdAndUpdate(req.user._id, userUpdate);
    }

    res.json({ donor: updatedDonor });
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

    // Get completion status for each request
    const completions = await DonationCompletion.find({ donorId: donor._id });
    const completionMap = {};
    completions.forEach(c => { completionMap[c.requestId.toString()] = c; });

    const historyWithCompletions = requests.map(r => ({
      ...r.toObject(),
      completion: completionMap[r._id.toString()] || null,
    }));

    res.json({ history: historyWithCompletions, blockchainRecords: donor.blockchainRecords });
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

      // Increment acceptedCount for trust score
      donor.acceptedCount += 1;

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

      // Notify about cooldown
      await notifyCooldownStarted(req.user._id, donor.cooldownUntil);
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
      trustScore: d.trustScore,
    }));

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donor/trust-score
// @desc    Get trust score breakdown
router.get('/trust-score', async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const isReliable = donor.trustScore >= 60;

    res.json({
      trustScore: donor.trustScore,
      acceptedCount: donor.acceptedCount,
      completedCount: donor.completedCount,
      falseAcceptCount: donor.falseAcceptCount,
      isReliable,
      rating: donor.trustScore >= 90 ? 'Excellent' :
        donor.trustScore >= 75 ? 'Good' :
          donor.trustScore >= 60 ? 'Average' :
            'Needs Improvement',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
