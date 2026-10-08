# 📱 DISHA Typing Institute — Mobile Download & Setup Guide

This guide explains how to run, install, and download **DISHA Computer Typing Institute** management software on mobile phones (Android & iOS).

---

## 🚀 Option 1: Native Android App (.APK File Build)

The project includes **Capacitor** integration, which compiles the full 3D React application into a standalone native Android project located in `frontend/android/`.

### Prerequisites for building APK:
1. **Android Studio** (Download from [developer.android.com](https://developer.android.com/studio))
2. **Java Development Kit (JDK 17 or higher)**

### Step-by-Step APK Generation:

1. **Build Frontend & Sync Assets**:
   ```bash
   npm run build:mobile
   ```

2. **Open Android Studio**:
   ```bash
   npm run cap:open:android
   ```
   *(Or manually open the folder `frontend/android` inside Android Studio).*

3. **Build APK File**:
   - In Android Studio, click **Build** in the top toolbar.
   - Select **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   - Once compiled, Android Studio will output `app-debug.apk` in:  
     `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

4. **Install on Android Mobile**:
   - Transfer `app-debug.apk` to your Android phone via WhatsApp / USB / Google Drive.
   - Tap to install.

---

## 📱 Option 2: PWA Mobile Browser Direct Installation (No Android Studio required!)

You can install DISHA directly on any Android phone (Chrome) or iPhone (Safari) without building APK files:

### On Android (Chrome / Edge / Brave):
1. Open your mobile browser and navigate to the hosted DISHA website (e.g., `http://<YOUR_PC_IP>:5000` or hosted Cloud URL).
2. Tap the **"📱 Install DISHA Mobile App"** banner at the top, or tap browser menu **⋮** -> **"Install App"** / **"Add to Home Screen"**.
3. The DISHA app icon will appear directly on your smartphone home screen and app drawer!

### On iOS / iPhone (Safari):
1. Open Safari and go to your DISHA application URL.
2. Tap the **Share button** (square with up arrow).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm by tapping **Add**.

---

## 🌐 Connecting Mobile App to your Backend Server

Since mobile devices run independently of your desktop PC:

1. Connect your phone and PC to the same Wi-Fi network.
2. Find your PC's IP address (Run `ipconfig` on Windows CMD/PowerShell, e.g. `192.168.1.100`).
3. Inside the mobile app or PWA, tap **⚙️ Mobile Server IP** in the top navigation bar.
4. Enter `http://192.168.1.100:5000` (or your production cloud server URL) and tap **Save Connection**.
5. The mobile app will seamlessly display all students, fee records, 6-month typing batches, and private documents vault!
