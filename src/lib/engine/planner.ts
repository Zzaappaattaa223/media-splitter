import { MediaMetadata, SplitConfig, SegmentPlan, SegmentInfo } from '../types';

export function createSegmentPlan(metadata: MediaMetadata, config: SplitConfig): SegmentPlan {
  const totalDuration = metadata.duration;
  const totalBytes = metadata.filesize;
  const segments: SegmentInfo[] = [];

  if (totalDuration <= 0) {
    throw new Error('No se pudo determinar la duración del archivo multimedia.');
  }

  const baseName = metadata.filename.substring(0, metadata.filename.lastIndexOf('.')) || metadata.filename;
  const ext = metadata.filename.split('.').pop() || (metadata.hasVideo ? 'mp4' : 'mp3');

  let chunkDuration = 0;

  if (config.mode === 'duration') {
    chunkDuration = config.durationSeconds || 60;
  } else if (config.mode === 'parts') {
    const parts = Math.max(1, config.numParts || 2);
    chunkDuration = totalDuration / parts;
  } else if (config.mode === 'size') {
    const targetSize = config.targetSizeBytes || 50 * 1024 * 1024; // default 50 MB
    // Heuristic: apply tolerance discount (e.g. 5%) to avoid VBR peaks overshooting target size
    const toleranceFactor = 1 - (config.tolerancePercent / 100);
    const safeTargetSize = targetSize * Math.max(0.8, toleranceFactor);

    const averageBytesPerSec = totalBytes / totalDuration;
    chunkDuration = safeTargetSize / averageBytesPerSec;
  }

  if (chunkDuration <= 0) {
    chunkDuration = totalDuration;
  }

  let currentTime = 0;
  let partIndex = 1;

  while (currentTime < totalDuration) {
    let nextTime = currentTime + chunkDuration;

    // Fast Mode Keyframe Snapping:
    // If keyframes are available and precision is 'fast', snap to nearest keyframe
    if (config.precision === 'fast' && metadata.keyframes && metadata.keyframes.length > 0) {
      const candidateKeyframe = findClosestKeyframe(metadata.keyframes, nextTime);
      if (candidateKeyframe && candidateKeyframe.timestamp > currentTime && candidateKeyframe.timestamp < totalDuration) {
        nextTime = candidateKeyframe.timestamp;
      }
    }

    if (nextTime > totalDuration || (totalDuration - nextTime) < 1.0) {
      nextTime = totalDuration;
    }

    const duration = nextTime - currentTime;
    const estFraction = duration / totalDuration;
    const estimatedBytes = Math.round(totalBytes * estFraction);

    const padDigits = 3;
    const indexStr = String(partIndex).padStart(padDigits, '0');
    const partFilename = `${baseName}_part${indexStr}.${ext}`;

    segments.push({
      index: partIndex,
      filename: partFilename,
      startTime: currentTime,
      endTime: nextTime,
      duration,
      estimatedBytes
    });

    currentTime = nextTime;
    partIndex++;

    if (currentTime >= totalDuration) break;
  }

  return {
    totalSegments: segments.length,
    estimatedSegmentSize: segments.length > 0 ? Math.round(totalBytes / segments.length) : totalBytes,
    segments,
    precision: config.precision
  };
}

function findClosestKeyframe(keyframes: Array<{ timestamp: number }>, targetTime: number): { timestamp: number } | null {
  if (keyframes.length === 0) return null;
  let closest = keyframes[0];
  let minDiff = Math.abs(closest.timestamp - targetTime);

  for (const kf of keyframes) {
    const diff = Math.abs(kf.timestamp - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = kf;
    }
  }

  // Only snap if keyframe is within 3 seconds of target cut point
  if (minDiff <= 3.0) {
    return closest;
  }
  return null;
}
