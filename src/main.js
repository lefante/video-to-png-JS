const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 650,
        minWidth: 380,
        minHeight: 540,
        frame: false,
        resizable: true,
        alwaysOnTop: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.on('closed', () => mainWindow = null);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

app.on('browser-window-created', (_, win) => {
    win.setMenu(null);
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Videos', extensions: ['mp4', 'avi', 'mkv'] }],
    });
    return result.filePaths[0];
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    return result.filePaths[0];
});

ipcMain.handle('convert-video', async (event, { filePath, outputDir, width, height, name, fps, option }) => {
    try {
        const ffmpeg = createFFmpeg({ log: true });
        await ffmpeg.load();

        const inputFile = await fetchFile(filePath);
        ffmpeg.FS('writeFile', 'input.mp4', inputFile);

        const outputPath = 'output';
        ffmpeg.FS('mkdir', outputPath);

        let resizeFilter = `scale=${width}:${height}`;
        if (option === 'Maintain Aspect Ratio with Borders') {
            resizeFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
        } else if (option === 'Resize with Fixed Aspect Ratio') {
            resizeFilter = `scale=${width}:-1`;
        }

        let totalFrames = 0;
        try {
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-vf', `fps=${fps}`,
                '-map', '0:v:0',
                '-c', 'copy',
                '-f', 'null', '-'
            );
        } catch {}

        const args = [
            '-i', 'input.mp4',
            '-vf', `fps=${fps},${resizeFilter}`,
            '-start_number', '0',
            `${outputPath}/${name}-%d.png`
        ];

        let lastCount = 0;
        let estimatedTotal = 0;
        ffmpeg.setLogger(({ type, message }) => {
            if (type === 'fferr' && message.includes('frame=')) {
                const match = message.match(/frame=\s*(\d+)/);
                if (match) estimatedTotal = Math.max(estimatedTotal, parseInt(match[1]));
            }
        });

        ffmpeg.setProgress(() => {
            try {
                const files = ffmpeg.FS('readdir', outputPath);
                const newFiles = files
                    .filter(f => f.startsWith(name) && f.endsWith('.png'))
                    .sort((a, b) => {
                        const aMatch = a.match(/(\d+)\.png$/);
                        const bMatch = b.match(/(\d+)\.png$/);
                        const na = aMatch ? parseInt(aMatch[1], 10) : 0;
                        const nb = bMatch ? parseInt(bMatch[1], 10) : 0;
                        return na - nb;
                    });
                if (newFiles.length > lastCount) {
                    for (let i = lastCount; i < newFiles.length; i++) {
                        const file = newFiles[i];
                        const data = ffmpeg.FS('readFile', `${outputPath}/${file}`);
                        fs.writeFileSync(path.join(outputDir, file), data);
                        mainWindow.webContents.send('frame-saved', file);
                    }
                    lastCount = newFiles.length;
                }
                const percent = estimatedTotal > 0
                    ? Math.round((lastCount / estimatedTotal) * 100)
                    : Math.round((lastCount / 100) * 100);
                mainWindow.webContents.send('conversion-progress', percent);
            } catch (e) {}
        });

        await ffmpeg.run(...args);

        mainWindow.webContents.send('conversion-progress', 100);
        return { success: true, message: 'Conversion complete!' };
    } catch (error) {
        return { success: false, message: `Error: ${error.message}` };
    }
});

ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});
ipcMain.on('window-toggle-fullscreen', () => {
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
});