// Twilio Service - OTP, Voice Calls, SMS
// Works in demo mode if Twilio credentials are not configured

let twilioClient = null;

const initTwilio = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN &&
      TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid') {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio client initialized');
      return true;
    } catch (err) {
      console.log('⚠️  Twilio init failed, running in demo mode');
      return false;
    }
  }
  console.log('⚠️  Twilio credentials not configured, running in demo mode');
  return false;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS
const sendOTP = async (phone, otp) => {
  if (twilioClient) {
    try {
      await twilioClient.messages.create({
        body: `Your RedThread verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      return { success: true, message: 'OTP sent via SMS' };
    } catch (error) {
      console.error('Twilio SMS error:', error.message);
      return { success: false, message: error.message, demoOtp: otp };
    }
  }
  // Demo mode - return OTP in response
  console.log(`📱 DEMO OTP for ${phone}: ${otp}`);
  return { success: true, message: 'Demo mode - OTP logged to console', demoOtp: otp };
};

// Make voice call to donor/blood bank
const makeVoiceCall = async (phone, requestId, bloodGroup, targetType = 'donor') => {
  if (twilioClient) {
    try {
      const twimlUrl = `${process.env.BASE_URL}/api/twilio/voice-twiml?requestId=${requestId}&bloodGroup=${bloodGroup}&targetType=${targetType}`;
      const statusCallback = `${process.env.BASE_URL}/api/twilio/status-callback?requestId=${requestId}&targetType=${targetType}`;

      const call = await twilioClient.calls.create({
        url: twimlUrl,
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: statusCallback,
        statusCallbackEvent: ['completed'],
        timeout: 30,
      });
      return { success: true, callSid: call.sid };
    } catch (error) {
      console.error('Twilio call error:', error.message);
      return { success: false, message: error.message };
    }
  }
  console.log(`📞 DEMO CALL to ${phone} for request ${requestId} (${bloodGroup})`);
  return { success: true, callSid: `demo_${Date.now()}`, demo: true };
};

// Send SMS notification
const sendSMS = async (phone, message) => {
  if (twilioClient) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      return { success: true };
    } catch (error) {
      console.error('Twilio SMS error:', error.message);
      return { success: false, message: error.message };
    }
  }
  console.log(`📨 DEMO SMS to ${phone}: ${message}`);
  return { success: true, demo: true };
};

module.exports = {
  initTwilio,
  generateOTP,
  sendOTP,
  makeVoiceCall,
  sendSMS,
};
