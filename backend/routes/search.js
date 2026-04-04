const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { calculateDistance } = require('../services/matchingService');

// Authenticated search routes
router.use(protect);

// @route   GET /api/search/nearby-bloodbanks
// @desc    Find nearby blood banks with distance and contact info
router.get('/nearby-bloodbanks', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const bloodBanks = await BloodBank.find().populate('userId', 'name email phone status');
    const maxRadius = parseFloat(radius) || 50;
    const coordinates = [longitude, latitude];

    const results = bloodBanks
      .filter(bb => bb.userId && bb.userId.status === 'approved')
      .map(bb => {
        let distance = 999;
        if (bb.location?.coordinates?.[0] !== 0 || bb.location?.coordinates?.[1] !== 0) {
          distance = calculateDistance(coordinates, bb.location.coordinates);
        }
        if (distance > maxRadius) return null;

        const inventorySummary = bb.inventory
          ?.filter(i => i.units > 0)
          .map(i => ({ bloodGroup: i.bloodGroup, units: i.units })) || [];

        return {
          id: bb._id,
          name: bb.userId.name,
          phone: bb.userId.phone,
          email: bb.userId.email,
          address: bb.location?.address || '',
          coordinates: bb.location?.coordinates || [0, 0],
          distance: Math.round(distance * 10) / 10,
          licenseNumber: bb.licenseNumber,
          inventory: inventorySummary,
          totalUnits: inventorySummary.reduce((sum, i) => sum + i.units, 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    res.json({ bloodBanks: results, total: results.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/search/nearby-hospitals
// @desc    Find nearby hospitals with distance and contact info
router.get('/nearby-hospitals', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const hospitals = await Hospital.find().populate('userId', 'name email phone status');
    const maxRadius = parseFloat(radius) || 50;
    const coordinates = [longitude, latitude];

    const results = hospitals
      .filter(h => h.userId && h.userId.status === 'approved')
      .map(h => {
        let distance = 999;
        if (h.location?.coordinates?.[0] !== 0 || h.location?.coordinates?.[1] !== 0) {
          distance = calculateDistance(coordinates, h.location.coordinates);
        }
        if (distance > maxRadius) return null;

        return {
          id: h._id,
          name: h.userId.name,
          phone: h.userId.phone,
          email: h.userId.email,
          address: h.location?.address || '',
          coordinates: h.location?.coordinates || [0, 0],
          distance: Math.round(distance * 10) / 10,
          licenseNumber: h.licenseNumber,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    res.json({ hospitals: results, total: results.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/search/nearby-donors
// @desc    Find nearby available donors (for hospitals) - anonymized
router.get('/nearby-donors', async (req, res) => {
  try {
    const { lat, lng, bloodGroup, radius = 50 } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const filter = {
      availability: true,
      $or: [{ cooldownUntil: null }, { cooldownUntil: { $lt: new Date() } }],
    };
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    const donors = await Donor.find(filter).populate('userId', 'name status');
    const maxRadius = parseFloat(radius) || 50;
    const coordinates = [longitude, latitude];

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
          bloodGroup: d.bloodGroup,
          coordinates: d.location?.coordinates || [0, 0],
          distance: Math.round(distance * 10) / 10,
          trustScore: d.trustScore,
          donationCount: d.donationCount,
          isRare: d.isRareBloodGroup(),
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
