// Twilio Service - OTP, Voice Calls, SMS
// Works in demo mode if Twilio credentials are not configured

let twilioClient = null;

const initTwilio = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN &&
    TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid' &&
    TWILIO_ACCOUNT_SID.startsWith('AC')) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio client initialized');
      return true;
    } catch (err) {
      console.log('⚠️  Twilio init failed:', err.message);
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
      const msg = await twilioClient.messages.create({
        body: `Your RedThread verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`📱 OTP SMS sent to ${phone}, SID: ${msg.sid}`);
      return { success: true, message: 'OTP sent via SMS' };
    } catch (error) {
      console.error('❌ Twilio SMS error:', error.message);
      console.error('   Code:', error.code, '| Status:', error.status);
      // Still return OTP so the user can use it (fallback for trial account limitations)
      return { success: true, message: `SMS failed (${error.message}), use demo OTP`, demoOtp: otp };
    }
  }
  // Demo mode - return OTP in response
  console.log(`📱 DEMO OTP for ${phone}: ${otp}`);
  return { success: true, message: 'Demo mode - OTP shown below', demoOtp: otp };
};

// Make voice call to donor/blood bank
const makeVoiceCall = async (phone, requestId, bloodGroup, targetType = 'donor') => {
  if (twilioClient) {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

      // For voice calls, if BASE_URL is localhost, use TwiML directly instead of a URL
      let callOptions = {
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        timeout: 30,
      };

      if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        // Localhost can't be reached by Twilio - use inline TwiML
        let message = '';
        if (targetType === 'bloodbank') {
          message = `This is an emergency blood request from Red Thread platform. Blood group ${bloodGroup} is urgently needed. Please log in to the platform to respond.`;
        } else {
          message = `This is an emergency blood donation request from Red Thread platform. Blood group ${bloodGroup} is urgently needed. Please log in to the platform to accept or reject this request.`;
        }
        callOptions.twiml = `<Response><Say voice="alice">${message}</Say></Response>`;
        console.log(`📞 Making Twilio call to ${phone} (inline TwiML, localhost mode)`);
      } else {
        // Production mode - use webhook URLs
        const twimlUrl = `${baseUrl}/api/twilio/voice-twiml?requestId=${requestId}&bloodGroup=${bloodGroup}&targetType=${targetType}`;
        const statusCallback = `${baseUrl}/api/twilio/status-callback?requestId=${requestId}&targetType=${targetType}`;
        callOptions.url = twimlUrl;
        callOptions.statusCallback = statusCallback;
        callOptions.statusCallbackEvent = ['completed'];
        console.log(`📞 Making Twilio call to ${phone} (webhook mode)`);
      }

      const call = await twilioClient.calls.create(callOptions);
      console.log(`✅ Call initiated, SID: ${call.sid}`);
      return { success: true, callSid: call.sid };
    } catch (error) {
      console.error('❌ Twilio call error:', error.message);
      console.error('   Code:', error.code, '| Status:', error.status);
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
      const msg = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`📨 SMS sent to ${phone}, SID: ${msg.sid}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Twilio SMS error:', error.message);
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
