const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

/* Пути, которые пользователь явно выбрал в диалоге. Прямая запись разрешена
   только в них, чтобы плагин не мог молча перезаписать произвольный файл. */
const approvedPaths = new Set();
const absolute = p => {
  try { return path.resolve(String(p)); } catch { return null; }
};

function createWindow() {
  const w = new BrowserWindow({
    width: 1440,
    height: 920,
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  w.setMenuBarVisibility(false);
  w.loadFile(path.join(__dirname, "eMake-and-Draw.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ========== Сохранение файла через диалог ========== */
ipcMain.handle("dialog:save", async (e, arg) => {
  try {
    const { name, content } = arg || {};
    if (typeof content !== "string") return null;
    const r = await dialog.showSaveDialog({
      defaultPath: name || "project.emdraw",
      filters: [
        { name: "eMake&Draw", extensions: ["emdraw", "empl", "html"] },
        { name: "Все файлы", extensions: ["*"] }
      ]
    });
    if (!r || r.canceled || typeof r.filePath !== "string" || !r.filePath) return null;
    const filePath = absolute(r.filePath);
    if (!filePath) return null;
    fs.writeFileSync(filePath, content, "utf8");
    approvedPaths.add(filePath);
    return filePath;
  } catch (err) {
    console.error("dialog:save →", err);
    return null;
  }
});

/* ========== Перезапись уже открытого/сохранённого файла ========== */
ipcMain.handle("file:write", async (e, arg) => {
  try {
    const { path: rawPath, content } = arg || {};
    if (typeof content !== "string" || typeof rawPath !== "string") {
      return { ok: false, reason: "bad-args" };
    }
    const filePath = absolute(rawPath);
    if (!filePath || !approvedPaths.has(filePath)) {
      return { ok: false, reason: "unknown-path" };
    }
    fs.writeFileSync(filePath, content, "utf8");
    return { ok: true, path: filePath };
  } catch (err) {
    console.error("file:write →", err);
    return { ok: false, reason: err.message };
  }
});

/* ========== Открытие файла через диалог ========== */
ipcMain.handle("dialog:open", async () => {
  try {
    const r = await dialog.showOpenDialog({
      filters: [
        { name: "eMake&Draw", extensions: ["emdraw", "json", "empl"] },
        { name: "Все файлы", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    // Диалог отменён или файл не выбран — это не ошибка, возвращаем null
    if (!r || r.canceled || !Array.isArray(r.filePaths) || r.filePaths.length === 0) return null;
    const filePath = absolute(r.filePaths[0]);
    if (!filePath || !fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    approvedPaths.add(filePath);
    return { name: path.basename(filePath), content, path: filePath };
  } catch (err) {
    console.error("dialog:open →", err);
    return null;
  }
});
