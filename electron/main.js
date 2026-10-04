'use strict';
const { app, BrowserWindow, shell, dialog, Tray, Menu, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// ── paths ────────────────────────────────────────────────────────────────────
const isDev   = !app.isPackaged;
const ROOT    = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'app');
const BACKEND = path.join(ROOT, 'backend');
const DIST    = path.join(ROOT, 'frontend', 'dist');
const ICON    = path.join(__dirname, 'assets', 'icon.png');
const PORT    = 5000;

let win, tray, serverProc;

let serverLogs = [];

// ── start Express backend ────────────────────────────────────────────────────
async function startServer() {
  const envFile = path.join(BACKEND, '.env');
  const envExample = path.join(BACKEND, '.env.example');
  if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
  }

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }

  process.env.PORT = String(PORT);
  process.env.ELECTRON = '1';

  const backendIndex = path.join(BACKEND, 'index.js').replace(/\\/g, '/');
  const fileUrl = backendIndex.startsWith('/') ? `file://${backendIndex}` : `file:///${backendIndex}`;

  console.log('[main] Direct loading backend:', fileUrl);
  await import(fileUrl);
}

// ── poll until backend is ready ──────────────────────────────────────────────
function waitForServer(retries = 60) {
  const url = `http://127.0.0.1:${PORT}/api/batches`;
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get(url, res => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (n <= 0) return reject(new Error('Backend server failed to start in time.'));
        setTimeout(() => attempt(n - 1), 500);
      });
      req.setTimeout(1000, () => req.destroy());
    };
    attempt(retries);
  });
}

// ── create window ─────────────────────────────────────────────────────────────
async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    icon: ICON,
    title: 'DISHA Typing Institute',
    backgroundColor: '#0f1724',
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Show a loading page while server boots
  const loadingHtml = `data:text/html,
    <html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#0f1724;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;color:#00d4ff}
      .logo{font-size:48px;font-weight:900;letter-spacing:4px;text-shadow:0 0 30px #00d4ff80;margin-bottom:16px}
      .sub{font-size:14px;color:#6b7fa3;letter-spacing:2px;margin-bottom:40px}
      .bar{width:220px;height:3px;background:#1a2640;border-radius:4px;overflow:hidden}
      .fill{height:100%;background:linear-gradient(90deg,#00d4ff,#0099bb);border-radius:4px;animation:slide 1.4s ease-in-out infinite}
      @keyframes slide{0%{width:0%}50%{width:80%}100%{width:100%}}
    </style></head><body>
      <div class="logo">DISHA</div>
      <div class="sub">COMPUTER TYPING INSTITUTE</div>
      <div class="bar"><div class="fill"></div></div>
    </body></html>`;

  win.loadURL(loadingHtml);
  win.once('ready-to-show', () => win.show());

  try {
    await waitForServer();
    win.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    dialog.showErrorBox('Startup Error', 'Could not connect to the DISHA backend.\n\n' + err.message);
    app.quit();
  }

  // open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

// ── tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const img = nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('DISHA Typing Institute');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open DISHA', click: () => { if (win) win.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('double-click', () => { if (win) win.show(); });
}

// ── app lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createWindow();
  try {
    await startServer();
  } catch (err) {
    if (err.code === 'EADDRINUSE' || err.message?.includes('EADDRINUSE')) {
      console.log('[main] Port 5000 is already active.');
    } else {
      console.error('Backend error:', err);
      dialog.showErrorBox('Backend Startup Error', err.stack || err.message);
    }
  }
  createTray();
});

app.on('window-all-closed', () => {
  // keep running in system tray on Windows
  if (process.platform !== 'darwin') return;
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (serverProc) {
    serverProc.kill();
    serverProc = null;
  }
});
