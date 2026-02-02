const { app, BrowserWindow, nativeImage, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable Electron security warnings during development to reduce console noise.
// IMPORTANT: keep this disabled in production — use only when `NODE_ENV !== 'production'`.
if (process.env.NODE_ENV !== 'production') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

function loadIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  try {
    // Try native path first (works if icon is a real image file)
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img;
  } catch (e) {}

  try {
    // Fallback: read as text (data URL) and create image
    const data = fs.readFileSync(iconPath, 'utf8').trim();
    if (data.startsWith('data:')) return nativeImage.createFromDataURL(data);
  } catch (e) {}

  return undefined;
}

function createWindow() {
  const icon = loadIcon();

  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: icon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the local index.html so the app runs fully offline
  win.loadFile('index.html');
  // Auto-open DevTools during development to help debug freezes (remove in production)
  // Only open DevTools during development (when app is not packaged)
  if (!app.isPackaged) {
    try { win.webContents.openDevTools({ mode: 'detach' }); } catch (e) {}
  }
}

// IPC handler to initiate printing from renderer. Uses native print dialog
// (avoids Chrome print-preview issues in some packaged builds).
ipcMain.handle('print', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const wc = win.webContents;

    // Try native print first (shows system dialog when supported)
    try {
      await new Promise((resolve, reject) => {
        wc.print({ silent: false, printBackground: true }, (success, failureReason) => {
          if (success) resolve(true);
          else reject(new Error(failureReason || 'Unknown print error'));
        });
      });
      return { ok: true };
    } catch (printErr) {
      // If print preview isn't available (packaged apps sometimes hit this),
      // fall back to generating a PDF and opening it for the user to print.
      try {
        const pdfData = await wc.printToPDF({ printBackground: true, pageSize: 'A4', marginsType: 1 });
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        const outPath = path.join(os.tmpdir(), `recordhub_list_${Date.now()}.pdf`);
        fs.writeFileSync(outPath, pdfData);
        const openResult = await shell.openPath(outPath);
        // shell.openPath returns an empty string on success
        if (openResult === '') return { ok: false, pdfPath: outPath, opened: true };
        return { ok: false, pdfPath: outPath, opened: false, openError: openResult };
      } catch (pdfErr) {
        return { ok: false, error: String(pdfErr) };
      }
    }
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// Print arbitrary HTML content silently to the default printer (best-effort).
// Accepts an HTML string from the renderer, loads it into a hidden BrowserWindow,
// attempts silent printing, and falls back to generating/opening a PDF when needed.
ipcMain.handle('print-data', async (event, html) => {
  try {
    const { BrowserWindow } = require('electron');
    const win = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: { contextIsolation: true }
    });

    // Load the supplied HTML as a data URL
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    const wc = win.webContents;

    // Try silent print (send directly to default printer)
    const silentPrintResult = await new Promise((resolve) => {
      try {
        wc.print({ silent: true, printBackground: true }, (success, failureReason) => {
          resolve({ success, failureReason });
        });
      } catch (err) {
        resolve({ success: false, failureReason: String(err) });
      }
    });

    if (silentPrintResult.success) {
      try { win.close(); } catch (e) {}
      return { ok: true, silent: true };
    }

    // Silent print failed — fall back to PDF generation and open it for user printing
    try {
      const pdfData = await wc.printToPDF({ printBackground: true, pageSize: 'A4', marginsType: 1 });
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const outPath = path.join(os.tmpdir(), `recordhub_list_${Date.now()}.pdf`);
      fs.writeFileSync(outPath, pdfData);
      const openResult = await shell.openPath(outPath);
      try { win.close(); } catch (e) {}
      if (openResult === '') return { ok: false, pdfPath: outPath, opened: true, reason: silentPrintResult.failureReason };
      return { ok: false, pdfPath: outPath, opened: false, openError: openResult, reason: silentPrintResult.failureReason };
    } catch (pdfErr) {
      try { win.close(); } catch (e) {}
      return { ok: false, error: String(pdfErr), reason: silentPrintResult.failureReason };
    }
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// Save arbitrary binary file (e.g., generated XLSX) from renderer.
ipcMain.handle('save-file', async (event, { data, filename }) => {
  try {
    const { dialog, BrowserWindow } = require('electron');
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showSaveDialog(win, {
      defaultPath: filename || 'export.xlsx',
      filters: [ { name: 'Excel', extensions: ['xlsx'] }, { name: 'All Files', extensions: ['*'] } ]
    });
    if (res.canceled) return { canceled: true };
    const outPath = res.filePath;
    // `data` may be an ArrayBuffer or a Uint8Array; convert to Buffer
    let buf;
    if (data && data.buffer && data.byteLength !== undefined) {
      // Uint8Array or similar
      buf = Buffer.from(data);
    } else if (data && data instanceof ArrayBuffer) {
      buf = Buffer.from(new Uint8Array(data));
    } else {
      // Fallback: try to coerce
      buf = Buffer.from(data);
    }
    const fs = require('fs');
    fs.writeFileSync(outPath, buf);
    return { canceled: false, path: outPath };
  } catch (err) {
    return { canceled: true, error: String(err) };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
