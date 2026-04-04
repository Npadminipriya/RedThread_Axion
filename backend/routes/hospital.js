const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const DonationCompletion = require('../models/DonationCompletion');
const CoinTransaction = require('../models/CoinTransaction');
const User = require('../models/User');
const { protect, authorize, requireApproval } = require('../middleware/auth');
const { matchDonors, matchBloodBanks } = require('../services/matchingService');
const { makeVoiceCall, sendSMS } = require('../services/twilioService');
const { notifyDonorMatched, notifyDonationConfirmed, notifyFalseAcceptFlag, notifyEscalation } = require('../services/notificationService');

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
      userId: m.donor.userId._id || m.donor.userId,
      status: 'pending',
    }));

    // Step 2: Call/notify donors
    for (const match of matchedDonors) {
      const phone = match.donor.userId.phone;
      const donorUserId = match.donor.userId._id || match.donor.userId;

      // Create in-app notification
      await notifyDonorMatched(donorUserId, request._id, bloodGroup);

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
          `Urgency: ${urgency || 'normal'}. Log in to respond: ${process.env.BASE_URL || 'http://localhost:3000'}`
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
        userId: m.bloodBank.userId._id || m.bloodBank.userId,
        status: 'pending',
        unitsAvailable: m.unitsAvailable,
      }));

      for (const match of matchedBanks) {
        const phone = match.bloodBank.userId.phone;
        const bankUserId = match.bloodBank.userId._id || match.bloodBank.userId;
        await notifyEscalation(bankUserId, request._id, bloodGroup);
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
// @desc    Escalate request to blood banks (only when no matching donors available)
router.post('/escalate/:id', async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, hospitalId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Restrict escalation: only when no donors have accepted
    const hasAcceptedDonor = request.matchedDonors?.some(d => d.status === 'accepted');
    if (hasAcceptedDonor) {
      return res.status(400).json({ message: 'Cannot escalate: a donor has already accepted this request.' });
    }

    const allDonorsUnavailable = request.matchedDonors?.length === 0 ||
      request.matchedDonors.every(d => ['rejected', 'no_response'].includes(d.status));

    if (!allDonorsUnavailable && request.matchedDonors?.length > 0) {
      return res.status(400).json({ message: 'Cannot escalate: some donors have not yet responded. Wait for all donors to respond or reject first.' });
    }

    request.status = 'escalated';
    request.escalatedToBloodBanks = true;

    const matchedBanks = await matchBloodBanks(
      request.bloodGroup,
      request.location.coordinates,
      request.units
    );

    request.matchedBloodBanks = matchedBanks.map(m => ({
      bloodBankId: m.bloodBank._id,
      userId: m.bloodBank.userId._id || m.bloodBank.userId,
      status: 'pending',
      unitsAvailable: m.unitsAvailable,
    }));

    for (const match of matchedBanks) {
      const phone = match.bloodBank.userId.phone;
      const bankUserId = match.bloodBank.userId._id || match.bloodBank.userId;
      await notifyEscalation(bankUserId, request._id, request.bloodGroup);
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

// @route   PUT /api/hospital/request/:id/confirm-donation
// @desc    Hospital confirms donor showed up (or flagged as no-show)
router.put('/request/:id/confirm-donation', async (req, res) => {
  try {
    const { donorId, donorShowedUp, notes } = req.body;
    const request = await Request.findOne({ _id: req.params.id, hospitalId: req.user._id });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const donor = await Donor.findById(donorId);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    // Create/update donation completion record
    let completion = await DonationCompletion.findOne({ requestId: request._id, donorId: donor._id });
    if (!completion) {
      completion = new DonationCompletion({
        requestId: request._id,
        donorId: donor._id,
        hospitalId: req.user._id,
      });
    }

    completion.confirmedByHospital = true;
    completion.donorShowedUp = donorShowedUp;
    completion.completedAt = new Date();
    completion.notes = notes || '';
    await completion.save();

    if (donorShowedUp) {
      // Donor showed up: increment completedCount, recalculate trust score
      donor.completedCount += 1;
      donor.trustScore = Math.min(100, Math.round((donor.completedCount / Math.max(donor.acceptedCount, 1)) * 100));

      // Mark request as fulfilled
      request.status = 'fulfilled';
      await request.save();

      await notifyDonationConfirmed(donor.userId, request._id);
    } else {
      // No-show: increment falseAcceptCount, reduce trust score, penalize coins
      donor.falseAcceptCount += 1;
      donor.trustScore = Math.max(0, Math.round(((donor.completedCount) / Math.max(donor.acceptedCount, 1)) * 100));

      // Coin penalty
      const penaltyAmount = 30;
      donor.coins = Math.max(0, donor.coins - penaltyAmount);

      await CoinTransaction.create({
        donorId: donor._id,
        type: 'penalty',
        amount: penaltyAmount,
        reason: `No-show penalty: failed to complete donation (-${penaltyAmount} coins)`,
        requestId: request._id,
      });

      await notifyFalseAcceptFlag(donor.userId, request._id);
    }

    await donor.save();

    res.json({
      message: donorShowedUp ? 'Donation confirmed successfully' : 'Donor flagged as no-show',
      completion,
      donor: {
        id: donor._id,
        trustScore: donor.trustScore,
        completedCount: donor.completedCount,
        falseAcceptCount: donor.falseAcceptCount,
      },
    });
  } catch (error) {
    console.error('Confirm donation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/hospital/available-donors
// @desc    Get real-time available donors filtered by blood group + location
router.get('/available-donors', async (req, res) => {
  try {
    const { bloodGroup, lat, lng, radius = 50 } = req.query;
    const hospital = await Hospital.findOne({ userId: req.user._id });

    const latitude = parseFloat(lat) || hospital?.location?.coordinates?.[1] || 0;
    const longitude = parseFloat(lng) || hospital?.location?.coordinates?.[0] || 0;

    const filter = {
      availability: true,
      $or: [{ cooldownUntil: null }, { cooldownUntil: { $lt: new Date() } }],
    };
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    const donors = await Donor.find(filter).populate('userId', 'name phone status');
    const { calculateDistance } = require('../services/matchingService');
    const coordinates = [longitude, latitude];
    const maxRadius = parseFloat(radius) || 50;

    const results = donors
      .filter(d => d.userId && d.userId.status === 'approved')
      .map(d => {
        let distance = 999;
        if (d.location?.coordinates?.[0] !== 0 || d.location?.coordinates?.[1] !== 0) {
          distance = calculateDistance(coordinates, d.location.coordinates);
        }
        if (distance > maxRadius) return null;

        return {
          id: d._id,
          name: d.userId.name,
          bloodGroup: d.bloodGroup,
          distance: Math.round(distance * 10) / 10,
          trustScore: d.trustScore,
          donationCount: d.donationCount,
          isRare: d.isRareBloodGroup(),
          address: d.location?.address || '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    res.json({ donors: results, total: results.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
