const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Donor = require('../models/Donor');
const BloodBank = require('../models/BloodBank');
const CoinTransaction = require('../models/CoinTransaction');

// @route   POST /api/twilio/voice-twiml
// @desc    Generate TwiML for voice calls
router.post('/voice-twiml', (req, res) => {
  const { requestId, bloodGroup, targetType } = req.query;

  let message = '';
  if (targetType === 'bloodbank') {
    message = `This is an emergency blood request from Red Thread platform. ` +
      `Blood group ${bloodGroup} is urgently needed. ` +
      `Press 1 to confirm availability. Press 2 to reject.`;
  } else {
    message = `This is an emergency blood donation request from Red Thread platform. ` +
      `Blood group ${bloodGroup} is urgently needed. ` +
      `Press 1 to accept the donation request. Press 2 to reject.`;
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/twilio/handle-keypress?requestId=${requestId}&amp;targetType=${targetType}" method="POST" timeout="10">
    <Say voice="alice">${message}</Say>
  </Gather>
  <Say voice="alice">We did not receive any input. Goodbye.</Say>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// @route   POST /api/twilio/handle-keypress
// @desc    Handle DTMF keypress from voice call
router.post('/handle-keypress', async (req, res) => {
  try {
    const { requestId, targetType } = req.query;
    const digit = req.body.Digits;
    const callSid = req.body.CallSid;

    const request = await Request.findById(requestId);
    if (!request) {
      res.type('text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Request not found. Goodbye.</Say></Response>`);
    }

    let responseMessage = '';

    if (targetType === 'donor') {
      const matchIdx = request.matchedDonors.findIndex(d => d.callSid === callSid);
      if (matchIdx >= 0) {
        if (digit === '1') {
          request.matchedDonors[matchIdx].status = 'accepted';
          request.matchedDonors[matchIdx].respondedAt = new Date();
          request.status = 'matched';

          // Award coins
          const donor = await Donor.findById(request.matchedDonors[matchIdx].donorId);
          if (donor) {
            const coinAmount = donor.isRareBloodGroup() ? 100 : 50;
            donor.coins += coinAmount;
            donor.donationCount += 1;
            donor.lastDonationDate = new Date();
            donor.cooldownUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            donor.availability = false;

            const { createDonationHash } = require('../services/blockchainService');
            const blockchainData = createDonationHash({
              donorId: donor._id, requestId: request._id,
              bloodGroup: request.bloodGroup, hospitalId: request.hospitalId,
            });
            donor.blockchainRecords.push({
              hash: blockchainData.hash, donationDate: new Date(), requestId: request._id,
            });
            request.blockchainHash = blockchainData.hash;
            request.fulfilledBy = { type: 'donor', id: donor._id };

            await donor.save();
            await CoinTransaction.create({
              donorId: donor._id, type: 'earned', amount: coinAmount,
              reason: `Blood donation via phone (+${coinAmount} coins)`, requestId: request._id,
            });
          }
          responseMessage = 'Thank you for accepting the donation request. You will receive further instructions via SMS.';
        } else {
          request.matchedDonors[matchIdx].status = 'rejected';
          request.matchedDonors[matchIdx].respondedAt = new Date();
          responseMessage = 'You have rejected the request. Thank you for your time.';
        }
      }
    } else if (targetType === 'bloodbank') {
      const matchIdx = request.matchedBloodBanks.findIndex(b => b.callSid === callSid);
      if (matchIdx >= 0) {
        if (digit === '1') {
          request.matchedBloodBanks[matchIdx].status = 'accepted';
          request.matchedBloodBanks[matchIdx].respondedAt = new Date();
          request.status = 'matched';
          request.fulfilledBy = { type: 'bloodbank', id: request.matchedBloodBanks[matchIdx].bloodBankId };
          responseMessage = 'Thank you for confirming availability. The hospital will contact you shortly.';
        } else {
          request.matchedBloodBanks[matchIdx].status = 'rejected';
          request.matchedBloodBanks[matchIdx].respondedAt = new Date();
          responseMessage = 'You have rejected the request. Thank you.';
        }
      }
    }

    await request.save();

    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${responseMessage}</Say></Response>`);
  } catch (error) {
    console.error('Handle keypress error:', error);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Goodbye.</Say></Response>`);
  }
});

// @route   POST /api/twilio/status-callback
// @desc    Handle call status callbacks
router.post('/status-callback', async (req, res) => {
  try {
    const { requestId, targetType } = req.query;
    const { CallSid, CallStatus } = req.body;

    if (CallStatus === 'no-answer' || CallStatus === 'busy' || CallStatus === 'failed') {
      const request = await Request.findById(requestId);
      if (request) {
        if (targetType === 'donor') {
          const match = request.matchedDonors.find(d => d.callSid === CallSid);
          if (match) {
            match.status = 'no_response';
            // Send SMS backup
            const { sendSMS } = require('../services/twilioService');
            const User = require('../models/User');
            const user = await User.findById(match.userId);
            if (user) {
              await sendSMS(user.phone,
                `🩸 RedThread: Emergency ${request.bloodGroup} blood needed. ` +
                `We tried calling but couldn't reach you. Log in to respond.`
              );
            }
          }
        } else if (targetType === 'bloodbank') {
          const match = request.matchedBloodBanks.find(b => b.callSid === CallSid);
          if (match) match.status = 'no_response';
        }
        await request.save();
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Status callback error:', error);
    res.sendStatus(200);
  }
});

module.exports = router;
