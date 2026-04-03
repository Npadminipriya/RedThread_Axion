// Smart AI Matching Service
// Matches donors and blood banks based on blood group, location, availability

const Donor = require('../models/Donor');
const BloodBank = require('../models/BloodBank');
const User = require('../models/User');

// Blood group compatibility chart
const compatibleDonors = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

// Calculate distance between two coordinates (km) using Haversine formula
const calculateDistance = (coord1, coord2) => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Match donors for a blood request
const matchDonors = async (bloodGroup, coordinates, maxDistance = 50) => {
  try {
    const compatible = compatibleDonors[bloodGroup] || [bloodGroup];

    // Find available donors with compatible blood groups
    const donors = await Donor.find({
      bloodGroup: { $in: compatible },
      availability: true,
      $or: [
        { cooldownUntil: null },
        { cooldownUntil: { $lt: new Date() } }
      ]
    }).populate('userId', 'name phone email status');

    // Filter by approved status and calculate scores
    const scoredDonors = donors
      .filter(d => d.userId && d.userId.status === 'approved')
      .map(donor => {
        let score = 0;
        let distance = 0;

        // Exact blood group match gets higher score
        if (donor.bloodGroup === bloodGroup) score += 50;
        else score += 30;

        // Distance scoring
        if (donor.location && donor.location.coordinates &&
            donor.location.coordinates[0] !== 0) {
          distance = calculateDistance(coordinates, donor.location.coordinates);
          if (distance <= 5) score += 50;
          else if (distance <= 15) score += 35;
          else if (distance <= 30) score += 20;
          else if (distance <= maxDistance) score += 10;
          else return null; // Too far
        } else {
          score += 15; // Unknown location, medium priority
          distance = 999;
        }

        // Availability bonus
        if (donor.availability) score += 20;

        // Donation count bonus (experienced donors)
        score += Math.min(donor.donationCount * 2, 10);

        return { donor, score, distance };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return scoredDonors.slice(0, 10); // Top 10 matches
  } catch (error) {
    console.error('Donor matching error:', error);
    return [];
  }
};

// Match blood banks for a blood request
const matchBloodBanks = async (bloodGroup, coordinates, unitsNeeded = 1, maxDistance = 100) => {
  try {
    // Find blood banks with the needed blood group in stock
    const bloodBanks = await BloodBank.find({
      'inventory.bloodGroup': bloodGroup,
      'inventory.units': { $gte: 1 }
    }).populate('userId', 'name phone email status');

    const scoredBanks = bloodBanks
      .filter(bb => bb.userId && bb.userId.status === 'approved')
      .map(bank => {
        let score = 0;
        let distance = 0;

        // Find available units
        const item = bank.inventory.find(i => i.bloodGroup === bloodGroup);
        const unitsAvailable = item ? item.units : 0;

        if (unitsAvailable <= 0) return null;

        // Units availability scoring
        if (unitsAvailable >= unitsNeeded) score += 50;
        else score += (unitsAvailable / unitsNeeded) * 30;

        // Distance scoring
        if (bank.location && bank.location.coordinates &&
            bank.location.coordinates[0] !== 0) {
          distance = calculateDistance(coordinates, bank.location.coordinates);
          if (distance <= 10) score += 40;
          else if (distance <= 30) score += 25;
          else if (distance <= maxDistance) score += 10;
          else return null;
        } else {
          score += 10;
          distance = 999;
        }

        return { bloodBank: bank, score, distance, unitsAvailable };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return scoredBanks.slice(0, 5); // Top 5 matches
  } catch (error) {
    console.error('Blood bank matching error:', error);
    return [];
  }
};

module.exports = { matchDonors, matchBloodBanks, compatibleDonors, calculateDistance };
