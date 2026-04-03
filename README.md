# 🩸 RedThread - Intelligent Blood Donation Platform

RedThread is a comprehensive web application designed to connect blood donors, hospitals, and blood banks during emergencies. It uses intelligent matching algorithms, real-time notifications, AI-powered calling, and blockchain-based transparency to save lives.

---

## ✨ Features

### 🤖 AI-Powered Emergency System
- AI calls donors automatically using intelligent voice calling  
- Filters donors based on blood group compatibility and availability  
- Prioritizes nearby donors using location-based matching  
- Dynamically increases search radius if no donors respond  
- If time is critical or no donors are found, automatically notifies blood banks  

### 👤 For Donors
- Register with blood group and location  
- Receive emergency blood requests via SMS/push notifications and AI calls  
- Accept/reject requests with one click  
- Track donation history and earn reward points  
- View nearby hospitals on interactive map  
- Reliability score based on responsiveness  

### 🏥 For Hospitals
- Create emergency blood requests with urgency levels  
- Automatic donor matching based on compatibility and distance  
- Real-time tracking of donor responses  
- View nearby donors on live map  
- Fallback to blood banks if donors insufficient  
- Blockchain-verified donation records  

### 🏪 For Blood Banks
- Manage blood inventory in real-time  
- Receive requests from hospitals and AI escalation system  
- Track dispatched units  
- Update stock levels  

### 👑 For Admins
- Verify hospitals and blood banks  
- Monitor all requests and donations  
- View system analytics  
- Detect suspicious activity  
- Access blockchain ledger  

---

## 🚀 Tech Stack

### Frontend
- React 18  
- Material-UI v5  
- Framer Motion  
- React Leaflet / Google Maps  
- Socket.IO Client  
- Axios  
- React Hot Toast  

### Backend
- Node.js / Express  
- PostgreSQL with Sequelize  
- JWT Authentication  
- Socket.IO  
- Twilio (SMS & Voice Calling)  
- Winston  
- Custom Blockchain Ledger  

---

## 📋 Prerequisites

- Node.js (v18 or higher)  
- npm or yarn  
- PostgreSQL (v14 or higher)  
- Git  

---

## 🔧 Installation

```bash
git clone https://github.com/yourusername/redthread.git
cd redthread
npm install
npm start
```
