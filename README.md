# DISHA Computer Typing Institute – Desktop Software Application 🖥️⌨️

> Standalone Windows Desktop Application built for **DISHA Computer Typing Institute**. Features an interactive 3D user interface, batch & student fee management, multi-channel WhatsApp & Email notifications, and PIN-protected private document storage.

---

## 📸 Application Screenshots

### 🔑 1. Staff Login Screen
![Staff Login Screen](https://raw.githubusercontent.com/harshvardhanghadge07/Disha-Typing-Institute-software-/main/docs/screenshots/login.png)

---

### 🏠 2. Institute Dashboard
![Home Dashboard](https://raw.githubusercontent.com/harshvardhanghadge07/Disha-Typing-Institute-software-/main/docs/screenshots/home.png)

---

### 👥 3. Student & Batch Management
![Student & Batch Management](https://raw.githubusercontent.com/harshvardhanghadge07/Disha-Typing-Institute-software-/main/docs/screenshots/students.png)

---

### 💬 4. WhatsApp & Email Notifications
![Notifications Screen](https://raw.githubusercontent.com/harshvardhanghadge07/Disha-Typing-Institute-software-/main/docs/screenshots/notifications.png)

---

### 🔐 5. Secure Private Documents Vault
![Private Documents Lock](https://raw.githubusercontent.com/harshvardhanghadge07/Disha-Typing-Institute-software-/main/docs/screenshots/documents.png)

---

## ✨ Application Features

* **🎨 Interactive 3D Interface**: Built with Three.js rendering retro computer hardware & typewriter 3D canvases.
* **🎓 Student & Batch Management**: Manage 6-month typing batches (English/Marathi 30, 40, 50 WPM), track practice timings, and calculate fees automatically.
* **📱 WhatsApp & Email Notifications**:
  * **1-Click Direct WhatsApp (`wa.me`)**: Open WhatsApp Desktop/Web pre-filled with fee reminders directly from institute phone (`+918421535753`).
  * **Twilio WhatsApp API**: Automated backend WhatsApp messaging.
  * **SMTP Email**: Send email reminders & password reset links via Gmail SMTP.
* **🔒 Private Documents Vault**: Encrypted storage for student exam results & government certificates, secured behind a 6-digit Security PIN.
* **🖥️ Standalone Windows Desktop Executable**: Runs as a desktop software app with built-in runtime — no local dependencies required on target PCs.
* **📱 Mobile App & PWA Support**: Install directly on Android/iOS mobile devices as a PWA app or compile native `.apk` files using Capacitor.

---

## 📦 How to Download & Install

### 🖥️ Desktop (Windows)
1. Download the Windows installer: `DISHA Typing Institute Setup 1.0.0.exe`
2. Double-click the installer to install the software on your Windows PC.
3. Open **DISHA Typing Institute** from your Desktop or Start Menu.

### 📱 Mobile (Android & iOS)
- **Direct PWA Installation**: Open the application URL on your mobile phone browser (Chrome/Safari) and tap **"📱 Install DISHA Mobile App"**.
- **Android APK Build**: See our step-by-step [Mobile Guide](docs/MOBILE_GUIDE.md) for generating native Android `.apk` installers.

---

## 🛠️ Building Desktop & Mobile Apps from Source

### 1. Build Windows Desktop Installer (.exe)
```bash
# Install dependencies
npm run install:all

# Build Windows Installer (.exe)
npm run build
```
Installer output: `dist-electron/DISHA Typing Institute Setup 1.0.0.exe`

### 2. Build Mobile App (.apk) & Sync Capacitor
```bash
# Build frontend & sync Capacitor Android project
npm run build:mobile

# Open in Android Studio to build APK file
npm run cap:open:android
```
For detailed instructions, see [`docs/MOBILE_GUIDE.md`](docs/MOBILE_GUIDE.md).

---

## 📜 License
Copyright © 2026 DISHA Computer Typing Institute. All rights reserved.

