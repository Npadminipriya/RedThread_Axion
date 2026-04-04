require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { initTwilio } = require('./services/twilioService');

const app = express();

// Connect Database
connectDB();

// Init Twilio
initTwilio();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/donor', require('./routes/donor'));
app.use('/api/hospital', require('./routes/hospital'));
app.use('/api/bloodbank', require('./routes/bloodbank'));
app.use('/api/twilio', require('./routes/twilio'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RedThread API is running 🩸' });
});

// Seed admin user
const seedAdmin = async () => {
  const User = require('./models/User');
  const existing = await User.findOne({ role: 'admin' });
  if (!existing) {
    await User.create({
      name: 'Admin',
      email: 'admin@redthread.com',
      phone: '+1000000000',
      password: 'admin123',
      role: 'admin',
      status: 'approved',
      isVerified: true,
      isPhoneVerified: true,
    });
    console.log('🔑 Default admin created: admin@redthread.com / admin123');
  }
};
seedAdmin().catch(console.error);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 RedThread API running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api/health`);
});
