const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { protect, authorize, requireApproval } = require('../middleware/auth');
const { matchDonors, matchBloodBanks } = require('../services/matchingService');
const { makeVoiceCall, sendSMS } = require('../services/twilioService');

router.use(protect, authorize('hospital'), requireApproval);

// @route   POST /api/hospital/request
// @desc    Create a blood request
router.post('/request', async (req, res) => {
  try {
    const { bloodGroup, units, urgency, address, latitude, longitude, notes } = req.body;
    const hospital = await Hospital.findOne({ userId: req.user._id });

    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });

    const coords = [parseFloat(longitude) || hospital.location.coordinates[0],
                     parseFloat(latitude) || hospital.location.coordinates[1]];

    // Create request
    const request = await Request.create({
      hospitalId: req.user._id,
      bloodGroup,
      units: parseInt(units) || 1,
      urgency: urgency || 'normal',
      location: { type: 'Point', coordinates: coords, address: address || hospital.location.address },
      notes,
      status: 'matching',
    });

    // Step 1: AI Match donors
    const matchedDonors = await matchDonors(bloodGroup, coords);

    request.matchedDonors = matchedDonors.map(m => ({
      donorId: m.donor._id,
      userId: m.donor.userId._id,
      status: 'pending',
    }));

    // Step 2: Call/notify donors
    for (const match of matchedDonors) {
      const phone = match.donor.userId.phone;
      if (phone) {
        const callResult = await makeVoiceCall(phone, request._id, bloodGroup, 'donor');
        const idx = request.matchedDonors.findIndex(
          d => d.donorId.toString() === match.donor._id.toString()
        );
        if (idx >= 0) {
          request.matchedDonors[idx].status = 'called';
          request.matchedDonors[idx].calledAt = new Date();
          if (callResult.callSid) {
            request.matchedDonors[idx].callSid = callResult.callSid;
          }
        }

        // Also send SMS backup
        await sendSMS(phone,
          `🩸 RedThread Emergency: ${bloodGroup} blood needed. ` +
          `Urgency: ${urgency || 'normal'}. Log in to respond: ${process.env.BASE_URL}`
        );
      }
    }

    if (matchedDonors.length === 0) {
      request.status = 'escalated';
      request.escalatedToBloodBanks = true;

      // Escalate to blood banks
      const matchedBanks = await matchBloodBanks(bloodGroup, coords, parseInt(units) || 1);
      request.matchedBloodBanks = matchedBanks.map(m => ({
        bloodBankId: m.bloodBank._id,
        userId: m.bloodBank.userId._id,
        status: 'pending',
        unitsAvailable: m.unitsAvailable,
      }));

      for (const match of matchedBanks) {
        const phone = match.bloodBank.userId.phone;
        if (phone) {
          await makeVoiceCall(phone, request._id, bloodGroup, 'bloodbank');
          await sendSMS(phone,
            `🏥 RedThread: ${bloodGroup} blood request. ${units} units needed. Log in to respond.`
          );
        }
      }
    }

    await request.save();

    res.status(201).json({
      message: 'Blood request created and matching started',
      request,
      matchedDonors: matchedDonors.length,
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
});

// @route   GET /api/hospital/requests
// @desc    Get all requests for this hospital
router.get('/requests', async (req, res) => {
  try {
    const requests = await Request.find({ hospitalId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/hospital/request/:id
// @desc    Get single request with details
router.get('/request/:id', async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, hospitalId: req.user._id })
      .populate('matchedDonors.userId', 'name phone')
      .populate('matchedBloodBanks.userId', 'name phone');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/hospital/escalate/:id
// @desc    Escalate request to blood banks
router.post('/escalate/:id', async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, hospitalId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'escalated';
    request.escalatedToBloodBanks = true;

    const matchedBanks = await matchBloodBanks(
      request.bloodGroup,
      request.location.coordinates,
      request.units
    );

    request.matchedBloodBanks = matchedBanks.map(m => ({
      bloodBankId: m.bloodBank._id,
      userId: m.bloodBank.userId._id,
      status: 'pending',
      unitsAvailable: m.unitsAvailable,
    }));

    for (const match of matchedBanks) {
      const phone = match.bloodBank.userId.phone;
      if (phone) {
        await makeVoiceCall(phone, request._id, request.bloodGroup, 'bloodbank');
        await sendSMS(phone,
          `🏥 RedThread: ${request.bloodGroup} blood request escalated. ${request.units} units needed.`
        );
      }
    }

    await request.save();
    res.json({ message: 'Request escalated to blood banks', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/hospital/request/:id/fulfill
// @desc    Mark request as fulfilled
router.put('/request/:id/fulfill', async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, hospitalId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    request.status = 'fulfilled';
    await request.save();
    res.json({ message: 'Request marked as fulfilled', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
