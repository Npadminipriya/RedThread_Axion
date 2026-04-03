// Blockchain Simulation Service
// Creates SHA256 hashes of donation records for verification

const crypto = require('crypto');

// Create a hash for a donation record
const createDonationHash = (donationData) => {
  const {
    donorId,
    requestId,
    bloodGroup,
    donationDate,
    hospitalId,
  } = donationData;

  const record = JSON.stringify({
    donorId: donorId.toString(),
    requestId: requestId.toString(),
    bloodGroup,
    donationDate: donationDate || new Date().toISOString(),
    hospitalId: hospitalId ? hospitalId.toString() : 'unknown',
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const hash = crypto.createHash('sha256').update(record).digest('hex');

  return {
    hash: `0x${hash}`,
    record,
    verified: true,
    timestamp: new Date().toISOString(),
  };
};

// Verify a hash (simulate blockchain verification)
const verifyHash = (hash) => {
  // In a real blockchain, we'd check the chain
  // Here we just verify the hash format
  return {
    verified: hash && hash.startsWith('0x') && hash.length === 66,
    hash,
    message: 'Blockchain verification complete',
  };
};

module.exports = { createDonationHash, verifyHash };
