import { MediaMetadata, SupportedFormat, MediaType, KeyframeInfo } from '../types';

export async function inspectMediaFile(file: File): Promise<MediaMetadata> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let format: SupportedFormat = 'unknown';

  if (['mp4', 'm4v'].includes(ext)) format = 'mp4';
  else if (ext === 'mov') format = 'mov';
  else if (ext === 'webm') format = 'webm';
  else if (ext === 'mp3') format = 'mp3';
  else if (ext === 'wav') format = 'wav';
  else if (['aac', 'm4a'].includes(ext)) format = 'aac';
  else if (ext === 'ogg') format = 'ogg';

  const isVideo = ['mp4', 'mov', 'webm'].includes(format);
  const mediaType: MediaType = isVideo ? 'video' : 'audio';

  // 1. First probe: Fast O(1) header inspection for WAV or MP3
  let duration = 0;
  let bitrate = 0;
  let sampleRate = 44100;
  let channels = 2;
  const keyframes: KeyframeInfo[] = [];

  if (format === 'wav') {
    try {
      const headerBuffer = await file.slice(0, 128).arrayBuffer();
      const view = new DataView(headerBuffer);
      const riff = String.fromCharCode(...new Uint8Array(headerBuffer.slice(0, 4)));
      if (riff === 'RIFF') {
        channels = view.getUint16(22, true);
        sampleRate = view.getUint32(24, true);
        const byteRate = view.getUint32(28, true);
        const dataLength = file.size - 44;
        if (byteRate > 0) {
          duration = dataLength / byteRate;
          bitrate = byteRate * 8;
        }
      }
    } catch {
      // fallback to media element
    }
  } else if (format === 'mp3') {
    try {
      const probeBuffer = await file.slice(0, 1024 * 64).arrayBuffer();
      const bytes = new Uint8Array(probeBuffer);
      let offset = 0;

      // Skip ID3v2 if present
      if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) { // "ID3"
        const tagSize = ((bytes[6] & 0x7f) << 21) |
                        ((bytes[7] & 0x7f) << 14) |
                        ((bytes[8] & 0x7f) << 7) |
                        (bytes[9] & 0x7f);
        offset = 10 + tagSize;
      }

      // Find MPEG sync frame (0xFF followed by 0xE0 mask)
      for (let i = offset; i < bytes.length - 4; i++) {
        if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
          const mpegVer = (bytes[i + 1] >> 3) & 0x03; // 3 = MPEG-1
          const layer = (bytes[i + 1] >> 1) & 0x03; // 1 = Layer III
          const bitrateIdx = (bytes[i + 2] >> 4) & 0x0F;
          const sampleRateIdx = (bytes[i + 2] >> 2) & 0x03;

          const bitratesMpeg1Layer3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
          const sampleRatesMpeg1 = [44100, 48000, 32000, 0];

          if (mpegVer === 3 && layer === 1 && bitrateIdx > 0 && bitrateIdx < 15) {
            const kbps = bitratesMpeg1Layer3[bitrateIdx];
            bitrate = kbps * 1000;
            sampleRate = sampleRatesMpeg1[sampleRateIdx] || 44100;
            if (bitrate > 0) {
              duration = (file.size * 8) / bitrate;
            }
            break;
          }
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Secondary probe: HTML5 Media Element for exact duration and visual specs
  let width: number | undefined;
  let height: number | undefined;

  try {
    const mediaInfo = await probeViaMediaElement(file, isVideo);
    if (mediaInfo.duration && !isNaN(mediaInfo.duration) && isFinite(mediaInfo.duration)) {
      duration = mediaInfo.duration;
    }
    width = mediaInfo.width;
    height = mediaInfo.height;
  } catch {
    // If media element fails, maintain estimated duration
  }

  // Calculate bitrate if duration is known and bitrate not set
  if (duration > 0 && bitrate === 0) {
    bitrate = Math.round((file.size * 8) / duration);
  }

  return {
    filename: file.name,
    filesize: file.size,
    format,
    type: mediaType,
    duration: Math.max(0, duration),
    bitrate: bitrate > 0 ? bitrate : 128000,
    width,
    height,
    sampleRate,
    channels,
    hasVideo: isVideo,
    hasAudio: true,
    keyframes,
    rawMimeType: file.type || (isVideo ? 'video/mp4' : 'audio/mpeg')
  };
}

function probeViaMediaElement(file: File, isVideo: boolean): Promise<{ duration: number; width?: number; height?: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = isVideo ? document.createElement('video') : document.createElement('audio');

    element.preload = 'metadata';
    element.muted = true;

    const cleanup = () => {
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout probing media metadata'));
    }, 4000);

    element.onloadedmetadata = () => {
      clearTimeout(timer);
      const res: { duration: number; width?: number; height?: number } = {
        duration: element.duration
      };
      if (isVideo && element instanceof HTMLVideoElement) {
        res.width = element.videoWidth;
        res.height = element.videoHeight;
      }
      cleanup();
      resolve(res);
    };

    element.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('Error loading media element metadata'));
    };

    element.src = url;
  });
}
