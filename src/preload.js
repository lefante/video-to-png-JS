const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: () => ipcRenderer.invoke('select-file'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    convertVideo: (options) => ipcRenderer.invoke('convert-video', options),
    onConversionProgress: (callback) => ipcRenderer.on('conversion-progress', callback),
    onFrameSaved: (callback) => ipcRenderer.on('frame-saved', callback),
    onLoadSettings: (callback) => ipcRenderer.on('load-settings', callback),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
});
