const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (name, content) => ipcRenderer.invoke("dialog:save", { name, content }),
  saveFileTo: (path, content) => ipcRenderer.invoke("file:write", { path, content }),
  openFile: () => ipcRenderer.invoke("dialog:open")
});
