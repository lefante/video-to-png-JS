const { createFFmpeg } = require('ffmpeg.wasm');

const ffmpeg = createFFmpeg({ log: true });

module.exports = ffmpeg;