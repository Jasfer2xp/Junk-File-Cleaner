const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow = null;
let backendProcess = null;

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
  });
  backendProcess.on("error", (err) =>
    console.error("Failed to start backend:", err.message)
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0f0f1a",
    title: "Junk File Cleaner",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

app.whenReady().then(() => {
  startBackend();

  // Give backend a moment to start before loading the UI
  const delay = app.isPackaged ? 3000 : 2000;
  setTimeout(createWindow, delay);

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
