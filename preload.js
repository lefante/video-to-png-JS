const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: () => ipcRenderer.invoke('select-file'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    convertVideo: (options) => ipcRenderer.invoke('convert-video', options),
    onConversionProgress: (callback) => ipcRenderer.on('conversion-progress', callback),
});