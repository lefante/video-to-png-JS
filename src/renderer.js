let selectedFilePath = null;
let selectedOutputDir = null;

// Função para validar entrada numérica
function validateNumberInput(event) {
    const key = event.key;
    // Permite apenas números, Backspace e Delete
    if (!/[0-9]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(key)) {
        event.preventDefault();
    }
}

// Aplicar validação aos campos numéricos
document.getElementById('width').addEventListener('keydown', validateNumberInput);
document.getElementById('height').addEventListener('keydown', validateNumberInput);
document.getElementById('fps').addEventListener('keydown', validateNumberInput);

// Selecionar vídeo
document.getElementById('select-file').addEventListener('click', async () => {
    try {
        selectedFilePath = await window.electronAPI.selectFile();
        if (selectedFilePath) {
            const video = document.createElement('video');
            video.src = selectedFilePath;
            video.controls = true;
            document.getElementById('preview').innerHTML = ''; // Limpar prévia anterior
            document.getElementById('preview').appendChild(video);
        }
    } catch (error) {
        console.error('Error selecting file:', error);
    }
});

// Selecionar diretório de saída
document.getElementById('select-directory').addEventListener('click', async () => {
    try {
        selectedOutputDir = await window.electronAPI.selectDirectory();
        if (selectedOutputDir) {
            console.log('Selected Directory:', selectedOutputDir);
        }
    } catch (error) {
        console.error('Error selecting directory:', error);
    }
});

// Atualizar a barra de progresso
window.electronAPI.onConversionProgress((event, percent) => {
    const progressBar = document.getElementById('progress-bar');
    progressBar.value = percent;
});

// Converter vídeo
document.getElementById('convert').addEventListener('click', async () => {
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const name = document.getElementById('name').value;
    const fps = document.getElementById('fps').value;
    const option = document.getElementById('resize-option').value;

    if (!selectedFilePath || !selectedOutputDir || !width || !height || !name || !fps) {
        document.getElementById('status').textContent = 'Please fill in all fields and select a video and output directory.';
        return;
    }

    try {
        const result = await window.electronAPI.convertVideo({
            filePath: selectedFilePath,
            outputDir: selectedOutputDir,
            width: parseInt(width),
            height: parseInt(height),
            name,
            fps: parseInt(fps),
            option,
        });

        if (result.success) {
            document.getElementById('status').textContent = result.message;
        } else {
            document.getElementById('status').textContent = result.message;
        }
    } catch (error) {
        document.getElementById('status').textContent = `Error: ${error}`;
    }
});