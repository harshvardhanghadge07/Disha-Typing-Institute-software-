# DISHA Computer Typing Institute 🖥️⌨️

> A modern, full-stack Desktop & Web management software built for **DISHA Computer Typing Institute**. Includes interactive 3D graphics, batch & student management, fee tracking, multi-channel WhatsApp & Email notifications, and PIN-protected private document storage.

---

## 📸 Application Screenshots

### 🔑 1. Staff Login Screen (Interactive 3D PC Canvas & Password Reset)
![Staff Login Screen](docs/screenshots/login.png)

---

### 🏠 2. Institute Home Dashboard (Interactive 3D Typewriter & Key Statistics)
![Home Dashboard](docs/screenshots/home.png)

---

### 👥 3. Student & Batch Management (Fee Calculation & 1-Click WhatsApp)
![Student & Batch Management](docs/screenshots/students.png)

---

### 💬 4. WhatsApp & Email Notifications (Direct WhatsApp, Twilio API & SMTP Email)
![Notifications Screen](docs/screenshots/notifications.png)

---

### 🔐 5. Secure Private Documents (PIN Security Lock for Results & Certificates)
![Private Documents Lock](docs/screenshots/documents.png)

---

## ✨ Features

* **🎨 3D Interactive UI**: Powered by React + Three.js featuring retro computer hardware & typewriter 3D canvases.
* **🎓 Student & Batch Management**: Manage 6-month typing batches (English/Marathi 30, 40, 50 WPM), track timing, and calculate fees automatically.
* **📱 Multi-Channel Notifications**:
  * **1-Click Direct WhatsApp (`wa.me`)**: Open WhatsApp Web or Desktop pre-filled with student fee reminders directly from institute phone (`+918421535753`).
  * **Twilio WhatsApp API**: Send automated WhatsApp notifications via backend API.
  * **SMTP Email**: Send email reminders & password reset links via Gmail SMTP (`dishacomputertypinginst@gmail.com`).
* **🔒 Private Documents PIN Vault**: Encrypted PDF document vault for student exam results & government certificates, secured behind a 6-digit Security PIN.
* **🖥️ Cross-Platform Windows App**: Bundled as a standalone Windows Desktop Application (`.exe`) via Electron with embedded Node engine — no local dependencies required.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite, Three.js (3D Scenes), Vanilla CSS Design System
* **Backend**: Node.js, Express, MongoDB Atlas, Mongoose, JWT, Nodemailer, Twilio API
* **Desktop Runtime**: Electron 34, Electron-Builder (NSIS Windows Installer)

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18+ 
* MongoDB database (local or MongoDB Atlas Cloud)

### 1. Clone Repository
```bash
git clone https://github.com/harshvardhanghadge07/Disha-Typing-Institute-software-.git
cd Disha-Typing-Institute-software-
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```
Fill in your configuration keys (`MONGO_URI`, `SMTP_PASS`, `TWILIO_ACCOUNT_SID`, etc.).

### 3. Install Dependencies & Run Development Server
```bash
# Install root, backend and frontend dependencies
npm run install:all

# Run backend & frontend concurrently
npm run dev:backend   # Backend running on http://localhost:5000
npm run dev:frontend  # Frontend running on http://localhost:5173
```

---

## 📦 Building Standalone Windows Desktop Installer (.exe)

To package the desktop application installer for distribution to any Windows PC:

```bash
npm run build
```
The installer executable will be generated in:
`dist-electron/DISHA Typing Institute Setup 1.0.0.exe`

---

## 📜 License
Copyright © 2026 DISHA Computer Typing Institute. All rights reserved.
