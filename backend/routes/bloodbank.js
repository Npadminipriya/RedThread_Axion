const express = require('express');
const router = express.Router();
const BloodBank = require('../models/BloodBank');
const Request = require('../models/Request');
const { protect, authorize, requireApproval } = require('../middleware/auth');

router.use(protect, authorize('bloodbank'), requireApproval);

// @route   GET /api/bloodbank/profile
// @desc    Get blood bank profile with inventory
router.get('/profile', async (req, res) => {
  try {
    const bloodBank = await BloodBank.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone');
    if (!bloodBank) return res.status(404).json({ message: 'Blood bank profile not found' });
    res.json({ bloodBank });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/bloodbank/inventory
// @desc    Get inventory
router.get('/inventory', async (req, res) => {
  try {
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) return res.status(404).json({ message: 'Blood bank not found' });
    res.json({ inventory: bloodBank.inventory });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/bloodbank/inventory
// @desc    Update inventory
router.put('/inventory', async (req, res) => {
  try {
    const { inventory } = req.body; // [{bloodGroup, units}]
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) return res.status(404).json({ message: 'Blood bank not found' });

    if (Array.isArray(inventory)) {
      inventory.forEach(item => {
        const existing = bloodBank.inventory.find(i => i.bloodGroup === item.bloodGroup);
        if (existing) {
          existing.units = parseInt(item.units) || 0;
        } else {
          bloodBank.inventory.push({ bloodGroup: item.bloodGroup, units: parseInt(item.units) || 0 });
        }
      });
    }

    await bloodBank.save();
    res.json({ message: 'Inventory updated', inventory: bloodBank.inventory });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/bloodbank/requests
// @desc    Get requests assigned to this blood bank
router.get('/requests', async (req, res) => {
  try {
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) return res.status(404).json({ message: 'Blood bank not found' });

    const requests = await Request.find({
      'matchedBloodBanks.bloodBankId': bloodBank._id,
      status: { $in: ['escalated', 'matched', 'pending', 'matching'] }
    }).populate('hospitalId', 'name').sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/bloodbank/respond/:requestId
// @desc    Respond to a blood request
router.post('/respond/:requestId', async (req, res) => {
  try {
    const { response, units } = req.body; // 'accepted' or 'rejected'
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) return res.status(404).json({ message: 'Blood bank not found' });

    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const matchIdx = request.matchedBloodBanks.findIndex(
      m => m.bloodBankId.toString() === bloodBank._id.toString()
    );
    if (matchIdx === -1) {
      return res.status(400).json({ message: 'You are not matched to this request' });
    }

    request.matchedBloodBanks[matchIdx].status = response;
    request.matchedBloodBanks[matchIdx].respondedAt = new Date();

    if (response === 'accepted') {
      request.status = 'matched';
      request.fulfilledBy = { type: 'bloodbank', id: bloodBank._id };

      // Deduct from inventory
      const invItem = bloodBank.inventory.find(i => i.bloodGroup === request.bloodGroup);
      if (invItem) {
        const deduct = Math.min(parseInt(units) || request.units, invItem.units);
        invItem.units -= deduct;
        await bloodBank.save();
      }
    }

    await request.save();
    res.json({ message: `Request ${response}`, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
