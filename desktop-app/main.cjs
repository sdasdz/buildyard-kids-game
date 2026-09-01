const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, dialog, shell } = require("electron");

// Older integrated graphics drivers are the most common cause of Electron
// startup crashes on Windows 10. This game is 2D, so software rendering is a
// safe and predictable default.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("force-color-profile", "srgb");
app.setAppUserModelId("cn.buildyard.kids.game");

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

let mainWindow = null;
const isSmokeTest = process.env.BUILDYARD_SMOKE_TEST === "1";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#d5f1f7",
    title: "工程车创造营",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      spellcheck: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) event.preventDefault();
  });
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());

  mainWindow.once("ready-to-show", () => {
    if (isSmokeTest) return;
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
    dialog.showErrorBox("游戏没有打开", `游戏文件读取失败（${code}）：${description}`);
  });

  mainWindow.loadFile(path.join(__dirname, "app-dist", "index.html"));

  if (isSmokeTest) {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript(`(async () => {
          const loadImage = (src) => new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve({ ok: image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight, src: image.src });
            image.onerror = () => resolve({ ok: false, width: 0, height: 0, src: image.src });
            image.src = src;
          });
          const loadAudio = (src) => new Promise((resolve) => {
            const audio = new Audio(src);
            const timer = setTimeout(() => resolve({ ok: false, src: audio.src, reason: "timeout" }), 6000);
            audio.addEventListener("loadedmetadata", () => {
              clearTimeout(timer);
              resolve({ ok: Number.isFinite(audio.duration) && audio.duration > 0, duration: audio.duration, src: audio.src });
            }, { once: true });
            audio.addEventListener("error", () => {
              clearTimeout(timer);
              resolve({ ok: false, src: audio.src, reason: "load-error" });
            }, { once: true });
            audio.load();
          });
          const [wheel, gliderSeat, ski, seaplaneBody, audio] = await Promise.all([
            loadImage("./assets/canonical-v1/wheel.png"),
            loadImage("./assets/canonical-v1/gliderseat.png"),
            loadImage("./assets/canonical-v1/ski.png"),
            loadImage("./assets/canonical-v1/seaplanebody.png"),
            loadAudio("./audio/hint-drill.wav")
          ]);
          return {
            title: document.title,
            text: document.body.innerText.slice(0, 500),
            rootChildren: document.querySelector("#root")?.children.length || 0,
            wheel,
            gliderSeat,
            ski,
            seaplaneBody,
            audio
          };
        })()`);
        const ok = result.title === "工程车创造营"
          && result.text.includes("小小工程师")
          && result.rootChildren > 0
          && result.wheel.ok
          && result.gliderSeat.ok
          && result.ski.ok
          && result.seaplaneBody.ok
          && result.audio.ok;
        if (process.env.BUILDYARD_SMOKE_REPORT) {
          fs.writeFileSync(process.env.BUILDYARD_SMOKE_REPORT, JSON.stringify({ ok, ...result }, null, 2), "utf8");
        }
        process.stdout.write(`${JSON.stringify({ ok, ...result })}\n`);
        app.exit(ok ? 0 : 2);
      } catch (error) {
        if (process.env.BUILDYARD_SMOKE_REPORT) {
          fs.writeFileSync(process.env.BUILDYARD_SMOKE_REPORT, JSON.stringify({ ok: false, error: error.stack || String(error) }, null, 2), "utf8");
        }
        process.stderr.write(`${error.stack || error}\n`);
        app.exit(3);
      }
    });
  }
}

app.whenReady().then(createWindow);
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => app.quit());
app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
