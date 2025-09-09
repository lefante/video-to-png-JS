ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Video File",
        buttonLabel: "Select Video",
        properties: ["openFile"],
        filters: [{ name: "Videos", extensions: ["mp4", "avi", "mkv", "gif"] }],
    });
    return result.filePaths[0];
});

ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Output Directory", 
        buttonLabel: "Select Folder",
        properties: ["openDirectory"],
    });
    return result.filePaths[0];
});
