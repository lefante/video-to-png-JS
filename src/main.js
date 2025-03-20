const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
        },
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

        const outputPath = 'output'; // Diretório temporário no FS
        ffmpeg.FS('mkdir', outputPath);

        let resizeFilter = `scale=${width}:${height}`; // Force Resize (padrão)

        if (option === 'Maintain Aspect Ratio with Borders') {
            resizeFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
        } else if (option === 'Resize with Fixed Aspect Ratio') {
            resizeFilter = `scale=${width}:-1`; // Mantém a proporção e ajusta a altura automaticamente
        }

        const args = [
            '-i', 'input.mp4',
            '-vf', `fps=${fps},${resizeFilter}`,
            `${outputPath}/${name}-%04d.png`
        ];

        ffmpeg.setProgress(({ ratio }) => {
            const percent = Math.round(ratio * 100);
            mainWindow.webContents.send('conversion-progress', percent);
        });

        await ffmpeg.run(...args);

        const files = ffmpeg.FS('readdir', outputPath);
        for (const file of files) {
            if (file.startsWith(name)) {
                const data = ffmpeg.FS('readFile', `${outputPath}/${file}`);
                fs.writeFileSync(path.join(outputDir, file), data);
            }
        }

        return { success: true, message: 'Conversion complete!' };
    } catch (error) {
        return { success: false, message: `Error: ${error.message}` };
    }
});