let selectedFilePath = null;
let selectedOutputDir = null;

// Function to collect current settings
function collectSettings() {
    return {
        width: document.getElementById('width').value,
        height: document.getElementById('height').value,
        fps: document.getElementById('fps').value,
        name: document.getElementById('name').value,
        option: document.getElementById('resize-option').value,
        removeBg: document.getElementById('remove-bg').checked,
        model: document.getElementById('model-select').value,
        processor: document.getElementById('processor-select').value,
        selectedFilePath: selectedFilePath,
        selectedOutputDir: selectedOutputDir
    };
}

// Function to apply settings to UI
function applySettings(settings) {
    document.getElementById('width').value = settings.width;
    document.getElementById('height').value = settings.height;
    document.getElementById('fps').value = settings.fps;
    document.getElementById('name').value = settings.name;
    document.getElementById('resize-option').value = settings.option;
    document.getElementById('remove-bg').checked = settings.removeBg;
    document.getElementById('model-select').value = settings.model;
    document.getElementById('processor-select').value = settings.processor;
    selectedFilePath = settings.selectedFilePath;
    selectedOutputDir = settings.selectedOutputDir;

    // Update status if paths are set
    if (selectedFilePath) {
        document.getElementById('status').textContent = `Selected file: ${selectedFilePath.split(/[\\/]/).pop()}`;
    }
    if (selectedOutputDir) {
        document.getElementById('status').textContent += ` | Output folder: ${selectedOutputDir}`;
    }

    // Trigger background removal checkbox change to show/hide options
    document.getElementById('remove-bg').dispatchEvent(new Event('change'));
}

function validateNumberInput(event) {
    const key = event.key;
    if (!/[0-9]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(key)) {
        event.preventDefault();
    }
}

document.getElementById('width').addEventListener('keydown', validateNumberInput);
document.getElementById('height').addEventListener('keydown', validateNumberInput);
document.getElementById('fps').addEventListener('keydown', validateNumberInput);

// Handle background removal checkbox
document.getElementById('remove-bg').addEventListener('change', (event) => {
    const bgOptions = document.getElementById('bg-options');
    bgOptions.style.display = event.target.checked ? 'block' : 'none';
});

document.getElementById('select-file').addEventListener('click', async () => {
    try {
        selectedFilePath = await window.electronAPI.selectFile();
        if (selectedFilePath) {
            const video = document.createElement('video');
            video.src = selectedFilePath;
            video.controls = true;
            document.getElementById('preview').innerHTML = '';
            document.getElementById('preview').appendChild(video);
            video.onloadedmetadata = function() {
                const fps = parseFloat(document.getElementById('fps').value) || 0;
                if (fps > 0) {
                    const duration = video.duration;
                    const estimatedFrames = Math.floor(duration * fps);
                    document.getElementById('status').textContent = `Selected file: ${selectedFilePath.split(/[\\/]/).pop()} | Duration: ${duration.toFixed(2)}s | Estimated: ${estimatedFrames} PNGs (with current FPS)`;
                } else {
                    document.getElementById('status').textContent = `Selected file: ${selectedFilePath.split(/[\\/]/).pop()} | Duration: ${video.duration.toFixed(2)}s`;
                }
            };
        }
    } catch (error) {
        console.error('Error selecting file:', error);
    }
});
document.getElementById('fps').addEventListener('input', () => {
    const fps = parseFloat(document.getElementById('fps').value) || 0;
    const video = document.querySelector('#preview video');
    if (video && video.duration && fps > 0) {
        const estimatedFrames = Math.floor(video.duration * fps);
        document.getElementById('status').textContent = `Selected file: ${selectedFilePath ? selectedFilePath.split(/[\\/]/).pop() : ''} | Duration: ${video.duration.toFixed(2)}s | Estimated: ${estimatedFrames} PNGs (with current FPS)`;
    }
});

document.getElementById('select-directory').addEventListener('click', async () => {
    try {
        selectedOutputDir = await window.electronAPI.selectDirectory();
        if (selectedOutputDir) {
            document.getElementById('status').textContent = `Selected output folder: ${selectedOutputDir}`;
        }
    } catch (error) {
        console.error('Error selecting directory:', error);
    }
});

window.electronAPI.onConversionProgress((event, percent) => {
    const progressBar = document.getElementById('progress-bar');
    progressBar.value = percent;
});

const convertBtn = document.getElementById('convert');

document.getElementById('convert').addEventListener('click', async () => {
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const name = document.getElementById('name').value;
    const fps = document.getElementById('fps').value;
    const option = document.getElementById('resize-option').value;
    const removeBg = document.getElementById('remove-bg').checked;
    const model = document.getElementById('model-select').value;
    const processor = document.getElementById('processor-select').value;

    if (!selectedFilePath || !selectedOutputDir || !width || !height || !name || !fps) {
        document.getElementById('status').textContent = 'Please fill in all fields and select a video and output directory.';
        return;
    }

    convertBtn.disabled = true;
    showSpinner();
    try {
        const result = await window.electronAPI.convertVideo({
            filePath: selectedFilePath,
            outputDir: selectedOutputDir,
            width: parseInt(width),
            height: parseInt(height),
            name,
            fps: parseInt(fps),
            option,
            removeBg,
            model,
            processor,
        });

        hideSpinner();
        convertBtn.disabled = false;
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = result.message;
        statusDiv.className = result.success ? 'success' : 'error';
    } catch (error) {
        hideSpinner();
        convertBtn.disabled = false;
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `Error: ${error}`;
        statusDiv.className = 'error';
    }
});

window.electronAPI.onFrameSaved?.((event, fileName) => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = `Frame saved: ${fileName}`;
    statusDiv.className = '';

    const framesPreview = document.getElementById('frames-preview');
    const img = document.createElement('img');
    img.src = `file://${selectedOutputDir.replace(/\\/g, '/')}/${fileName}`;
    img.title = fileName;
    framesPreview.appendChild(img);

    if (framesPreview.children.length > 10) {
        framesPreview.removeChild(framesPreview.firstChild);
    }
});

document.getElementById('min-btn').onclick = () => window.electronAPI.minimize();
document.getElementById('close-btn').onclick = () => {
    const settings = collectSettings();
    window.electronAPI.saveSettings(settings);
    window.electronAPI.close();
};
document.getElementById('fullscreen-btn').onclick = () => window.electronAPI.toggleFullscreen();
const fullscreenBtn = document.getElementById('fullscreen-btn');
window.addEventListener('resize', () => {
    if (window.innerHeight === screen.height) {
        fullscreenBtn.textContent = '🗗';
        fullscreenBtn.title = 'Exit fullscreen';
    } else {
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = 'Fullscreen';
    }
});

function showSpinner() {
    document.getElementById('status').innerHTML = `<span class="spinner"></span> Processing...`;
}
function hideSpinner() {
    document.getElementById('status').innerHTML = '';
}

// Listen for settings load
window.electronAPI.onLoadSettings((event, settings) => {
    applySettings(settings);
});
