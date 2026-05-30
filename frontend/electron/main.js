const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");
const http = require("http");

let mainWindow = null;
let backendProcess = null;
const apiToken = crypto.randomBytes(32).toString("hex");
process.env.JUNK_CLEANER_API_TOKEN = apiToken;

// Always load from built files unless explicitly in CRA dev mode
const isReactDevServer = process.env.REACT_DEV === "true";

function startBackend() {
  // Try to find the backend exe relative to the app
  let backendExe;

  if (app.isPackaged) {
    // Packaged installer: backend is in resources/
    backendExe = path.join(process.resourcesPath, "backend", "JunkCleaner.API.exe");
  } else {
    // Dev: use dotnet run
    const backendDir = path.join(__dirname, "..", "..", "backend", "JunkCleaner.API");
    backendProcess = spawn("dotnet", ["run", "--project", backendDir], {
      stdio: "ignore",
      detached: false,
      windowsHide: true,
      cwd: backendDir,
      env: { ...process.env, JUNK_CLEANER_API_TOKEN: apiToken },
    });
    backendProcess.on("error", (err) =>
      console.error("Backend error:", err.message)
    );
    return;
  }

  backendProcess = spawn(backendExe, [], {
    stdio: "ignore",
    detached: false,
    windowsHide: true,
    cwd: path.dirname(backendExe),
    env: { ...process.env, JUNK_CLEANER_API_TOKEN: apiToken },
  });
  backendProcess.on("error", (err) =>
    console.error("Failed to start backend:", err.message)
  );
}

function waitForBackend(timeoutMs = 45000) {
  const started = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 5000,
          path: "/api/system/info",
          method: "GET",
          timeout: 1500,
          headers: { "X-JunkCleaner-Token": apiToken },
        },
        (res) => {
          res.resume();
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            retry();
          }
        }
      );

      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
      req.end();
    };

    const retry = () => {
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 500);
    };

    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0f0f1a",
    title: "Junk File Cleaner",
    icon: path.join(__dirname, "..", "public", "app-icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    autoHideMenuBar: true,          // hides the File/Edit/View menu bar
  });

  // Remove the default menu entirely
  mainWindow.setMenu(null);

  const startUrl = isReactDevServer
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "..", "build", "index.html")}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in the system browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startBackend();
  await waitForBackend();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) backendProcess.kill();
});
