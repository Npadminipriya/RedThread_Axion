# 🩸 RedThread – Intelligent Blood Donation Platform

A full-stack blood donation platform with AI matching, Twilio integration, blockchain verification, and admin verification system.

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS 3 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose) |
| **Auth** | JWT + OTP (Twilio) |
| **Notifications** | Twilio Voice + SMS |
| **Blockchain** | SHA256 Hash Simulation |

## 📁 Project Structure

```
redthread/
├── backend/
│   ├── config/          # Database config
│   ├── middleware/       # Auth, file upload
│   ├── models/          # Mongoose schemas (User, Donor, Hospital, BloodBank, Request, CoinTransaction)
│   ├── routes/          # API routes (auth, admin, donor, hospital, bloodbank, twilio)
│   ├── services/        # Twilio, matching, blockchain services
│   ├── uploads/         # Uploaded documents
│   ├── server.js        # Entry point
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, ProtectedRoute, Shared UI
│   │   ├── context/     # AuthContext
│   │   ├── pages/       # Landing, Login, Register, Dashboards
│   │   ├── services/    # API service (axios)
│   │   ├── App.jsx      # Router
│   │   ├── main.jsx     # Entry point
│   │   └── index.css    # Global styles + Tailwind
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and npm
- **MongoDB** running locally (or MongoDB Atlas URI)

### 1. Clone & Install

```bash
# Install backend dependencies
cd redthread/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Edit `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/redthread
JWT_SECRET=your_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid       # Optional for demo mode
TWILIO_AUTH_TOKEN=your_twilio_token       # Optional for demo mode
TWILIO_PHONE_NUMBER=+1234567890           # Optional for demo mode
BASE_URL=http://localhost:5000
PORT=5000
```

> 💡 **Demo Mode**: If Twilio credentials are not configured, the app runs in demo mode where OTPs are shown in the console/response.

### 3. Start the Application

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

### 4. Default Admin Login

```
Email: admin@redthread.com
Password: admin123
```

The admin account is auto-created on first server start.

## 👥 User Roles

| Role | Registration | Access |
|------|-------------|--------|
| **Donor** | Auto-approved | Immediate |
| **Hospital** | Requires admin approval | After approval |
| **Blood Bank** | Requires admin approval | After approval |
| **Admin** | Auto-seeded | Always |

## 🔄 Request Flow

```
1. Hospital creates blood request
2. AI matches compatible donors (blood group + location + availability)
3. Twilio calls matched donors + SMS backup
4. Donor accepts → Hospital notified, coins awarded, blockchain record created
5. If no donors respond → Request escalated to blood banks
6. Twilio calls matched blood banks
7. Blood bank confirms → Inventory updated, hospital notified
```

## 🪙 Coin System

| Action | Coins |
|--------|-------|
| Donation (normal blood) | +50 |
| Donation (rare blood: A-, B-, AB-, O-) | +100 |
| False acceptance penalty | -30 |

**Badges**: First Donor (1+), Silver Donor (5+), Gold Donor (10+)

## 📱 Twilio Setup

### Requirements
1. [Twilio Account](https://www.twilio.com/try-twilio)
2. A verified phone number
3. Twilio phone number with Voice + SMS capability

### Configuration
1. Get your Account SID and Auth Token from [Twilio Console](https://console.twilio.com)
2. Update `backend/.env` with your credentials
3. For voice calls to work, your backend must be publicly accessible (use [ngrok](https://ngrok.com) for local testing):

```bash
ngrok http 5000
# Update BASE_URL in .env to the ngrok URL
```

### Voice Call Flow
- Twilio calls donors/blood banks with IVR
- **Press 1** → Accept request
- **Press 2** → Reject request
- DTMF input captured via webhook, database updated automatically

## 🔗 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (multipart) |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/send-otp` | Send OTP via SMS |
| POST | `/api/auth/verify-otp` | Verify OTP + JWT |
| GET | `/api/auth/me` | Get current user |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/pending` | List pending verifications |
| PUT | `/api/admin/verify/:id` | Approve/Reject user |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/all-users` | List all users |

### Donor
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/donor/profile` | Get profile |
| PUT | `/api/donor/profile` | Update profile |
| PUT | `/api/donor/availability` | Toggle availability |
| GET | `/api/donor/requests` | Get matched requests |
| POST | `/api/donor/respond/:id` | Accept/Reject request |
| GET | `/api/donor/coins` | Coin balance + history |
| GET | `/api/donor/history` | Donation history |
| GET | `/api/donor/leaderboard` | Top donors |

### Hospital
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hospital/request` | Create blood request |
| GET | `/api/hospital/requests` | List requests |
| GET | `/api/hospital/request/:id` | Request details |
| POST | `/api/hospital/escalate/:id` | Escalate to blood banks |
| PUT | `/api/hospital/request/:id/fulfill` | Mark fulfilled |

### Blood Bank
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bloodbank/inventory` | Get inventory |
| PUT | `/api/bloodbank/inventory` | Update stock |
| GET | `/api/bloodbank/requests` | Get assigned requests |
| POST | `/api/bloodbank/respond/:id` | Accept/Reject |

### Twilio Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/twilio/voice-twiml` | TwiML for calls |
| POST | `/api/twilio/handle-keypress` | DTMF handler |
| POST | `/api/twilio/status-callback` | Call status |

## ⛓️ Blockchain Simulation

Each donation creates a SHA256 hash of the donation record:
- Donor ID, Request ID, Blood Group, Timestamp, and Random Nonce
- Hash stored in donor profile and request record
- "Blockchain Verified" badge displayed on UI

## 📄 License

MIT License – Built for hackathons 🚀
